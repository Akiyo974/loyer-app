-- CreateTable CategoryBudget
CREATE TABLE "CategoryBudget" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "monthlyBudget" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CategoryBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable Alert
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'EXPENSE_SPIKE',
    "threshold" DOUBLE PRECISION NOT NULL DEFAULT 1.2,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggered" TIMESTAMP(3),

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- Add isAutoRecurring column to Expense
ALTER TABLE "Expense" ADD COLUMN "isAutoRecurring" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "CategoryBudget_householdId_category_key" ON "CategoryBudget"("householdId", "category");
CREATE INDEX "CategoryBudget_householdId_idx" ON "CategoryBudget"("householdId");
CREATE INDEX "Alert_householdId_idx" ON "Alert"("householdId");

-- AddForeignKey
ALTER TABLE "CategoryBudget" ADD CONSTRAINT "CategoryBudget_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
