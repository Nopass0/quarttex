-- Cleanup migration history to resolve P3009 errors
-- This migration removes problematic migration records from _prisma_migrations table

-- Remove the failed migration record that's causing issues
DELETE FROM "_prisma_migrations" WHERE migration_name = '20250115000000_fix_failed_migration_20250728104123';

-- Remove any other problematic migration records that don't match local files
DELETE FROM "_prisma_migrations" WHERE migration_name IN (
    '20250128_add_rate_sources',
    '20250129_add_aggregator_callback_logs', 
    '20250129_create_aggregator_system',
    '20250129000000_add_auction_system',
    '20250130_resolve_drift',
    '20250210_add_counterparty_limit',
    '20250210_add_aggregator_merchants'
);

-- Ensure TransactionAttempt table exists with success column
DO $$
BEGIN
    -- Create TransactionAttempt table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'TransactionAttempt'
    ) THEN
        CREATE TABLE "TransactionAttempt" (
            "id" TEXT NOT NULL,
            "transactionId" TEXT,
            "merchantId" TEXT NOT NULL,
            "methodId" TEXT NOT NULL,
            "amount" DOUBLE PRECISION NOT NULL,
            "status" TEXT,
            "success" BOOLEAN NOT NULL DEFAULT false,
            "errorCode" TEXT,
            "message" TEXT,
            "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,

            CONSTRAINT "TransactionAttempt_pkey" PRIMARY KEY ("id")
        );

        -- Add indexes
        CREATE INDEX "TransactionAttempt_createdAt_idx" ON "TransactionAttempt"("createdAt");
        CREATE INDEX "TransactionAttempt_merchantId_idx" ON "TransactionAttempt"("merchantId");
    ELSE
        -- Table exists, just ensure success column exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'TransactionAttempt' AND column_name = 'success'
        ) THEN
            ALTER TABLE "TransactionAttempt" ADD COLUMN "success" BOOLEAN NOT NULL DEFAULT false;
        END IF;
    END IF;
END $$;
