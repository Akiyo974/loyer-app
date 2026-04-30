import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/navbar";
import { currentMonthSlug } from "@/lib/utils";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Vérifier appartenance à un foyer
  const member = await prisma.householdMember.findUnique({
    where: { userId: session.user.id },
    include: { household: true },
  });

  if (!member) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        userName={session.user.name ?? session.user.email ?? "Utilisateur"}
        householdName={member.household.name}
        householdId={member.household.id}
        currentMonthSlug={currentMonthSlug()}
      />
      <main className="container mx-auto px-4 py-8 max-w-6xl">{children}</main>
    </div>
  );
}
