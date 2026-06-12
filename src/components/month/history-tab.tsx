"use client";

import { useEffect, useState } from "react";
import { getAuditLogsForMonth } from "@/actions/audit-actions";
import type { AuditLogRow } from "@/actions/audit-actions";
import { Loader2, FilePlus2, FilePen, Trash2, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ACTION_LABELS: Record<string, string> = {
  CREATED: "créé",
  UPDATED: "modifié",
  DELETED: "supprimé",
};

const ENTITY_LABELS: Record<string, string> = {
  expense: "dépense",
  paycheck: "paie",
  deposit: "dépôt",
};

const ACTION_ICONS: Record<string, React.ElementType> = {
  CREATED: FilePlus2,
  UPDATED: FilePen,
  DELETED: Trash2,
};

const ACTION_COLORS: Record<string, string> = {
  CREATED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  UPDATED: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  DELETED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function formatRelative(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffH < 24) return `Il y a ${diffH}h`;
  if (diffD === 1) return "Hier";
  if (diffD < 7) return `Il y a ${diffD} jours`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

interface HistoryTabProps {
  monthSlug: string;
}

export function HistoryTab({ monthSlug }: HistoryTabProps) {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAuditLogsForMonth(monthSlug)
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [monthSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Chargement…
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-14 text-center space-y-2">
          <Clock className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="font-medium">Aucune modification enregistrée pour ce mois.</p>
          <p className="text-sm text-muted-foreground">
            Les créations, modifications et suppressions apparaîtront ici.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{logs.length} entrée{logs.length > 1 ? "s" : ""}</p>
      <div className="space-y-2">
        {logs.map((log) => {
          const Icon = ACTION_ICONS[log.action] ?? FilePen;
          return (
            <div
              key={log.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card text-sm"
            >
              <div className={`mt-0.5 p-1.5 rounded-md shrink-0 ${ACTION_COLORS[log.action]}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="leading-snug">
                  <span className="font-semibold">{log.userName}</span>
                  {" a "}
                  <span className="font-medium">{ACTION_LABELS[log.action] ?? log.action}</span>
                  {" "}
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    {ENTITY_LABELS[log.entityType] ?? log.entityType}
                  </Badge>
                  {" · "}
                  <span className="text-muted-foreground truncate">{log.label}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatRelative(new Date(log.createdAt))}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
