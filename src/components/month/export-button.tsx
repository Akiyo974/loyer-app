"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet, Mail, CheckCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportButtonProps {
  slug: string;
}

export function ExportButton({ slug }: ExportButtonProps) {
  const [loading, setLoading] = useState<"pdf" | "csv" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  async function handleExport(format: "pdf" | "csv") {
    setLoading(format);
    setError(null);
    try {
      const res = await fetch(`/api/month/${slug}/export?format=${format}`);
      if (!res.ok) {
        const text = await res.text();
        setError(text || `Erreur ${res.status}`);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `foyer-${slug}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(null);
    }
  }

  async function handleEmail() {
    setLoading("email");
    setError(null);
    setEmailSent(false);
    try {
      const res = await fetch("/api/reports/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || `Erreur ${res.status}`);
        return;
      }
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {error && (
        <p className="text-xs text-red-500 max-w-xs text-right font-mono">{error}</p>
      )}
      {emailSent && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" /> Rapport envoyé par email !
        </p>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={loading !== null}>
            <Download className="h-4 w-4 mr-2" />
            {loading ? "En cours..." : "Exporter"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => handleExport("pdf")}
            disabled={loading !== null}
            className="cursor-pointer"
          >
            <FileText className="h-4 w-4 mr-2 text-red-500" />
            Télécharger en PDF
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleExport("csv")}
            disabled={loading !== null}
            className="cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
            Télécharger en CSV
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleEmail}
            disabled={loading !== null}
            className="cursor-pointer"
          >
            <Mail className="h-4 w-4 mr-2 text-blue-500" />
            Envoyer par email
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
