-- CreateTable
CREATE TABLE "PayoutCancellationHistory" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "traderId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayoutCancellationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayoutCancellationHistory_payoutId_idx" ON "PayoutCancellationHistory"("payoutId");

-- CreateIndex
CREATE INDEX "PayoutCancellationHistory_traderId_idx" ON "PayoutCancellationHistory"("traderId");

-- CreateIndex
CREATE INDEX "PayoutCancellationHistory_createdAt_idx" ON "PayoutCancellationHistory"("createdAt");

-- AddForeignKey
ALTER TABLE "PayoutCancellationHistory" ADD CONSTRAINT "PayoutCancellationHistory_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutCancellationHistory" ADD CONSTRAINT "PayoutCancellationHistory_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
