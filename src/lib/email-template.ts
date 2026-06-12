import type { MonthData } from "@/lib/types";

const MONTH_NAMES = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

function fmt(n: number) {
  return n.toLocaleString("fr-CA", { style: "currency", currency: "CAD" });
}

export function buildReportEmailHtml(data: MonthData, householdName: string): string {
  const title = `${MONTH_NAMES[data.month - 1]} ${data.year}`;
  const effort = data.totalRevenues > 0
    ? ((data.totalExpenses / data.totalRevenues) * 100).toFixed(1)
    : "0.0";
  const solde = data.totalRevenues - data.totalExpenses;
  const soldeColor = solde >= 0 ? "#16a34a" : "#dc2626";

  const contribRows = data.contributions.map((c) => {
    const balColor = c.paymentBalance >= 0 ? "#16a34a" : "#dc2626";
    const balSign = c.paymentBalance >= 0 ? "+" : "";
    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${c.displayName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${(c.share * 100).toFixed(1)}%</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmt(c.expectedContribution)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmt(c.totalDeposited)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:${balColor};font-weight:600;">${balSign}${fmt(c.paymentBalance)}</td>
      </tr>`;
  }).join("");

  const topExpenses = [...data.expenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const expenseRows = topExpenses.map((e) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${e.label}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${e.category}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">${fmt(e.amount)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.07);">

    <!-- Header -->
    <div style="background:#2563eb;padding:28px 32px;">
      <p style="margin:0;color:rgba(255,255,255,.7);font-size:13px;text-transform:uppercase;letter-spacing:.05em;">Rapport mensuel • ${householdName}</p>
      <h1 style="margin:6px 0 0;color:#ffffff;font-size:26px;font-weight:700;">${title}</h1>
    </div>

    <!-- Résumé -->
    <div style="padding:24px 32px;background:#f8fafc;border-bottom:1px solid #e5e7eb;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:0 8px 0 0;width:33%;">
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;">
              <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Revenus</p>
              <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#16a34a;">${fmt(data.totalRevenues)}</p>
            </div>
          </td>
          <td style="padding:0 8px;width:33%;">
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;">
              <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Dépenses</p>
              <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#dc2626;">${fmt(data.totalExpenses)}</p>
            </div>
          </td>
          <td style="padding:0 0 0 8px;width:33%;">
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;">
              <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Solde</p>
              <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:${soldeColor};">${fmt(solde)}</p>
            </div>
          </td>
        </tr>
      </table>
      <p style="margin:12px 0 0;font-size:13px;color:#6b7280;text-align:center;">Taux d'effort : <strong>${effort}%</strong></p>
    </div>

    <!-- Répartition -->
    <div style="padding:24px 32px;">
      <h2 style="margin:0 0 14px;font-size:15px;font-weight:600;color:#111827;">Répartition & dépôts</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:8px 12px;text-align:left;color:#374151;">Membre</th>
            <th style="padding:8px 12px;text-align:right;color:#374151;">Part</th>
            <th style="padding:8px 12px;text-align:right;color:#374151;">Attendu</th>
            <th style="padding:8px 12px;text-align:right;color:#374151;">Déposé</th>
            <th style="padding:8px 12px;text-align:right;color:#374151;">Solde</th>
          </tr>
        </thead>
        <tbody>${contribRows}</tbody>
      </table>
    </div>

    <!-- Top dépenses -->
    ${topExpenses.length > 0 ? `
    <div style="padding:0 32px 24px;">
      <h2 style="margin:0 0 14px;font-size:15px;font-weight:600;color:#111827;">Top ${topExpenses.length} dépenses</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:8px 12px;text-align:left;color:#374151;">Description</th>
            <th style="padding:8px 12px;text-align:left;color:#374151;">Catégorie</th>
            <th style="padding:8px 12px;text-align:right;color:#374151;">Montant</th>
          </tr>
        </thead>
        <tbody>${expenseRows}</tbody>
      </table>
    </div>` : ""}

    <!-- Footer -->
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">Rapport généré automatiquement par Foyer • ${title}</p>
      <p style="margin:4px 0 0;font-size:11px;color:#d1d5db;">Le rapport PDF complet est joint à cet email.</p>
    </div>
  </div>
</body>
</html>`;
}
