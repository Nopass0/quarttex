-- Fix failed migration 20250728104123_add_success_to_transaction_attempt
-- This migration ensures the success column exists in TransactionAttempt table

DO $$
BEGIN
    -- Check if the success column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'TransactionAttempt' AND column_name = 'success'
    ) THEN
        ALTER TABLE "TransactionAttempt" ADD COLUMN "success" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Mark the failed migration as resolved by ensuring the schema is correct
-- This will allow future migrations to proceed
