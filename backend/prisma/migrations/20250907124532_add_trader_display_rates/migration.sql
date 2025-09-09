-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "backupCodes" TEXT[],
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorSecret" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "displayAmountFrom" DOUBLE PRECISION,
ADD COLUMN     "displayAmountTo" DOUBLE PRECISION,
ADD COLUMN     "displayStakePercent" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "TraderDisplayRate" (
    "id" TEXT NOT NULL,
    "traderId" TEXT NOT NULL,
    "stakePercent" DOUBLE PRECISION NOT NULL,
    "amountFrom" DOUBLE PRECISION NOT NULL,
    "amountTo" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TraderDisplayRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TraderDisplayRate_traderId_idx" ON "TraderDisplayRate"("traderId");

-- CreateIndex
CREATE INDEX "TraderDisplayRate_sortOrder_idx" ON "TraderDisplayRate"("sortOrder");

-- AddForeignKey
ALTER TABLE "TraderDisplayRate" ADD CONSTRAINT "TraderDisplayRate_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
