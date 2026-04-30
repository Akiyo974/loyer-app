import React from "react";
import { formatCurrency, formatPercent } from "@/lib/calc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MonthData } from "@/lib/types";
import { TrendingUp, Wallet, ArrowDownCircle, ArrowUpCircle, PiggyBank } from "lucide-react";

interface SummaryCardProps {
  monthData: MonthData;
}

export function SummaryCard({ monthData }: SummaryCardProps) {
  const { totalExpenses, totalRevenues, contributions } = monthData;
  const taux =
    totalRevenues > 0 ? formatPercent(totalExpenses / totalRevenues) : "—";

  return (
    <div className="space-y-6">
      {/* Totaux */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Wallet className="h-4 w-4" /> Dépenses foyer
            </CardDescription>
            <CardTitle className="text-2xl text-red-600">
              {formatCurrency(totalExpenses)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" /> Revenus nets
            </CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {formatCurrency(totalRevenues)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Taux d&apos;effort</CardDescription>
            <CardTitle className="text-2xl">{taux}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Détail par membre */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {contributions.map((c) => {
          const balance = c.paymentBalance;
          const isCredit = balance >= 0;

          return (
            <Card key={c.userId} className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{c.displayName}</CardTitle>
                  <Badge variant={isCredit ? "success" : "warning"} className="text-xs">
                    {isCredit ? "Soldé ✓" : "À compléter"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Revenu net mensuel" value={formatCurrency(c.netMonthlyIncome)} />
                <Row
                  label="Part des dépenses"
                  value={formatPercent(c.share)}
                  subLabel="au prorata des revenus"
                />
                <div className="border-t pt-2 mt-2">
                  <Row
                    label="Contribution attendue"
                    value={formatCurrency(c.expectedContribution)}
                    emphasis
                  />
                  <Row label="Total déposé" value={formatCurrency(c.totalDeposited)} />
                  <Row
                    label="Solde paiement"
                    value={`${isCredit ? "+" : ""}${formatCurrency(balance)}`}
                    color={isCredit ? "text-green-600" : "text-orange-500"}
                    emphasis
                  />
                </div>
                <div className="border-t pt-2 mt-2">
                  <Row
                    label="Reste après contribution"
                    value={formatCurrency(c.remainingAfterContribution)}
                    subLabel="revenu - contribution attendue"
                  />
                  {c.savingsGoal > 0 && (
                    <>
                      <Row
                        label="Objectif épargne"
                        value={`- ${formatCurrency(c.savingsGoal)}`}
                        color="text-blue-600"
                        icon={<PiggyBank className="h-3.5 w-3.5 text-blue-500" />}
                      />
                      <Row
                        label="Reste libre"
                        value={formatCurrency(c.remainingAfterSavings)}
                        subLabel="après contribution + épargne"
                        emphasis
                        color={
                          c.remainingAfterSavings >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  subLabel,
  emphasis = false,
  color,
  icon,
}: {
  label: string;
  value: string;
  subLabel?: string;
  emphasis?: boolean;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-start">
      <div>
        <span className={`flex items-center gap-1 ${emphasis ? "font-medium" : "text-muted-foreground"}`}>
          {icon}
          {label}
        </span>
        {subLabel && <p className="text-xs text-muted-foreground">{subLabel}</p>}
      </div>
      <span className={`font-${emphasis ? "semibold" : "normal"} ${color ?? ""}`}>{value}</span>
    </div>
  );
}
