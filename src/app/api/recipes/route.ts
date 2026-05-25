import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveHouseholdId } from "@/lib/active-household";

export const runtime = "nodejs";

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const householdId = await getActiveHouseholdId(session.user.id);
  if (!householdId) {
    return NextResponse.json({ error: "Foyer introuvable" }, { status: 400 });
  }

  const query = QuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!query.success) {
    return NextResponse.json({ error: "Parametres invalides" }, { status: 400 });
  }

  const records = await prisma.reelRecipe.findMany({
    where: { householdId },
    orderBy: { updatedAt: "desc" },
    take: query.data.limit,
    select: {
      id: true,
      reelUrl: true,
      lastNotes: true,
      lastStatus: true,
      hitCount: true,
      recipeTitle: true,
      recipeJson: true,
      thumbnailPath: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    items: records.map((item) => ({
      id: item.id,
      reelUrl: item.reelUrl,
      notes: item.lastNotes,
      status: item.lastStatus,
      hitCount: item.hitCount,
      recipeTitle: item.recipeTitle,
      thumbnailUrl: item.thumbnailPath,
      recipe: item.recipeJson,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
  });
}
