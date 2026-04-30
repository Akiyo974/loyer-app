"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, UserPlus } from "lucide-react";

interface InviteSectionProps {
  householdId: string;
}

export function InviteSection({ householdId }: InviteSectionProps) {
  const [copied, setCopied] = useState(false);

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/register?invite=${householdId}`
      : `/register?invite=${householdId}`;

  function handleCopy() {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-5 w-5 text-primary" />
          Inviter votre partenaire
        </CardTitle>
        <CardDescription>
          Partagez ce lien avec votre partenaire pour qu&apos;il/elle rejoigne le foyer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            readOnly
            value={inviteUrl}
            className="font-mono text-xs"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Code foyer : <code className="bg-gray-100 px-1 rounded">{householdId}</code>
        </p>
      </CardContent>
    </Card>
  );
}
