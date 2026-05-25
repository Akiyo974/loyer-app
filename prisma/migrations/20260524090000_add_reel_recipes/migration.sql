-- CreateTable
CREATE TABLE "ReelRecipe" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "reelUrl" TEXT NOT NULL,
  "lastNotes" TEXT,
  "recipeTitle" TEXT,
  "recipeJson" JSONB,
  "thumbnailPath" TEXT,
  "lastStatus" TEXT NOT NULL DEFAULT 'success',
  "hitCount" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ReelRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReelRecipe_householdId_reelUrl_key" ON "ReelRecipe"("householdId", "reelUrl");

-- CreateIndex
CREATE INDEX "ReelRecipe_householdId_updatedAt_idx" ON "ReelRecipe"("householdId", "updatedAt");

-- AddForeignKey
ALTER TABLE "ReelRecipe" ADD CONSTRAINT "ReelRecipe_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReelRecipe" ADD CONSTRAINT "ReelRecipe_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
