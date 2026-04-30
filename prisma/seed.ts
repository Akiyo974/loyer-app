import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Créer deux utilisateurs
  const hashedPassword = await bcrypt.hash("password123", 12);

  const userA = await prisma.user.upsert({
    where: { email: "marie@example.com" },
    update: {},
    create: {
      email: "marie@example.com",
      name: "Marie Dupont",
      password: hashedPassword,
    },
  });

  const userB = await prisma.user.upsert({
    where: { email: "jean@example.com" },
    update: {},
    create: {
      email: "jean@example.com",
      name: "Jean Martin",
      password: hashedPassword,
    },
  });

  // Créer le foyer
  const household = await prisma.household.upsert({
    where: { id: "seed-household-001" },
    update: {},
    create: {
      id: "seed-household-001",
      name: "Foyer Marie & Jean",
    },
  });

  // Ajouter les membres
  await prisma.householdMember.upsert({
    where: { userId: userA.id },
    update: {},
    create: {
      householdId: household.id,
      userId: userA.id,
      role: "ADMIN",
      displayName: "Marie",
    },
  });

  await prisma.householdMember.upsert({
    where: { userId: userB.id },
    update: {},
    create: {
      householdId: household.id,
      userId: userB.id,
      role: "MEMBER",
      displayName: "Jean",
    },
  });

  // Créer le mois de mai 2026
  const month = await prisma.month.upsert({
    where: {
      householdId_year_month: {
        householdId: household.id,
        year: 2026,
        month: 5,
      },
    },
    update: {},
    create: {
      householdId: household.id,
      year: 2026,
      month: 5,
    },
  });

  // Dépenses fixes du foyer
  const expenses = [
    { category: "LOYER" as const, label: "Loyer", amount: 1400, type: "FIXED" as const },
    { category: "ELECTRICITE" as const, label: "Hydro-Québec", amount: 120, type: "FIXED" as const },
    { category: "INTERNET" as const, label: "Internet Vidéotron", amount: 75, type: "FIXED" as const },
    { category: "ASSURANCE" as const, label: "Assurance habitation", amount: 65, type: "FIXED" as const },
    { category: "EPICERIE" as const, label: "Épicerie semaine 1", amount: 180, type: "VARIABLE" as const },
  ];

  for (const expense of expenses) {
    await prisma.expense.create({
      data: {
        householdId: household.id,
        monthId: month.id,
        ...expense,
        amount: expense.amount,
      },
    });
  }

  // Paies de Marie (avec déduction vacances)
  await prisma.paycheck.createMany({
    data: [
      {
        householdId: household.id,
        userId: userA.id,
        date: new Date("2026-05-08"),
        grossAmount: 2200,
        vacationDeduction: 110,
        netAmount: 2090,
        notes: "Paie 1 mai",
      },
      {
        householdId: household.id,
        userId: userA.id,
        date: new Date("2026-05-22"),
        grossAmount: 2200,
        vacationDeduction: 0,
        netAmount: 2200,
        notes: "Paie 2 mai",
      },
    ],
  });

  // Paies de Jean
  await prisma.paycheck.createMany({
    data: [
      {
        householdId: household.id,
        userId: userB.id,
        date: new Date("2026-05-01"),
        grossAmount: 2800,
        vacationDeduction: 0,
        netAmount: 2800,
        notes: "Paie 1 mai",
      },
      {
        householdId: household.id,
        userId: userB.id,
        date: new Date("2026-05-15"),
        grossAmount: 2800,
        vacationDeduction: 0,
        netAmount: 2800,
        notes: "Paie 2 mai",
      },
    ],
  });

  console.log("✅ Seed terminé !");
  console.log("👤 Marie: marie@example.com / password123");
  console.log("👤 Jean:  jean@example.com  / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
