import { createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { chromium } from "playwright";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getActiveHouseholdId } from "@/lib/active-household";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const RequestSchema = z.object({
  reelUrl: z.string().url().refine((value) => value.includes("instagram.com/reel/"), {
    message: "Lien Reel Instagram invalide",
  }),
  notes: z.string().max(2000).optional().default(""),
});

const RecipeSchema = {
  name: "reel_recipe",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "title",
      "description",
      "servings",
      "prepTime",
      "cookTime",
      "ingredients",
      "steps",
      "tips",
      "source",
    ],
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      servings: { type: "string" },
      prepTime: { type: "string" },
      cookTime: { type: "string" },
      ingredients: {
        type: "array",
        items: { type: "string" },
      },
      steps: {
        type: "array",
        items: { type: "string" },
      },
      tips: {
        type: "array",
        items: { type: "string" },
      },
      source: {
        type: "object",
        additionalProperties: false,
        required: ["reelUrl", "notes"],
        properties: {
          reelUrl: { type: "string" },
          notes: { type: "string" },
        },
      },
    },
  },
  strict: true,
} as const;

async function captureReelPreview(reelUrl: string) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1080, height: 1920 } });
    const page = await context.newPage();

    await page.goto(reelUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => undefined);

    const metadata = await page.evaluate(() => {
      const getMeta = (selector: string) => document.querySelector(selector)?.getAttribute("content")?.trim() ?? "";
      return {
        pageTitle: document.title,
        ogTitle: getMeta('meta[property="og:title"]'),
        ogDescription: getMeta('meta[property="og:description"]'),
      };
    });

    const hash = createHash("sha1").update(`${reelUrl}-${Date.now()}`).digest("hex").slice(0, 16);
    const fileName = `${hash}.jpg`;
    // Vercel : filesystem read-only sauf /tmp. En local, on écrit dans public/covers.
    const isVercel = process.env.VERCEL === "1";
    const coversDir = isVercel
      ? path.join("/tmp", "covers")
      : path.join(process.cwd(), "public", "covers");
    await mkdir(coversDir, { recursive: true });

    const shotPath = path.join(coversDir, fileName);

    const video = page.locator("video").first();
    if (await video.count()) {
      await video.screenshot({ path: shotPath, quality: 75, timeout: 10000 }).catch(async () => {
        await page.screenshot({ path: shotPath, quality: 70, fullPage: false });
      });
    } else {
      await page.screenshot({ path: shotPath, quality: 70, fullPage: false });
    }

    await context.close();

    return {
      metadata,
      thumbnailUrl: `/covers/${fileName}`,
      screenshotPath: shotPath,
    };
  } finally {
    await browser.close();
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const householdId = await getActiveHouseholdId(session.user.id);
  if (!householdId) {
    return NextResponse.json({ error: "Foyer introuvable" }, { status: 400 });
  }

  const payload = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message ?? "Requete invalide" }, { status: 400 });
  }

  const { reelUrl, notes } = payload.data;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY manquant" }, { status: 500 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let thumbnailUrl: string | null = null;
  let metadata: { pageTitle?: string; ogTitle?: string; ogDescription?: string } = {};
  let screenshotBase64 = "";

  try {
    const capture = await captureReelPreview(reelUrl);
    thumbnailUrl = capture.thumbnailUrl;
    metadata = capture.metadata;

    const imageBytes = await readFile(capture.screenshotPath);
    screenshotBase64 = Buffer.from(imageBytes).toString("base64");
  } catch {
    // L'extraction Playwright peut échouer (login Instagram / anti-bot). On continue avec les métadonnées minimales.
  }

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      response_format: {
        type: "json_schema",
        json_schema: RecipeSchema,
      },
      messages: [
        {
          role: "system",
          content:
            "Tu es un assistant culinaire. Reponds uniquement avec un JSON valide conforme au schema, sans texte additionnel.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "Reconstitue la recette la plus plausible a partir des elements Reel.",
                `Lien Reel: ${reelUrl}`,
                `Notes utilisateur: ${notes || "(aucune)"}`,
                `Titre page: ${metadata.pageTitle || ""}`,
                `OG title: ${metadata.ogTitle || ""}`,
                `OG description: ${metadata.ogDescription || ""}`,
                "Si des infos manquent, reste prudent et explicite dans les etapes ou astuces.",
              ].join("\n"),
            },
            ...(screenshotBase64
              ? [
                  {
                    type: "image_url" as const,
                    image_url: { url: `data:image/jpeg;base64,${screenshotBase64}` },
                  },
                ]
              : []),
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error("Reponse vide du modele");
    }

    const parsedRecipe = JSON.parse(raw);

    const saved = await prisma.reelRecipe.upsert({
      where: { householdId_reelUrl: { householdId, reelUrl } },
      create: {
        householdId,
        createdById: session.user.id,
        reelUrl,
        lastNotes: notes || null,
        recipeTitle: parsedRecipe.title,
        recipeJson: parsedRecipe,
        thumbnailPath: thumbnailUrl,
        lastStatus: "success",
        hitCount: 1,
      },
      update: {
        lastNotes: notes || null,
        recipeTitle: parsedRecipe.title,
        recipeJson: parsedRecipe,
        thumbnailPath: thumbnailUrl,
        lastStatus: "success",
        hitCount: { increment: 1 },
      },
      select: {
        id: true,
        reelUrl: true,
        recipeTitle: true,
        recipeJson: true,
        thumbnailPath: true,
        hitCount: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      id: saved.id,
      reelUrl: saved.reelUrl,
      recipeTitle: saved.recipeTitle,
      recipe: saved.recipeJson,
      thumbnailUrl: saved.thumbnailPath,
      hitCount: saved.hitCount,
      updatedAt: saved.updatedAt,
    });
  } catch (error) {
    await prisma.reelRecipe.upsert({
      where: { householdId_reelUrl: { householdId, reelUrl } },
      create: {
        householdId,
        createdById: session.user.id,
        reelUrl,
        lastNotes: notes || null,
        thumbnailPath: thumbnailUrl,
        lastStatus: "error",
        hitCount: 1,
      },
      update: {
        lastNotes: notes || null,
        thumbnailPath: thumbnailUrl,
        lastStatus: "error",
        hitCount: { increment: 1 },
      },
    });

    const message = error instanceof Error ? error.message : "Echec generation recette";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
