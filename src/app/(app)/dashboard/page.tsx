import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMonthData } from "@/actions/month-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency, formatPercent } from "@/lib/calc";
import { currentMonthSlug, formatMonthLabel, prevMonthSlug, nextMonthSlug } from "@/lib/utils";
import { ArrowLeft, ArrowRight, TrendingUp, Wallet, PiggyBank, AlertTriangle } from "lucide-react";
import { MonthSelectorButtons } from "@/components/dashboard/month-selector-buttons";

interface DashboardPageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const slug = params.month ?? currentMonthSlug();

  let monthData;
  try {
    monthData = await getMonthData(slug);
  } catch {
    redirect("/dashboard");
  }

  const { year, month, totalExpenses, totalRevenues, contributions, warning } = monthData;
  const monthLabel = formatMonthLabel(year, month);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <MonthSelectorButtons currentSlug={slug} />
          <Button asChild size="sm">
            <Link href={`/month/${slug}`}>Détail du mois →</Link>
          </Button>
        </div>
      </div>

      {/* Warning */}
      {warning && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{warning}</AlertDescription>
        </Alert>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Total dépenses foyer
            </CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totalExpenses)}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Revenus nets combinés
            </CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totalRevenues)}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <PiggyBank className="h-4 w-4" />
              Taux d&apos;effort foyer
            </CardDescription>
            <CardTitle className="text-2xl">
              {totalRevenues > 0
                ? formatPercent(totalExpenses / totalRevenues)
                : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Contributions par membre */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {contributions.map((c) => {
          const balance = c.paymentBalance;
          const balancePositive = balance >= 0;

          return (
            <Card key={c.userId} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{c.displayName}</CardTitle>
                  <Badge variant={balancePositive ? "success" : "warning"}>
                    {balancePositive
                      ? `+${formatCurrency(balance)} (trop payé)`
                      : `${formatCurrency(balance)} (reste à payer)`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Revenu net mensuel</span>
                    <span className="font-medium">{formatCurrency(c.netMonthlyIncome)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Part des dépenses</span>
                    <span className="font-medium">{formatPercent(c.share)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Contribution attendue</span>
                    <span className="font-medium text-primary">{formatCurrency(c.expectedContribution)}</span>
                  </div>
                  {/* Barre de progression */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Déposé : {formatCurrency(c.totalDeposited)}</span>
                      <span>Attendu : {formatCurrency(c.expectedContribution)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          balancePositive ? "bg-green-500" : "bg-orange-400"
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            c.expectedContribution > 0
                              ? (c.totalDeposited / c.expectedContribution) * 100
                              : 0
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2 mt-2">
                    <span className="text-muted-foreground">Reste après contribution</span>
                    <span className="font-semibold">{formatCurrency(c.remainingAfterContribution)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href={`/month/${slug}?tab=paychecks`}>Saisir une paie</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/month/${slug}?tab=expenses`}>Ajouter une dépense</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/month/${slug}?tab=deposits`}>Enregistrer un dépôt</Link>
        </Button>
      </div>
    </div>
  );
}
