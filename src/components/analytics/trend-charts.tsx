import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { HistoryDataPoint, ExpenseAlert } from "@/actions/analytics-actions";
import { formatCurrency, formatPercent } from "@/lib/calc";

interface TrendChartsProps {
  history: HistoryDataPoint[];
}

export function TrendCharts({ history }: TrendChartsProps) {
  return (
    <div className="space-y-6">
      {/* Evolution dépenses/revenus */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Évolution sur 12 mois</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              style={{ fontSize: "12px" }}
            />
            <YAxis
              stroke="#6b7280"
              tickFormatter={(val) => `$${val / 1000}k`}
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
              formatter={(value: number) => formatCurrency(value)}
              labelStyle={{ color: "#1f2937" }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="totalExpenses"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              name="Dépenses"
            />
            <Line
              type="monotone"
              dataKey="totalRevenues"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              name="Revenus"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Taux d'effort */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Taux d&apos;effort mensuel</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              style={{ fontSize: "12px" }}
            />
            <YAxis
              stroke="#6b7280"
              tickFormatter={(val) => `${val}%`}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
              formatter={(value: number) => formatPercent(value / 100)}
              labelStyle={{ color: "#1f2937" }}
            />
            <Bar
              dataKey="effortRatio"
              fill="#f59e0b"
              name="Taux d'effort"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-sm text-gray-600 mt-4">
          Ratio dépenses / revenus. Idéalement &lt; 100%
        </p>
      </Card>
    </div>
  );
}

interface QuarterlyBreakdownProps {
  data: {
    quarter: string;
    totalExpenses: number;
    totalRevenues: number;
  }[];
}

export function QuarterlyBreakdown({ data }: QuarterlyBreakdownProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Résumé par trimestre</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="quarter"
            stroke="#6b7280"
            style={{ fontSize: "12px" }}
          />
          <YAxis
            stroke="#6b7280"
            tickFormatter={(val) => `$${val / 1000}k`}
            width={70}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
            }}
            formatter={(value: number) => formatCurrency(value)}
            labelStyle={{ color: "#1f2937" }}
          />
          <Legend />
          <Bar
            dataKey="totalExpenses"
            fill="#ef4444"
            name="Dépenses"
            radius={[8, 8, 0, 0]}
          />
          <Bar
            dataKey="totalRevenues"
            fill="#10b981"
            name="Revenus"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

interface AlertsListProps {
  alerts: ExpenseAlert[];
}

export function AlertsList({ alerts }: AlertsListProps) {
  if (alerts.length === 0) {
    return (
      <Card className="p-6 bg-green-50 border-green-200">
        <p className="text-sm text-green-700">✓ Aucune alerte ce mois-ci</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-orange-200 bg-orange-50">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-orange-600" />
        <h3 className="font-semibold text-orange-900">Alertes dépenses</h3>
      </div>
      <ul className="space-y-2">
        {alerts.map((alert, idx) => (
          <li key={idx} className="text-sm text-orange-800">
            <strong>{alert.category}</strong>: {alert.message} (moy:{" "}
            {formatCurrency(alert.average)} vs {formatCurrency(alert.current)})
          </li>
        ))}
      </ul>
    </Card>
  );
}

interface PredictionsChartProps {
  predictions: {
    month: string;
    projectedExpenses: number;
    projectedRevenues: number;
  }[];
  recent: HistoryDataPoint[];
}

export function PredictionsChart({
  predictions,
  recent,
}: PredictionsChartProps) {
  // Combine les 2 derniers mois réels + 3 prévisions
  const combined = [
    ...recent.slice(-2),
    ...predictions.map((p) => ({
      ...p,
      slug: p.month,
      date: p.month,
      effortRatio: 0,
      month: p.month,
      totalExpenses: p.projectedExpenses,
      totalRevenues: p.projectedRevenues,
    })),
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Prévisions 3 mois</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={combined}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            style={{ fontSize: "12px" }}
          />
          <YAxis
            stroke="#6b7280"
            tickFormatter={(val) => `$${val / 1000}k`}
            width={60}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
            }}
            formatter={(value: number) => formatCurrency(value)}
            labelStyle={{ color: "#1f2937" }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="totalExpenses"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            strokeDasharray="5 5"
            name="Dépenses (projetées)"
          />
          <Line
            type="monotone"
            dataKey="totalRevenues"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            strokeDasharray="5 5"
            name="Revenus (projetés)"
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-sm text-gray-600 mt-4">
        Projection linéaire basée sur les 3 derniers mois
      </p>
    </Card>
  );
}
