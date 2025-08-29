-- Ensure enums exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RateSource') THEN
        CREATE TYPE "RateSource" AS ENUM ('bybit', 'rapira');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'KkkOperationType') THEN
        CREATE TYPE "KkkOperationType" AS ENUM ('PLUS', 'MINUS');
    END IF;
END $$;

-- CreateTable
CREATE TABLE "RateSourceConfig" (
    "id" TEXT NOT NULL,
    "source" "RateSource" NOT NULL,
    "displayName" TEXT NOT NULL,
    "kkkPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "kkkOperation" "KkkOperationType" NOT NULL DEFAULT 'MINUS',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "baseRate" DOUBLE PRECISION,
    "lastRateUpdate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateSourceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantRateSource" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "rateSourceId" TEXT NOT NULL,
    "merchantProvidesRate" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantRateSource_pkey" PRIMARY KEY ("id")
);

-- AlterTable (conditionally add column if User exists and column missing)
DO $$
BEGIN
    IF to_regclass('"User"') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'rateSourceConfigId'
    ) THEN
        EXECUTE 'ALTER TABLE "User" ADD COLUMN "rateSourceConfigId" TEXT';
    END IF;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX "RateSourceConfig_source_key" ON "RateSourceConfig"("source");

-- CreateIndex
CREATE INDEX "MerchantRateSource_merchantId_idx" ON "MerchantRateSource"("merchantId");

-- CreateIndex
CREATE INDEX "MerchantRateSource_rateSourceId_idx" ON "MerchantRateSource"("rateSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantRateSource_merchantId_rateSourceId_key" ON "MerchantRateSource"("merchantId", "rateSourceId");

-- AddForeignKey (conditionally, only if both tables exist and constraint missing)
DO $$
BEGIN
    IF to_regclass('"User"') IS NOT NULL 
       AND to_regclass('"RateSourceConfig"') IS NOT NULL 
       AND NOT EXISTS (
           SELECT 1 FROM pg_constraint WHERE conname = 'User_rateSourceConfigId_fkey'
       ) THEN
        EXECUTE 'ALTER TABLE "User" ADD CONSTRAINT "User_rateSourceConfigId_fkey" FOREIGN KEY ("rateSourceConfigId") REFERENCES "RateSourceConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE';
    END IF;
END $$;

-- AddForeignKey (conditionally for Merchant reference)
DO $$
BEGIN
    IF to_regclass('"MerchantRateSource"') IS NOT NULL 
       AND to_regclass('"Merchant"') IS NOT NULL 
       AND NOT EXISTS (
           SELECT 1 FROM pg_constraint WHERE conname = 'MerchantRateSource_merchantId_fkey'
       ) THEN
        EXECUTE 'ALTER TABLE "MerchantRateSource" ADD CONSTRAINT "MerchantRateSource_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE';
    END IF;
END $$;

-- AddForeignKey (conditionally for RateSourceConfig reference)
DO $$
BEGIN
    IF to_regclass('"MerchantRateSource"') IS NOT NULL 
       AND to_regclass('"RateSourceConfig"') IS NOT NULL 
       AND NOT EXISTS (
           SELECT 1 FROM pg_constraint WHERE conname = 'MerchantRateSource_rateSourceId_fkey'
       ) THEN
        EXECUTE 'ALTER TABLE "MerchantRateSource" ADD CONSTRAINT "MerchantRateSource_rateSourceId_fkey" FOREIGN KEY ("rateSourceId") REFERENCES "RateSourceConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE';
    END IF;
END $$;

-- Insert default rate source configurations (idempotent, no pgcrypto required)
INSERT INTO "RateSourceConfig" ("id", "source", "displayName", "kkkPercent", "kkkOperation", "isActive", "createdAt", "updatedAt")
VALUES 
  ('rate-source-bybit', 'bybit', 'Bybit', 0, 'MINUS', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rate-source-rapira', 'rapira', 'Rapira', 0, 'MINUS', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("source") DO NOTHING;
