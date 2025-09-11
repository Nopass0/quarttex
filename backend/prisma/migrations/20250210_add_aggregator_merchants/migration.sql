-- Добавляем новые поля в таблицу Aggregator
ALTER TABLE "Aggregator" ADD COLUMN IF NOT EXISTS "frozenBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Aggregator" ADD COLUMN IF NOT EXISTS "requiresInsuranceDeposit" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Aggregator" ADD COLUMN IF NOT EXISTS "isChaseCompatible" BOOLEAN NOT NULL DEFAULT false;

-- Создаем enum для направления сеттлов
CREATE TYPE "SettlementDirection" AS ENUM ('IN', 'OUT');

-- Создаем таблицу AggregatorMerchant
CREATE TABLE IF NOT EXISTS "AggregatorMerchant" (
    "id" TEXT NOT NULL,
    "aggregatorId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "methodId" TEXT NOT NULL,
    "feeIn" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "feeOut" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isFeeInEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isFeeOutEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isTrafficEnabled" BOOLEAN NOT NULL DEFAULT true,
    "rateSource" "RateSource",
    "useFlexibleRates" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AggregatorMerchant_pkey" PRIMARY KEY ("id")
);

-- Создаем таблицу AggregatorMerchantFeeRange
CREATE TABLE IF NOT EXISTS "AggregatorMerchantFeeRange" (
    "id" TEXT NOT NULL,
    "aggregatorMerchantId" TEXT NOT NULL,
    "minAmount" DOUBLE PRECISION NOT NULL,
    "maxAmount" DOUBLE PRECISION NOT NULL,
    "feeInPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "feeOutPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AggregatorMerchantFeeRange_pkey" PRIMARY KEY ("id")
);

-- Создаем таблицу AggregatorSettlement
CREATE TABLE IF NOT EXISTS "AggregatorSettlement" (
    "id" TEXT NOT NULL,
    "aggregatorId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "direction" "SettlementDirection" NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "AggregatorSettlement_pkey" PRIMARY KEY ("id")
);

-- Создаем индексы для AggregatorMerchant
CREATE UNIQUE INDEX IF NOT EXISTS "AggregatorMerchant_aggregatorId_merchantId_methodId_key" ON "AggregatorMerchant"("aggregatorId", "merchantId", "methodId");
CREATE INDEX IF NOT EXISTS "AggregatorMerchant_aggregatorId_idx" ON "AggregatorMerchant"("aggregatorId");
CREATE INDEX IF NOT EXISTS "AggregatorMerchant_merchantId_idx" ON "AggregatorMerchant"("merchantId");
CREATE INDEX IF NOT EXISTS "AggregatorMerchant_methodId_idx" ON "AggregatorMerchant"("methodId");

-- Создаем индексы для AggregatorMerchantFeeRange
CREATE INDEX IF NOT EXISTS "AggregatorMerchantFeeRange_aggregatorMerchantId_idx" ON "AggregatorMerchantFeeRange"("aggregatorMerchantId");
CREATE INDEX IF NOT EXISTS "AggregatorMerchantFeeRange_minAmount_maxAmount_idx" ON "AggregatorMerchantFeeRange"("minAmount", "maxAmount");

-- Создаем индексы для AggregatorSettlement
CREATE INDEX IF NOT EXISTS "AggregatorSettlement_aggregatorId_idx" ON "AggregatorSettlement"("aggregatorId");
CREATE INDEX IF NOT EXISTS "AggregatorSettlement_date_idx" ON "AggregatorSettlement"("date");
CREATE INDEX IF NOT EXISTS "AggregatorSettlement_direction_idx" ON "AggregatorSettlement"("direction");

-- Добавляем внешние ключи для AggregatorMerchant
ALTER TABLE "AggregatorMerchant" ADD CONSTRAINT "AggregatorMerchant_aggregatorId_fkey" FOREIGN KEY ("aggregatorId") REFERENCES "Aggregator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AggregatorMerchant" ADD CONSTRAINT "AggregatorMerchant_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AggregatorMerchant" ADD CONSTRAINT "AggregatorMerchant_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "Method"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Добавляем внешние ключи для AggregatorMerchantFeeRange
ALTER TABLE "AggregatorMerchantFeeRange" ADD CONSTRAINT "AggregatorMerchantFeeRange_aggregatorMerchantId_fkey" FOREIGN KEY ("aggregatorMerchantId") REFERENCES "AggregatorMerchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Добавляем внешние ключи для AggregatorSettlement
ALTER TABLE "AggregatorSettlement" ADD CONSTRAINT "AggregatorSettlement_aggregatorId_fkey" FOREIGN KEY ("aggregatorId") REFERENCES "Aggregator"("id") ON DELETE CASCADE ON UPDATE CASCADE;