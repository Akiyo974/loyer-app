import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/navbar";
import { QuickAddButton } from "@/components/layout/quick-add-button";
import { currentMonthSlug } from "@/lib/utils";
import { getActiveHouseholdId } from "@/lib/active-household";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  // Charger tous les foyers de l'utilisateur
  const memberships = await prisma.householdMember.findMany({
    where: { userId },
    include: { household: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) {
    redirect("/onboarding");
  }

  const activeHouseholdId = (await getActiveHouseholdId(userId)) ?? memberships[0].household.id;

  const households = memberships.map((m) => ({ id: m.household.id, name: m.household.name }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        userName={session.user.name ?? session.user.email ?? "Utilisateur"}
        households={households}
        activeHouseholdId={activeHouseholdId}
        currentMonthSlug={currentMonthSlug()}
      />
      <main className="container mx-auto px-4 py-8 max-w-6xl">{children}</main>
      <QuickAddButton defaultSlug={currentMonthSlug()} />
    </div>
  );
}
