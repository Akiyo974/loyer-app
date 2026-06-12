import PDFDocument from "pdfkit";
import type { MonthData } from "@/lib/types";

const CATEGORY_FR: Record<string, string> = {
  LOYER: "Loyer",
  EPICERIE: "Epicerie",
  TRANSPORT: "Transport",
  SANTE: "Sante",
  LOISIRS: "Loisirs",
  RESTAURANTS: "Restaurants",
  VETEMENTS: "Vetements",
  ABONNEMENTS: "Abonnements",
  ELECTRICITE: "Electricite",
  INTERNET: "Internet",
  ASSURANCE: "Assurance",
  ENTRETIEN: "Entretien",
  DIVERS: "Divers",
};

function fmt(n: number) {
  return `${n.toFixed(2)} $`;
}

function monthLabel(year: number, month: number) {
  const names = ["Janvier","Fevrier","Mars","Avril","Mai","Juin",
                 "Juillet","Aout","Septembre","Octobre","Novembre","Decembre"];
  return `${names[month - 1]} ${year}`;
}

export function generateMonthPDF(data: MonthData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width - 80; // largeur utilisable
    const BLUE = "#2563eb";
    const GRAY = "#6b7280";
    const GREEN = "#16a34a";
    const RED = "#dc2626";

    // ── Header ──────────────────────────────────────────────
    doc.rect(40, 40, W, 50).fill(BLUE);
    doc.fillColor("white").fontSize(18).font("Helvetica-Bold")
       .text(`Rapport - ${monthLabel(data.year, data.month)}`, 52, 52);
    doc.fillColor("white").fontSize(9).font("Helvetica")
       .text(`Genere le ${new Date().toLocaleDateString("fr-CA")}`, 52, 76);

    doc.moveDown(3);

    // ── Resume ───────────────────────────────────────────────
    sectionTitle(doc, "Resume du mois", W);

    const effortRatio = data.totalRevenues > 0
      ? ((data.totalExpenses / data.totalRevenues) * 100).toFixed(1)
      : "0.0";
    const solde = data.totalRevenues - data.totalExpenses;

    summaryRow(doc, "Total revenus", fmt(data.totalRevenues), GREEN, W);
    summaryRow(doc, "Total depenses", fmt(data.totalExpenses), RED, W);
    summaryRow(doc, "Taux d effort", `${effortRatio}%`, BLUE, W);
    summaryRow(doc, "Solde (revenus - depenses)", fmt(solde), solde >= 0 ? GREEN : RED, W);

    // ── Depenses ─────────────────────────────────────────────
    sectionTitle(doc, `Depenses (${data.expenses.length})`, W);

    tableHeader(doc, W, ["Categorie", "Description", "Montant", "Type", "Paye par"],
                        [0.2, 0.35, 0.18, 0.15, 0.12]);

    data.expenses.forEach((e, i) => {
      tableRow(doc, W, [
        CATEGORY_FR[e.category] ?? e.category,
        e.label,
        fmt(e.amount),
        e.type === "FIXED" ? "Fixe" : "Variable",
        e.paidByName ?? "-",
      ], [0.2, 0.35, 0.18, 0.15, 0.12], i % 2 === 1);
    });

    // ── Paies ────────────────────────────────────────────────
    sectionTitle(doc, "Revenus / Paies", W);

    tableHeader(doc, W, ["Membre", "Date", "Brut", "Deductions", "Net"],
                        [0.35, 0.2, 0.15, 0.15, 0.15]);

    data.paychecks.forEach((p, i) => {
      tableRow(doc, W, [
        p.displayName,
        p.date.slice(0, 10),
        fmt(p.grossAmount),
        fmt(p.vacationDeduction),
        fmt(p.netAmount),
      ], [0.35, 0.2, 0.15, 0.15, 0.15], i % 2 === 1);
    });

    // ── Repartition ──────────────────────────────────────────
    sectionTitle(doc, "Repartition & depots", W);

    tableHeader(doc, W, ["Membre", "Part %", "Attendu", "Depose", "Solde"],
                        [0.35, 0.15, 0.18, 0.18, 0.14]);

    data.contributions.forEach((c, i) => {
      const bal = fmt(Math.abs(c.paymentBalance));
      tableRow(doc, W, [
        c.displayName,
        `${(c.share * 100).toFixed(1)}%`,
        fmt(c.expectedContribution),
        fmt(c.totalDeposited),
        `${c.paymentBalance >= 0 ? "+" : "-"}${bal}`,
      ], [0.35, 0.15, 0.18, 0.18, 0.14], i % 2 === 1);
    });

    // ── Footer ───────────────────────────────────────────────
    doc.moveDown(2);
    doc.fontSize(8).fillColor(GRAY).font("Helvetica")
       .text(`Foyer - Rapport genere automatiquement - ${monthLabel(data.year, data.month)}`,
             40, undefined, { align: "center", width: W });

    doc.end();
  });
}

// ── Helpers ─────────────────────────────────────────────────

function sectionTitle(doc: PDFKit.PDFDocument, title: string, W: number) {
  doc.moveDown(0.5);
  const y = doc.y;
  doc.rect(40, y, W, 18).fill("#1e40af");
  doc.fillColor("white").fontSize(10).font("Helvetica-Bold")
     .text(title, 46, y + 4);
  doc.moveDown(0.3);
}

function summaryRow(doc: PDFKit.PDFDocument, label: string, value: string, color: string, W: number) {
  const y = doc.y;
  doc.rect(40, y, W, 16).fill("#f8fafc");
  doc.fillColor("#374151").fontSize(9).font("Helvetica")
     .text(label, 46, y + 3);
  doc.fillColor(color).font("Helvetica-Bold")
     .text(value, 40, y + 3, { width: W - 6, align: "right" });
  doc.moveDown(0.15);
}

function tableHeader(doc: PDFKit.PDFDocument, W: number, cols: string[], ratios: number[]) {
  const y = doc.y;
  const ROW_H = 16;
  doc.rect(40, y, W, ROW_H).fill("#374151");

  let x = 40;
  cols.forEach((col, idx) => {
    doc.fillColor("white").fontSize(8).font("Helvetica-Bold")
       .text(col, x + 3, y + 4, { width: W * ratios[idx] - 4, lineBreak: false });
    x += W * ratios[idx];
  });
  doc.moveDown(0.3);
}

function tableRow(doc: PDFKit.PDFDocument, W: number, cells: string[], ratios: number[], alt: boolean) {
  const y = doc.y;
  const ROW_H = 14;

  if (alt) doc.rect(40, y, W, ROW_H).fill("#f9fafb");
  doc.rect(40, y, W, ROW_H).stroke("#e5e7eb");

  let x = 40;
  cells.forEach((cell, idx) => {
    doc.fillColor("#111827").fontSize(8).font("Helvetica")
       .text(cell, x + 3, y + 3, { width: W * ratios[idx] - 6, lineBreak: false });
    x += W * ratios[idx];
  });
  doc.moveDown(0.1);
}
