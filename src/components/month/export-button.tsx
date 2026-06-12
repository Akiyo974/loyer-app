"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportButtonProps {
  slug: string;
}

export function ExportButton({ slug }: ExportButtonProps) {
  const [loading, setLoading] = useState<"pdf" | "csv" | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col items-end gap-1">
      {error && (
        <p className="text-xs text-red-500 max-w-xs text-right font-mono">{error}</p>
      )}
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading !== null}>
          <Download className="h-4 w-4 mr-2" />
          {loading ? "Export..." : "Exporter"}
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
      </DropdownMenuContent>
    </DropdownMenu>
    </div>
  );
}
