"use client";

import dynamic from "next/dynamic";
import { HistoryDataPoint, ExpenseAlert } from "@/actions/analytics-actions";

// Dynamic imports côté client
const TrendCharts = dynamic(
  () => import("./trend-charts").then(m => ({ default: m.TrendCharts })),
  { loading: () => <div className="p-4">Chargement des graphiques...</div> }
);

const QuarterlyBreakdown = dynamic(
  () => import("./trend-charts").then(m => ({ default: m.QuarterlyBreakdown })),
  { loading: () => <div className="p-4">Chargement...</div> }
);

const AlertsList = dynamic(
  () => import("./trend-charts").then(m => ({ default: m.AlertsList })),
  { loading: () => <div className="p-4">Chargement...</div> }
);

const PredictionsChart = dynamic(
  () => import("./trend-charts").then(m => ({ default: m.PredictionsChart })),
  { loading: () => <div className="p-4">Chargement...</div> }
);

interface AnalyticsChartsProps {
  history: HistoryDataPoint[];
  quarterlyBreakdown: {
    quarter: string;
    totalExpenses: number;
    totalRevenues: number;
  }[];
  alerts: ExpenseAlert[];
  predictions: {
    month: string;
    projectedExpenses: number;
    projectedRevenues: number;
  }[];
}

export function AnalyticsCharts({
  history,
  quarterlyBreakdown,
  alerts,
  predictions,
}: AnalyticsChartsProps) {
  return (
    <>
      <TrendCharts history={history} />
      <AlertsList alerts={alerts} />
      <QuarterlyBreakdown data={quarterlyBreakdown} />
      <PredictionsChart predictions={predictions} recent={history} />
    </>
  );
}
