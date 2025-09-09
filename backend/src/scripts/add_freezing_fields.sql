-- Add transaction freezing fields
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "frozenUsdtAmount" DOUBLE PRECISION;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "adjustedRate" DOUBLE PRECISION;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "kkkPercent" DOUBLE PRECISION;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "feeInPercent" DOUBLE PRECISION;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "calculatedCommission" DOUBLE PRECISION;

-- Create RateSettings table
CREATE TABLE IF NOT EXISTS "RateSettings" (
    "id" TEXT NOT NULL,
    "methodId" TEXT NOT NULL,
    "kkkPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateSettings_pkey" PRIMARY KEY ("id")
);

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS "RateSettings_methodId_key" ON "RateSettings"("methodId");

-- Add foreign key
ALTER TABLE "RateSettings" ADD CONSTRAINT "RateSettings_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "Method"("id") ON DELETE RESTRICT ON UPDATE CASCADE;