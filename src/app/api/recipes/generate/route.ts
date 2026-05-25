import { NextResponse } from "next/server";
import OpenAI from "openai";
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

function extractMeta(html: string, property: string): string {
  const m =
    html.match(new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i")) ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i"));
  return m?.[1]?.trim().replace(/&amp;/g, "&").replace(/&#039;/g, "'") ?? "";
}

async function scrapeReelMetadata(reelUrl: string): Promise<{
  ogTitle: string;
  ogDescription: string;
  thumbnailPath: string | null;
}> {
  const res = await fetch(reelUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
      "Cache-Control": "no-cache",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const html = await res.text();
  return {
    ogTitle: extractMeta(html, "og:title"),
    ogDescription: extractMeta(html, "og:description"),
    thumbnailPath: extractMeta(html, "og:image") || null,
  };
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
  let ogTitle = "";
  let ogDescription = "";

  try {
    const meta = await scrapeReelMetadata(reelUrl);
    thumbnailUrl = meta.thumbnailPath;
    ogTitle = meta.ogTitle;
    ogDescription = meta.ogDescription;
  } catch {
    // Instagram peut bloquer le scraping. On continue avec les notes utilisateur.
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
                "Reconstitue la recette a partir des informations ci-dessous.",
                "",
                "IMPORTANT: Les notes de l'utilisateur sont la SOURCE PRINCIPALE.",
                "Base-toi UNIQUEMENT sur ce que l'utilisateur a decrit. Ne devine pas un plat different.",
                "Si les notes mentionnent des pates, fais une recette de pates.",
                "Si elles mentionnent du poulet, fais une recette de poulet. Etc.",
                "",
                `Notes utilisateur: ${notes || "(aucune)"}`,
                `Lien Reel: ${reelUrl}`,
                `OG title (caption Instagram): ${ogTitle}`,
                `OG description: ${ogDescription}`,
                "",
                "Priorite: 1) Notes utilisateur 2) OG title/description 3) déduis depuis l'URL.",
                "Si des quantites ou etapes manquent, propose des valeurs plausibles et signale-le dans les astuces.",
              ].join("\n"),
            },
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
    const message = error instanceof Error ? error.message : "Echec generation recette";
    try {
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
    } catch {
      // La table n'existe peut-être pas encore (migration en attente)
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
