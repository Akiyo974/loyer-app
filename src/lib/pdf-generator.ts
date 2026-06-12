import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { MonthData } from "@/lib/types";

const PW = 595, PH = 842, M = 40;
const UW = PW - M * 2; // 515

const BLUE  = rgb(0.145, 0.380, 0.922);
const DBLUE = rgb(0.118, 0.251, 0.694);
const HDARK = rgb(0.216, 0.255, 0.318);
const GREEN = rgb(0.086, 0.639, 0.290);
const RED   = rgb(0.863, 0.149, 0.149);
const TXTD  = rgb(0.067, 0.094, 0.153);
const TXTG  = rgb(0.420, 0.450, 0.500);
const WHITE = rgb(1, 1, 1);
const ALTBG = rgb(0.976, 0.980, 0.988);
const BORDR = rgb(0.898, 0.906, 0.922);

const CATEGORY_FR: Record<string, string> = {
  LOYER: "Loyer", EPICERIE: "Epicerie", TRANSPORT: "Transport",
  SANTE: "Sante", LOISIRS: "Loisirs", RESTAURANTS: "Restaurants",
  VETEMENTS: "Vetements", ABONNEMENTS: "Abonnements",
  ELECTRICITE: "Electricite", INTERNET: "Internet",
  ASSURANCE: "Assurance", ENTRETIEN: "Entretien", DIVERS: "Divers",
};

function fmt(n: number) { return `${n.toFixed(2)} $`; }

function monthLabel(year: number, month: number) {
  const n = ["Janvier","Fevrier","Mars","Avril","Mai","Juin",
             "Juillet","Aout","Septembre","Octobre","Novembre","Decembre"];
  return `${n[month - 1]} ${year}`;
}

export async function generateMonthPDF(data: MonthData): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const bld = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Mutable references capturées par les closures
  let page: PDFPage = pdf.addPage([PW, PH]);
  let cy = M; // curseur depuis le haut de page

  // pdf-lib : y=0 est en bas, donc on convertit : bas du rect = PH - cy - hauteur
  function fillR(x: number, y: number, w: number, h: number, c: ReturnType<typeof rgb>) {
    page.drawRectangle({ x, y: PH - y - h, width: w, height: h, color: c });
  }
  function bordR(x: number, y: number, w: number, h: number) {
    page.drawRectangle({ x, y: PH - y - h, width: w, height: h,
      borderColor: BORDR, borderWidth: 0.5, opacity: 0, borderOpacity: 1 });
  }
  // y = sommet de la zone texte ; baseline ≈ y + sz
  function txt(
    s: string, x: number, y: number, sz: number,
    font: PDFFont = reg, color: ReturnType<typeof rgb> = TXTD,
    maxW?: number,
  ) {
    let str = s;
    if (maxW !== undefined)
      while (str.length > 1 && font.widthOfTextAtSize(str, sz) > maxW)
        str = str.slice(0, -1);
    page.drawText(str, { x, y: PH - y - sz, size: sz, font, color });
  }
  function checkPage(needed: number) {
    if (cy + needed > PH - M) { page = pdf.addPage([PW, PH]); cy = M; }
  }
  function secTitle(title: string) {
    checkPage(26);
    fillR(M, cy, UW, 18, DBLUE);
    txt(title, M + 6, cy + 2, 10, bld, WHITE);
    cy += 24;
  }
  function sumRow(label: string, value: string, valColor: ReturnType<typeof rgb>) {
    checkPage(17);
    fillR(M, cy, UW, 15, ALTBG);
    txt(label, M + 6, cy + 3, 9, reg, TXTD);
    const vw = bld.widthOfTextAtSize(value, 9);
    txt(value, M + UW - 8 - vw, cy + 3, 9, bld, valColor);
    cy += 15;
  }
  function tHead(cols: string[], ratios: number[]) {
    checkPage(20);
    fillR(M, cy, UW, 16, HDARK);
    let x = M;
    cols.forEach((c, i) => {
      txt(c, x + 3, cy + 3, 8, bld, WHITE);
      x += UW * ratios[i];
    });
    cy += 16;
  }
  function tRow(cells: string[], ratios: number[], alt: boolean) {
    checkPage(16);
    if (alt) fillR(M, cy, UW, 14, ALTBG);
    bordR(M, cy, UW, 14);
    let x = M;
    cells.forEach((c, i) => {
      txt(c, x + 3, cy + 3, 8, reg, TXTD, UW * ratios[i] - 6);
      x += UW * ratios[i];
    });
    cy += 14;
  }

  // ── En-tête ───────────────────────────────────────────────
  fillR(M, cy, UW, 52, BLUE);
  txt(`Rapport - ${monthLabel(data.year, data.month)}`, M + 10, cy + 8, 18, bld, WHITE);
  txt(`Genere le ${new Date().toLocaleDateString("fr-CA")}`, M + 10, cy + 32, 9, reg, WHITE);
  cy += 62;

  // ── Résumé ────────────────────────────────────────────────
  secTitle("Resume du mois");
  const effort = data.totalRevenues > 0
    ? ((data.totalExpenses / data.totalRevenues) * 100).toFixed(1) : "0.0";
  const solde = data.totalRevenues - data.totalExpenses;
  sumRow("Total revenus", fmt(data.totalRevenues), GREEN);
  sumRow("Total depenses", fmt(data.totalExpenses), RED);
  sumRow("Taux d effort", `${effort}%`, BLUE);
  sumRow("Solde (revenus - depenses)", fmt(solde), solde >= 0 ? GREEN : RED);
  cy += 10;

  // ── Dépenses ──────────────────────────────────────────────
  secTitle(`Depenses (${data.expenses.length})`);
  const ER = [0.20, 0.35, 0.18, 0.15, 0.12];
  tHead(["Categorie", "Description", "Montant", "Type", "Paye par"], ER);
  data.expenses.forEach((e, i) => tRow([
    CATEGORY_FR[e.category] ?? e.category,
    e.label,
    fmt(e.amount),
    e.type === "FIXED" ? "Fixe" : "Variable",
    e.paidByName ?? "-",
  ], ER, i % 2 === 1));
  cy += 10;

  // ── Paies ─────────────────────────────────────────────────
  secTitle("Revenus / Paies");
  const PR = [0.35, 0.20, 0.15, 0.15, 0.15];
  tHead(["Membre", "Date", "Brut", "Deductions", "Net"], PR);
  data.paychecks.forEach((p, i) => tRow([
    p.displayName,
    p.date.slice(0, 10),
    fmt(p.grossAmount),
    fmt(p.vacationDeduction),
    fmt(p.netAmount),
  ], PR, i % 2 === 1));
  cy += 10;

  // ── Répartition ───────────────────────────────────────────
  secTitle("Repartition et depots");
  const CR = [0.35, 0.15, 0.18, 0.18, 0.14];
  tHead(["Membre", "Part %", "Attendu", "Depose", "Solde"], CR);
  data.contributions.forEach((c, i) => {
    const bal = fmt(Math.abs(c.paymentBalance));
    tRow([
      c.displayName,
      `${(c.share * 100).toFixed(1)}%`,
      fmt(c.expectedContribution),
      fmt(c.totalDeposited),
      `${c.paymentBalance >= 0 ? "+" : "-"}${bal}`,
    ], CR, i % 2 === 1);
  });

  // ── Pied de page ──────────────────────────────────────────
  cy += 18;
  const footer = `Foyer - ${monthLabel(data.year, data.month)} - Rapport genere automatiquement`;
  txt(footer, M + (UW - reg.widthOfTextAtSize(footer, 8)) / 2, cy, 8, reg, TXTG);

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
