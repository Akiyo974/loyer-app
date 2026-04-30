"use client";

import { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { registerUser } from "@/actions/auth-actions";
import { Home, UserPlus } from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("invite") ?? undefined;

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    setError(null);
    startTransition(async () => {
      const result = await registerUser({
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        confirmPassword: formData.get("confirmPassword") as string,
        householdName: inviteCode ? undefined : (formData.get("householdName") as string),
        inviteCode,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      // Auto-login après inscription
      const loginResult = await signIn("credentials", {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        redirect: false,
      });

      if (loginResult?.error) {
        setError("Compte créé, mais connexion automatique impossible. Connectez-vous manuellement.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    });
  }

  return (
    <Card className="shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-2">
          <div className="p-3 bg-primary/10 rounded-full">
            {inviteCode ? (
              <UserPlus className="h-8 w-8 text-primary" />
            ) : (
              <Home className="h-8 w-8 text-primary" />
            )}
          </div>
        </div>
        <CardTitle className="text-2xl">
          {inviteCode ? "Rejoindre le foyer" : "Créer votre foyer"}
        </CardTitle>
        <CardDescription>
          {inviteCode
            ? "Complétez votre profil pour rejoindre le foyer"
            : "Créez votre compte et votre foyer partagé"}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Votre prénom</Label>
            <Input id="name" name="name" placeholder="Marie" required minLength={2} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="marie@example.com"
              required
              autoComplete="email"
            />
          </div>

          {!inviteCode && (
            <div className="space-y-2">
              <Label htmlFor="householdName">Nom du foyer</Label>
              <Input
                id="householdName"
                name="householdName"
                placeholder="Notre foyer"
                defaultValue="Notre foyer"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Min. 8 caractères"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Création…" : inviteCode ? "Rejoindre le foyer" : "Créer le foyer"}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Se connecter
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8">Chargement…</div>}>
      <RegisterForm />
    </Suspense>
  );
}
