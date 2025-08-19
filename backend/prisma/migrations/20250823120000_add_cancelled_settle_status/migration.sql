-- AlterEnum (idempotent)
DO $$ BEGIN
    ALTER TYPE "SettleRequestStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
