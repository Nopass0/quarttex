-- Fix Chase compatible aggregators configuration
-- This migration ensures proper configuration for Chase-compatible aggregators

-- Update maxSlaMs default to 2000ms (2 seconds) for better performance
ALTER TABLE "Aggregator" ALTER COLUMN "maxSlaMs" SET DEFAULT 2000;

-- Add comment to clarify the SLA timeout
COMMENT ON COLUMN "Aggregator"."maxSlaMs" IS 'Maximum response time in milliseconds (SLA) - 2 seconds default';

-- Ensure isChaseCompatible and isChaseProject columns exist with proper defaults
-- (These should already exist based on the schema, but ensuring they have correct defaults)
ALTER TABLE "Aggregator" ALTER COLUMN "isChaseCompatible" SET DEFAULT false;
ALTER TABLE "Aggregator" ALTER COLUMN "isChaseProject" SET DEFAULT false;

-- Add comments to clarify the purpose of these columns
COMMENT ON COLUMN "Aggregator"."isChaseCompatible" IS 'Flag for Chase API compatibility (for platform clones)';
COMMENT ON COLUMN "Aggregator"."isChaseProject" IS 'Flag indicating this is another Chase instance';

-- Update any existing Chase-compatible aggregators to have proper timeout
-- (This is safe as it only updates the timeout, not data)
UPDATE "Aggregator" 
SET "maxSlaMs" = 30000 
WHERE "isChaseCompatible" = true 
  AND "apiBaseUrl" LIKE '%quattrex.pro%';

-- Add index for better performance on Chase-compatible aggregators
CREATE INDEX IF NOT EXISTS "idx_aggregator_chase_compatible" 
ON "Aggregator" ("isChaseCompatible", "isActive") 
WHERE "isChaseCompatible" = true;

-- Add index for better performance on aggregator API base URL lookups
CREATE INDEX IF NOT EXISTS "idx_aggregator_api_base_url" 
ON "Aggregator" ("apiBaseUrl", "isActive") 
WHERE "apiBaseUrl" IS NOT NULL;

