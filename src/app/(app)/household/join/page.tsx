"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, ArrowLeft } from "lucide-react";
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
import { joinExistingHousehold } from "@/actions/household-actions";

export default function JoinHouseholdPage() {
  const [inviteCode, setInviteCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await joinExistingHousehold(inviteCode, displayName);
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
              <UserPlus className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Rejoindre un foyer</h1>
          <p className="text-muted-foreground mt-1">
            Entrez le code d&apos;invitation partagé par l&apos;administrateur du foyer.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Code d&apos;invitation</CardTitle>
            <CardDescription>
              Le code se trouve dans Paramètres → Foyer → Inviter votre partenaire.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Code du foyer</Label>
                <Input
                  id="inviteCode"
                  placeholder="cldxyz1234abcd5678…"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required
                  className="font-mono"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Mon prénom dans ce foyer</Label>
                <Input
                  id="displayName"
                  placeholder="Ex : Jean"
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
                {isPending ? "Rejoindre…" : "Rejoindre le foyer"}
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
