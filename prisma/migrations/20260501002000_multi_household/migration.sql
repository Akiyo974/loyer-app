-- Migration: allow a user to belong to multiple households
-- 1. Drop existing unique index on userId
DROP INDEX IF EXISTS "HouseholdMember_userId_key";

-- 2. Add composite unique constraint on (householdId, userId)
ALTER TABLE "HouseholdMember"
  ADD CONSTRAINT "HouseholdMember_householdId_userId_key"
  UNIQUE ("householdId", "userId");
