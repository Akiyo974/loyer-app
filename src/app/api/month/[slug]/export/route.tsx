import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActiveHouseholdId } from "@/lib/active-household";
import { prisma } from "@/lib/prisma";
import { generateMonthPDF } from "@/lib/pdf-generator";
import { buildMonthData } from "@/lib/build-month-data";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Non autorise", { status: 401 });
  }

  const { slug } = await params;
  const format = req.nextUrl.searchParams.get("format") ?? "csv";

  if (!/^\d{4}-\d{2}$/.test(slug)) {
    return new NextResponse("Slug invalide", { status: 400 });
  }

  const householdId = await getActiveHouseholdId(session.user.id);
  if (!householdId) {
    return new NextResponse("Foyer introuvable", { status: 404 });
  }

  const member = await prisma.householdMember.findUnique({
    where: { householdId_userId: { householdId, userId: session.user.id } },
  });
  if (!member) {
    return new NextResponse("Acces refuse", { status: 403 });
  }

  const monthData = await buildMonthData(slug, householdId);
  if (!monthData) {
    return new NextResponse("Mois introuvable", { status: 404 });
  }

  // ---- CSV ----
  if (format === "csv") {
    const lines: string[] = [];
    lines.push(`Rapport - ${slug}`);
    lines.push(`Total revenus,${monthData.totalRevenues.toFixed(2)}`);
    lines.push(`Total depenses,${monthData.totalExpenses.toFixed(2)}`);
    lines.push(``);
    lines.push(`Depenses`);
    lines.push(`Categorie,Description,Montant,Type,Paye par`);
    for (const e of monthData.expenses) {
      lines.push(`"${e.category}","${e.label}",${e.amount.toFixed(2)},"${e.type}","${e.paidByName ?? ""}"`);
    }
    lines.push(``);
    lines.push(`Revenus / Paies`);
    lines.push(`Membre,Date,Brut,Deductions,Net`);
    for (const p of monthData.paychecks) {
      lines.push(`"${p.displayName}","${p.date.slice(0, 10)}",${p.grossAmount.toFixed(2)},${p.vacationDeduction.toFixed(2)},${p.netAmount.toFixed(2)}`);
    }
    lines.push(``);
    lines.push(`Repartition`);
    lines.push(`Membre,Part %,Attendu,Depose,Solde`);
    for (const c of monthData.contributions) {
      lines.push(`"${c.displayName}",${(c.share * 100).toFixed(1)},${c.expectedContribution.toFixed(2)},${c.totalDeposited.toFixed(2)},${c.paymentBalance.toFixed(2)}`);
    }

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="foyer-${slug}.csv"`,
      },
    });
  }

  // ---- PDF ----
  try {
    const buffer = await generateMonthPDF(monthData);
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="foyer-${slug}.pdf"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new NextResponse(`Erreur PDF: ${msg}`, { status: 500 });
  }
}
