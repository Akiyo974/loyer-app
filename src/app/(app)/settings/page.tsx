import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InviteSection } from "@/components/settings/invite-section";
import { HouseholdNameForm } from "@/components/settings/household-name-form";
import { ProfileForm } from "@/components/settings/profile-form";
import { BudgetModeForm } from "@/components/settings/budget-mode-form";
import { formatCurrency } from "@/lib/calc";
import { User, Home, Users, PiggyBank, Wallet } from "lucide-react";
import { getActiveHouseholdId } from "@/lib/active-household";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const householdId = await getActiveHouseholdId(userId);
  if (!householdId) redirect("/onboarding");

  const member = await prisma.householdMember.findFirst({
    where: { householdId, userId },
    include: {
      household: {
        include: {
          members: {
            include: { user: { select: { email: true, name: true } } },
          },
        },
      },
    },
  });

  if (!member) redirect("/onboarding");

  const { household } = member;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">Gérez votre foyer et vos préférences</p>
      </div>

      {/* Foyer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Foyer
          </CardTitle>
          <CardDescription>Informations sur votre foyer partagé</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Nom du foyer</span>
            <HouseholdNameForm currentName={household.name} />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">ID du foyer</span>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
              {household.id}
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Membres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membres ({household.members.length}/2)
          </CardTitle>
          <CardDescription>
            Les deux membres du foyer dont les revenus entrent dans le calcul.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {household.members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{m.displayName}</p>
                  <p className="text-xs text-muted-foreground">{m.user.email}</p>
                  {(m as any).savingsGoal > 0 && (
                    <p className="text-xs text-blue-600 flex items-center gap-1">
                      <PiggyBank className="h-3 w-3" />
                      Objectif : {formatCurrency((m as any).savingsGoal)} / mois
                    </p>
                  )}
                </div>
              </div>
              <Badge variant={m.role === "ADMIN" ? "default" : "secondary"}>
                {m.role === "ADMIN" ? "Admin" : "Membre"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Invitation (si moins de 2 membres) */}
      {household.members.length < 2 && member.role === "ADMIN" && (
        <InviteSection householdId={household.id} />
      )}

      {/* Mon profil */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Mon profil
          </CardTitle>
          <CardDescription>Prénom, objectif d’épargne et sécurité</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="flex justify-between items-center pb-2 border-b">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm">{session.user.email}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b">
            <span className="text-sm text-muted-foreground">Rôle</span>
            <Badge variant={member.role === "ADMIN" ? "default" : "secondary"}>
              {member.role === "ADMIN" ? "Administrateur" : "Membre"}
            </Badge>
          </div>
          <div className="pt-2">
            <ProfileForm
              displayName={member.displayName}
              savingsGoal={member.savingsGoal ?? 0}
            />
          </div>
        </CardContent>
      </Card>

      {/* Mode de budgétisation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Mode de budgétisation
          </CardTitle>
          <CardDescription>
            Choisissez comment les revenus sont associés aux dépenses du foyer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BudgetModeForm currentMode={(household.budgetMode ?? "CURRENT") as "CURRENT" | "SHIFTED"} />
        </CardContent>
      </Card>
    </div>
  );
}
