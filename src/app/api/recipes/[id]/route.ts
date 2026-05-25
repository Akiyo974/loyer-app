import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveHouseholdId } from "@/lib/active-household";

export const runtime = "nodejs";

const PatchSchema = z.object({
  notes: z.string().max(2000).nullable().optional(),
});

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const householdId = await getActiveHouseholdId(session.user.id);
  if (!householdId) {
    return NextResponse.json({ error: "Foyer introuvable" }, { status: 400 });
  }

  const { id } = await params;

  await prisma.reelRecipe.deleteMany({
    where: { id, householdId },
  });

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const householdId = await getActiveHouseholdId(session.user.id);
  if (!householdId) {
    return NextResponse.json({ error: "Foyer introuvable" }, { status: 400 });
  }

  const body = PatchSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const { id } = await params;

  const updated = await prisma.reelRecipe.updateMany({
    where: { id, householdId },
    data: { lastNotes: body.data.notes ?? null },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Recette introuvable" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
