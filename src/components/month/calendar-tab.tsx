"use client";

import { useState } from "react";
import type { MonthData, PaycheckRow, DepositRow } from "@/lib/types";
import { formatCurrency } from "@/lib/calc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function buildGrid(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const offset = (firstDow + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

interface DayEvents {
  paychecks: PaycheckRow[];
  deposits: DepositRow[];
}

interface CalendarTabProps {
  monthData: MonthData;
}

export function CalendarTab({ monthData }: CalendarTabProps) {
  const { year, month, paychecks, deposits } = monthData;
  const [selected, setSelected] = useState<{ day: number; events: DayEvents } | null>(null);

  const grid = buildGrid(year, month);

  // Index events by day number
  const eventsByDay = new Map<number, DayEvents>();

  paychecks.forEach((p) => {
    const day = parseInt(p.date.split("-")[2], 10);
    if (!eventsByDay.has(day)) eventsByDay.set(day, { paychecks: [], deposits: [] });
    eventsByDay.get(day)!.paychecks.push(p);
  });

  deposits.forEach((d) => {
    const day = parseInt(d.date.split("-")[2], 10);
    if (!eventsByDay.has(day)) eventsByDay.set(day, { paychecks: [], deposits: [] });
    eventsByDay.get(day)!.deposits.push(d);
  });

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const todayDay = isCurrentMonth ? today.getDate() : -1;

  function handleDayClick(day: number | null) {
    if (!day) return;
    const events = eventsByDay.get(day) ?? { paychecks: [], deposits: [] };
    if (events.paychecks.length === 0 && events.deposits.length === 0) return;
    setSelected({ day, events });
  }

  const totalPaychecksNet = paychecks.reduce((s, p) => s + p.netAmount, 0);
  const totalDeposits = deposits.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="space-y-4">
      {/* Legend + totaux */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-green-500 inline-block" />
          <span>Paie — {formatCurrency(totalPaychecksNet)} nets</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-blue-500 inline-block" />
          <span>Dépôt — {formatCurrency(totalDeposits)}</span>
        </div>
      </div>

      <Card>
        <CardContent className="p-3">
          {/* En-têtes jours */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Cellules */}
          <div className="grid grid-cols-7 gap-0.5">
            {grid.map((day, idx) => {
              const events = day ? eventsByDay.get(day) : undefined;
              const hasEvents = !!(events && (events.paychecks.length > 0 || events.deposits.length > 0));
              const isToday = day === todayDay;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  disabled={!hasEvents}
                  className={[
                    "min-h-[3.5rem] rounded-md p-1 text-left flex flex-col gap-0.5 transition-colors",
                    !day ? "invisible" : "",
                    hasEvents ? "cursor-pointer hover:bg-accent" : "cursor-default",
                    isToday ? "ring-2 ring-primary ring-offset-1" : "",
                  ].join(" ")}
                >
                  {day && (
                    <>
                      <span className={`text-xs font-medium leading-none ${isToday ? "text-primary" : ""}`}>
                        {day}
                      </span>
                      <div className="flex flex-wrap gap-0.5">
                        {events?.paychecks.map((p) => (
                          <span
                            key={p.id}
                            className="h-2 w-2 rounded-full bg-green-500"
                            title={`Paie ${p.displayName} ${formatCurrency(p.netAmount)}`}
                          />
                        ))}
                        {events?.deposits.map((d) => (
                          <span
                            key={d.id}
                            className="h-2 w-2 rounded-full bg-blue-500"
                            title={`Dépôt ${d.displayName} ${formatCurrency(d.amount)}`}
                          />
                        ))}
                      </div>
                      {/* Montants compacts si espace */}
                      {events && (events.paychecks.length > 0 || events.deposits.length > 0) && (
                        <div className="flex flex-col gap-0">
                          {events.paychecks.slice(0, 2).map((p) => (
                            <span key={p.id} className="text-[9px] text-green-700 dark:text-green-400 leading-tight truncate">
                              +{formatCurrency(p.netAmount)}
                            </span>
                          ))}
                          {events.deposits.slice(0, 1).map((d) => (
                            <span key={d.id} className="text-[9px] text-blue-700 dark:text-blue-400 leading-tight truncate">
                              ↑{formatCurrency(d.amount)}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dialog détail du jour */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-sm">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {pad2(selected.day)} / {pad2(month)} / {year}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-1">
                {selected.events.paychecks.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paies</p>
                    {selected.events.paychecks.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
                        <div>
                          <p className="font-medium">{p.displayName}</p>
                          {p.vacationDeduction > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Brut {formatCurrency(p.grossAmount)} − {formatCurrency(p.vacationDeduction)} vac.
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-green-700 bg-green-50">
                          {formatCurrency(p.netAmount)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
                {selected.events.deposits.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dépôts</p>
                    {selected.events.deposits.map((d) => (
                      <div key={d.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
                        <p className="font-medium">{d.displayName}</p>
                        <Badge variant="secondary" className="text-blue-700 bg-blue-50">
                          {formatCurrency(d.amount)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
