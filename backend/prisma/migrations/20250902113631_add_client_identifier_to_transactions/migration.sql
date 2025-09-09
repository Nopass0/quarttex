-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "clientIdentifier" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_merchantId_clientIdentifier_idx" ON "Transaction"("merchantId", "clientIdentifier");
