CREATE TABLE IF NOT EXISTS "PayoutCallbackHistory" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "response" TEXT,
    "statusCode" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayoutCallbackHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PayoutCallbackHistory_payoutId_idx" ON "PayoutCallbackHistory"("payoutId");
CREATE INDEX IF NOT EXISTS "PayoutCallbackHistory_createdAt_idx" ON "PayoutCallbackHistory"("createdAt" DESC);

DO $$ BEGIN
    ALTER TABLE "PayoutCallbackHistory" ADD CONSTRAINT "PayoutCallbackHistory_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
