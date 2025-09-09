-- Add aggregator mode fields to Merchant table
ALTER TABLE "Merchant" 
ADD COLUMN IF NOT EXISTS "isAggregatorMode" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "externalApiToken" TEXT,
ADD COLUMN IF NOT EXISTS "externalCallbackToken" TEXT;

-- Add unique constraint for externalApiToken
ALTER TABLE "Merchant" 
ADD CONSTRAINT "Merchant_externalApiToken_key" UNIQUE ("externalApiToken");

-- Add unique constraint for customApiToken in Aggregator if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Aggregator_customApiToken_key'
    ) THEN
        ALTER TABLE "Aggregator" 
        ADD CONSTRAINT "Aggregator_customApiToken_key" UNIQUE ("customApiToken");
    END IF;
END $$;