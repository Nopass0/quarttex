-- AlterTable
ALTER TABLE "TraderMerchant" ADD COLUMN     "useFlexibleRates" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TraderMerchantFeeRange" (
    "id" TEXT NOT NULL,
    "traderMerchantId" TEXT NOT NULL,
    "minAmount" DOUBLE PRECISION NOT NULL,
    "maxAmount" DOUBLE PRECISION NOT NULL,
    "feeInPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "feeOutPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TraderMerchantFeeRange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TraderMerchantFeeRange_traderMerchantId_idx" ON "TraderMerchantFeeRange"("traderMerchantId");

-- CreateIndex
CREATE INDEX "TraderMerchantFeeRange_minAmount_maxAmount_idx" ON "TraderMerchantFeeRange"("minAmount", "maxAmount");

-- AddForeignKey
ALTER TABLE "TraderMerchantFeeRange" ADD CONSTRAINT "TraderMerchantFeeRange_traderMerchantId_fkey" FOREIGN KEY ("traderMerchantId") REFERENCES "TraderMerchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
