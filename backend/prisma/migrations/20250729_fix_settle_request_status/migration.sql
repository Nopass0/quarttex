-- Update SettleRequestStatus enum values
-- Check and rename only if needed
DO $$ 
BEGIN
    -- Only rename REJECTED to CANCELLED if CANCELLED doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'SettleRequestStatus'::regtype 
        AND enumlabel = 'CANCELLED'
    ) THEN
        ALTER TYPE "SettleRequestStatus" RENAME VALUE 'REJECTED' TO 'CANCELLED';
    END IF;
END $$;

-- AlterTable SettleRequest - clean up and align with schema
ALTER TABLE "SettleRequest" DROP COLUMN IF EXISTS "currency";
ALTER TABLE "SettleRequest" DROP COLUMN IF EXISTS "comment";
ALTER TABLE "SettleRequest" DROP COLUMN IF EXISTS "rejectionReason";
ALTER TABLE "SettleRequest" DROP COLUMN IF EXISTS "requestedAt";
ALTER TABLE "SettleRequest" DROP COLUMN IF EXISTS "exchangeRate";
ALTER TABLE "SettleRequest" DROP COLUMN IF EXISTS "usdtAmount";
ALTER TABLE "SettleRequest" DROP COLUMN IF EXISTS "tradeId";
ALTER TABLE "SettleRequest" DROP COLUMN IF EXISTS "usdtEquivalent";
ALTER TABLE "SettleRequest" DROP COLUMN IF EXISTS "countInRubEquivalent";
ALTER TABLE "SettleRequest" DROP COLUMN IF EXISTS "rateType";
ALTER TABLE "SettleRequest" DROP COLUMN IF EXISTS "merchantRate";
ALTER TABLE "SettleRequest" DROP COLUMN IF EXISTS "settlementAddress";
ALTER TABLE "SettleRequest" DROP COLUMN IF EXISTS "updatedAt";

ALTER TABLE "SettleRequest" ADD COLUMN IF NOT EXISTS "amountUsdt" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "SettleRequest" ADD COLUMN IF NOT EXISTS "rate" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "SettleRequest" ADD COLUMN IF NOT EXISTS "cancelReason" TEXT;
ALTER TABLE "SettleRequest" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;