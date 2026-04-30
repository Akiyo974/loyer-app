import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, UserPlus } from "lucide-react";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Si déjà dans un foyer, aller au dashboard
  const existing = await prisma.householdMember.findUnique({
    where: { userId: session.user.id },
  });
  if (existing) redirect("/dashboard");

  // Household ID pour invitation
  const allHouseholds = await prisma.household.findMany({
    include: { members: true },
    where: { members: { none: {} } },
    take: 5,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-primary/10 rounded-full">
              <Home className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Bienvenue, {session.user.name}!</h1>
          <p className="text-muted-foreground mt-1">
            Vous n&apos;êtes encore dans aucun foyer.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Créer un nouveau foyer</CardTitle>
            <CardDescription>
              Vous deviendrez l&apos;administrateur et pourrez ensuite inviter votre partenaire.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/register">
                <Home className="h-4 w-4 mr-2" />
                Créer un foyer
              </Link>
            </Button>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">ou</div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rejoindre un foyer existant</CardTitle>
            <CardDescription>
              Si votre partenaire a déjà créé un foyer, utilisez son code d&apos;invitation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/register?invite=CODE_ICI">
                <UserPlus className="h-4 w-4 mr-2" />
                Rejoindre avec un code
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
