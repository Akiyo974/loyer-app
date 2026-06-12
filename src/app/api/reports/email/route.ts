import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { auth } from "@/lib/auth";
import { getActiveHouseholdId } from "@/lib/active-household";
import { prisma } from "@/lib/prisma";
import { buildMonthData, getHouseholdMemberEmails } from "@/lib/build-month-data";
import { generateMonthPDF } from "@/lib/pdf-generator";
import { buildReportEmailHtml } from "@/lib/email-template";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const slug: string | undefined = body?.slug;
  if (!slug || !/^\d{4}-\d{2}$/.test(slug)) {
    return NextResponse.json({ error: "Slug invalide" }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "RESEND_API_KEY non configurée" },
      { status: 503 }
    );
  }

  const householdId = await getActiveHouseholdId(session.user.id);
  if (!householdId) {
    return NextResponse.json({ error: "Foyer introuvable" }, { status: 404 });
  }

  // Vérifier appartenance
  const member = await prisma.householdMember.findUnique({
    where: { householdId_userId: { householdId, userId: session.user.id } },
  });
  if (!member) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const household = await prisma.household.findUnique({
    where: { id: householdId },
    select: { name: true },
  });
  const householdName = household?.name ?? "Foyer";

  const monthData = await buildMonthData(slug, householdId);
  if (!monthData) {
    return NextResponse.json({ error: "Mois introuvable" }, { status: 404 });
  }

  // Générer le PDF
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateMonthPDF(monthData);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Erreur PDF : ${msg}` }, { status: 500 });
  }

  // Récupérer les emails des membres
  const emails = await getHouseholdMemberEmails(householdId);
  if (emails.length === 0) {
    return NextResponse.json({ error: "Aucun email de membre trouvé" }, { status: 400 });
  }

  const MONTH_NAMES = [
    "Janvier","Février","Mars","Avril","Mai","Juin",
    "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
  ];
  const monthLabel = `${MONTH_NAMES[monthData.month - 1]} ${monthData.year}`;

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: "Foyer <rapports@foyer.app>",
    to: emails,
    subject: `Rapport ${householdName} — ${monthLabel}`,
    html: buildReportEmailHtml(monthData, householdName),
    attachments: [
      {
        filename: `foyer-${slug}.pdf`,
        content: pdfBuffer.toString("base64"),
      },
    ],
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, recipients: emails.length });
}
