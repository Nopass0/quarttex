-- Fix TransactionAttempt table structure to match Prisma schema
-- This migration modifies the existing table created in 20250726_add_new_fields

-- First, drop columns that don't exist in the Prisma schema
ALTER TABLE "TransactionAttempt" 
  DROP COLUMN IF EXISTS "transactionId",
  DROP COLUMN IF EXISTS "status",
  DROP COLUMN IF EXISTS "message", 
  DROP COLUMN IF EXISTS "timestamp",
  DROP COLUMN IF EXISTS "updatedAt";

-- Add the missing columns
ALTER TABLE "TransactionAttempt"
  ADD COLUMN IF NOT EXISTS "success" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "errorCode" TEXT;

-- Ensure indexes exist
DROP INDEX IF EXISTS "TransactionAttempt_createdAt_idx";
DROP INDEX IF EXISTS "TransactionAttempt_merchantId_idx";

CREATE INDEX IF NOT EXISTS "TransactionAttempt_createdAt_idx" ON "TransactionAttempt"("createdAt");
CREATE INDEX IF NOT EXISTS "TransactionAttempt_merchantId_idx" ON "TransactionAttempt"("merchantId");