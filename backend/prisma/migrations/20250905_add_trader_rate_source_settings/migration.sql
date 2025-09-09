-- Ensure KkkOperationType enum exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'KkkOperationType') THEN
        CREATE TYPE "KkkOperationType" AS ENUM ('PLUS', 'MINUS');
    END IF;
END
$$;

-- CreateTable
CREATE TABLE "TraderRateSourceSettings" (
    "id" TEXT NOT NULL,
    "traderId" TEXT NOT NULL,
    "rateSourceId" TEXT NOT NULL,
    "customKkkPercent" DOUBLE PRECISION,
    "customKkkOperation" "KkkOperationType" DEFAULT 'MINUS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TraderRateSourceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TraderRateSourceSettings_traderId_rateSourceId_key" ON "TraderRateSourceSettings"("traderId", "rateSourceId");

-- CreateIndex
CREATE INDEX "TraderRateSourceSettings_traderId_idx" ON "TraderRateSourceSettings"("traderId");

-- CreateIndex
CREATE INDEX "TraderRateSourceSettings_rateSourceId_idx" ON "TraderRateSourceSettings"("rateSourceId");

-- AddForeignKey
ALTER TABLE "TraderRateSourceSettings" ADD CONSTRAINT "TraderRateSourceSettings_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraderRateSourceSettings" ADD CONSTRAINT "TraderRateSourceSettings_rateSourceId_fkey" FOREIGN KEY ("rateSourceId") REFERENCES "RateSourceConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
