"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Home, ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createNewHousehold } from "@/actions/household-actions";

export default function NewHouseholdPage() {
  const [householdName, setHouseholdName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createNewHousehold(householdName, displayName);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push("/dashboard");
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-primary/10 rounded-full">
              <Home className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Créer un nouveau foyer</h1>
          <p className="text-muted-foreground mt-1">
            Vous serez administrateur de ce nouveau foyer.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nouveau foyer</CardTitle>
            <CardDescription>
              Donnez un nom à votre foyer, puis invitez votre partenaire depuis les paramètres.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="householdName">Nom du foyer</Label>
                <Input
                  id="householdName"
                  placeholder="Ex : Colocation Résidence Les Pins"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  required
                  minLength={2}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Mon prénom dans ce foyer</Label>
                <Input
                  id="displayName"
                  placeholder="Ex : Marie"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Laissez vide pour utiliser votre prénom de compte.
                </p>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Création…" : "Créer le foyer"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Retour au tableau de bord
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
