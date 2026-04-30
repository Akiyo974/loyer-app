"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Home } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    setError(null);
    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email ou mot de passe incorrect.");
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
            <Home className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl">Connexion au Foyer</CardTitle>
        <CardDescription>
          Entrez vos identifiants pour accéder à votre espace
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
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Connexion…" : "Se connecter"}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Pas encore de compte ?{" "}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Créer un foyer
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
