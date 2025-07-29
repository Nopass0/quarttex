-- AlterTable TransactionAttempt - add missing fields
ALTER TABLE "TransactionAttempt" DROP COLUMN IF EXISTS "transactionId";
ALTER TABLE "TransactionAttempt" DROP COLUMN IF EXISTS "status";
ALTER TABLE "TransactionAttempt" DROP COLUMN IF EXISTS "message";
ALTER TABLE "TransactionAttempt" DROP COLUMN IF EXISTS "timestamp";
ALTER TABLE "TransactionAttempt" DROP COLUMN IF EXISTS "updatedAt";

ALTER TABLE "TransactionAttempt" ADD COLUMN IF NOT EXISTS "success" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TransactionAttempt" ADD COLUMN IF NOT EXISTS "errorCode" TEXT;

-- Drop and recreate indexes
DROP INDEX IF EXISTS "TransactionAttempt_createdAt_idx";
DROP INDEX IF EXISTS "TransactionAttempt_merchantId_idx";

CREATE INDEX "TransactionAttempt_createdAt_idx" ON "TransactionAttempt"("createdAt");
CREATE INDEX "TransactionAttempt_merchantId_idx" ON "TransactionAttempt"("merchantId");