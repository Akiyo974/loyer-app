/*
  Warnings:

  - You are about to drop the `ReelRecipe` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ReelRecipe" DROP CONSTRAINT "ReelRecipe_createdById_fkey";

-- DropForeignKey
ALTER TABLE "ReelRecipe" DROP CONSTRAINT "ReelRecipe_householdId_fkey";

-- AlterTable
ALTER TABLE "Alert" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CategoryBudget" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- DropTable
DROP TABLE "ReelRecipe";
