import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getMonthData } from "@/actions/month-actions";
import { formatMonthLabel, prevMonthSlug, nextMonthSlug } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/lib/calc";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { PaychecksTab } from "@/components/month/paychecks-tab";
import { ExpensesTab } from "@/components/month/expenses-tab";
import { DepositsTab } from "@/components/month/deposits-tab";
import { SummaryCard } from "@/components/month/summary-card";

interface MonthPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function MonthPage({ params, searchParams }: MonthPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const activeTab = sp.tab ?? "summary";

  // Validate slug format
  if (!/^\d{4}-\d{2}$/.test(slug)) {
    notFound();
  }

  let monthData;
  try {
    monthData = await getMonthData(slug);
  } catch {
    redirect("/dashboard");
  }

  const { year, month, warning } = monthData;
  const monthLabel = formatMonthLabel(year, month);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight capitalize">{monthLabel}</h1>
          <p className="text-muted-foreground text-sm">Détail des revenus, dépenses et dépôts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild aria-label="Mois précédent">
            <Link href={`/month/${prevMonthSlug(slug)}`}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="icon" asChild aria-label="Mois suivant">
            <Link href={`/month/${nextMonthSlug(slug)}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>

      {warning && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{warning}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue={activeTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary">Résumé</TabsTrigger>
          <TabsTrigger value="paychecks">Paies</TabsTrigger>
          <TabsTrigger value="expenses">Dépenses</TabsTrigger>
          <TabsTrigger value="deposits">Dépôts</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <SummaryCard monthData={monthData} />
        </TabsContent>

        <TabsContent value="paychecks" className="mt-4">
          <PaychecksTab monthData={monthData} />
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <ExpensesTab monthData={monthData} />
        </TabsContent>

        <TabsContent value="deposits" className="mt-4">
          <DepositsTab monthData={monthData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
