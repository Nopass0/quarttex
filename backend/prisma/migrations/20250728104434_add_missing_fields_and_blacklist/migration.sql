-- AlterTable
ALTER TABLE "SettleRequest" ADD COLUMN     "amountUsdt" DOUBLE PRECISION,
ADD COLUMN     "rate" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "PayoutBlacklist" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "traderId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayoutBlacklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayoutBlacklist_payoutId_idx" ON "PayoutBlacklist"("payoutId");

-- CreateIndex
CREATE INDEX "PayoutBlacklist_traderId_idx" ON "PayoutBlacklist"("traderId");

-- CreateIndex
CREATE UNIQUE INDEX "PayoutBlacklist_payoutId_traderId_key" ON "PayoutBlacklist"("payoutId", "traderId");

-- AddForeignKey
ALTER TABLE "PayoutBlacklist" ADD CONSTRAINT "PayoutBlacklist_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
