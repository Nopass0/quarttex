-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Idempotent backfill and constraint for Aggregator.callbackToken
DO $$
BEGIN
  IF to_regclass('"Aggregator"') IS NOT NULL THEN
    -- Add column if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'Aggregator' AND column_name = 'callbackToken'
    ) THEN
      ALTER TABLE "Aggregator" ADD COLUMN "callbackToken" TEXT;
    END IF;

    -- Backfill for NULL values
    UPDATE "Aggregator"
    SET "callbackToken" = COALESCE(
      "callbackToken",
      md5(uuid_generate_v4()::text || '-' || now()::text || '-' || coalesce("email", ''))
    )
    WHERE "callbackToken" IS NULL;

    -- Add constraints/indexes
    BEGIN
      ALTER TABLE "Aggregator" ALTER COLUMN "callbackToken" SET NOT NULL;
    EXCEPTION WHEN others THEN
      -- Ignore if already NOT NULL
      NULL;
    END;

    CREATE UNIQUE INDEX IF NOT EXISTS "Aggregator_callbackToken_key" ON "Aggregator"("callbackToken");
    CREATE INDEX IF NOT EXISTS "Aggregator_callbackToken_idx" ON "Aggregator"("callbackToken");
  END IF;
END $$;


