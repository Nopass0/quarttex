-- AlterTable
DO $$ BEGIN
    ALTER TABLE "BankDetail" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;
