-- Add new balance fields to Aggregator table
ALTER TABLE "Aggregator" 
  ADD COLUMN IF NOT EXISTS "depositUsdt" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "balanceNoRequisite" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "balanceSuccess" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "balanceExpired" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalPlatformProfit" DOUBLE PRECISION DEFAULT 0;

-- Create index on depositUsdt for filtering aggregators with minimum deposit
CREATE INDEX IF NOT EXISTS "Aggregator_depositUsdt_idx" ON "Aggregator"("depositUsdt");

-- Create AggregatorMethodFee table
CREATE TABLE IF NOT EXISTS "AggregatorMethodFee" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "aggregatorId" TEXT NOT NULL,
  "methodId" TEXT NOT NULL,
  "feePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "AggregatorMethodFee_aggregatorId_fkey" 
    FOREIGN KEY ("aggregatorId") REFERENCES "Aggregator"("id") ON DELETE CASCADE,
  CONSTRAINT "AggregatorMethodFee_methodId_fkey" 
    FOREIGN KEY ("methodId") REFERENCES "Method"("id") ON DELETE RESTRICT
);

-- Create unique constraint for aggregatorId and methodId combination
CREATE UNIQUE INDEX IF NOT EXISTS "AggregatorMethodFee_aggregatorId_methodId_key" 
  ON "AggregatorMethodFee"("aggregatorId", "methodId");

-- Create indexes
CREATE INDEX IF NOT EXISTS "AggregatorMethodFee_aggregatorId_idx" ON "AggregatorMethodFee"("aggregatorId");
CREATE INDEX IF NOT EXISTS "AggregatorMethodFee_methodId_idx" ON "AggregatorMethodFee"("methodId");

-- Create AggregatorRateSource table
CREATE TABLE IF NOT EXISTS "AggregatorRateSource" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "aggregatorId" TEXT NOT NULL,
  "rateSourceId" TEXT NOT NULL,
  "kkkPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "kkkOperation" TEXT NOT NULL DEFAULT 'MINUS',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "AggregatorRateSource_aggregatorId_fkey" 
    FOREIGN KEY ("aggregatorId") REFERENCES "Aggregator"("id") ON DELETE CASCADE,
  CONSTRAINT "AggregatorRateSource_rateSourceId_fkey" 
    FOREIGN KEY ("rateSourceId") REFERENCES "RateSourceConfig"("id") ON DELETE RESTRICT
);

-- Create unique constraint for aggregatorId
CREATE UNIQUE INDEX IF NOT EXISTS "AggregatorRateSource_aggregatorId_key" 
  ON "AggregatorRateSource"("aggregatorId");

-- Create indexes
CREATE INDEX IF NOT EXISTS "AggregatorRateSource_aggregatorId_idx" ON "AggregatorRateSource"("aggregatorId");
CREATE INDEX IF NOT EXISTS "AggregatorRateSource_rateSourceId_idx" ON "AggregatorRateSource"("rateSourceId");