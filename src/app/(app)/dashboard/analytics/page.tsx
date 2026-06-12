import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  getAnalyticsData,
  getCategoryBudgets,
} from "@/actions/analytics-actions";
import { AnalyticsCharts } from "@/components/analytics/analytics-charts";
import { BudgetManager } from "@/components/analytics/budget-manager";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/calc";

export const metadata = {
  title: "Analytics & Tendances - Loyer",
};

async function AnalyticsContent() {
  const [analyticsData, budgets] = await Promise.all([
    getAnalyticsData(),
    getCategoryBudgets(),
  ]);

  const budgetMap = budgets.reduce(
    (acc, b) => {
      acc[b.category] = b.monthlyBudget;
      return acc;
    },
    {} as Record<string, number>
  );

  const currentMonthSpending: Record<string, number> = {};

  return (
    <main className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au tableau de bord
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            Tendances & Analytics
          </h1>
          <p className="text-gray-600 mt-2">
            Analyse détaillée sur 12 mois
          </p>
        </div>
      </div>

      {/* Stats résumé */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-600 mb-1">Dépenses moyennes</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(analyticsData.averageMonthlyExpense)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600 mb-1">Revenus moyens</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(analyticsData.averageMonthlyRevenue)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600 mb-1">Taux d&apos;effort moyen</p>
          <p className="text-2xl font-bold text-blue-600">
            {analyticsData.averageMonthlyRevenue > 0
              ? (
                  (analyticsData.averageMonthlyExpense /
                    analyticsData.averageMonthlyRevenue) *
                  100
                ).toFixed(1)
              : "0.0"}
            %
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600 mb-1">Dernier mois</p>
          <p className="text-2xl font-bold text-gray-900">
            {analyticsData.history[analyticsData.history.length - 1]?.month ||
              "N/A"}
          </p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="trends" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="trends">Tendances</TabsTrigger>
          <TabsTrigger value="quarterly">Trimestres</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="predictions">Prévisions</TabsTrigger>
        </TabsList>

        {/* Tous les graphiques */}
        <TabsContent value="trends" className="space-y-6">
          <AnalyticsCharts
            history={analyticsData.history}
            quarterlyBreakdown={analyticsData.quarterlyBreakdown}
            alerts={analyticsData.alerts}
            predictions={analyticsData.predictions}
          />
        </TabsContent>

        <TabsContent value="quarterly">
          <AnalyticsCharts
            history={analyticsData.history}
            quarterlyBreakdown={analyticsData.quarterlyBreakdown}
            alerts={analyticsData.alerts}
            predictions={analyticsData.predictions}
          />
        </TabsContent>

        {/* Budgets */}
        <TabsContent value="budgets">
          <BudgetManager
            budgets={budgetMap}
            currentMonthSpending={currentMonthSpending}
          />
        </TabsContent>

        {/* Prévisions */}
        <TabsContent value="predictions">
          <AnalyticsCharts
            history={analyticsData.history}
            quarterlyBreakdown={analyticsData.quarterlyBreakdown}
            alerts={analyticsData.alerts}
            predictions={analyticsData.predictions}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-600">Chargement des analytics...</p>
        </div>
      }
    >
      <AnalyticsContent />
    </Suspense>
  );
}
