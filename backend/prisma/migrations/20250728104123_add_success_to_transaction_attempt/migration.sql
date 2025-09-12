-- AlterTable
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'TransactionAttempt' AND column_name = 'success'
    ) THEN
        ALTER TABLE "TransactionAttempt" ADD COLUMN "success" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;
