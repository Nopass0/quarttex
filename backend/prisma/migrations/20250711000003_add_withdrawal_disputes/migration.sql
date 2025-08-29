-- CreateEnum (если не существует)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WithdrawalDisputeStatus') THEN
        CREATE TYPE "WithdrawalDisputeStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED_SUCCESS', 'RESOLVED_FAIL', 'CANCELLED');
    END IF;
END $$;

-- CreateEnum или расширение существующего
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DisputeSenderType') THEN
        CREATE TYPE "DisputeSenderType" AS ENUM ('MERCHANT', 'TRADER', 'ADMIN');
    ELSE
        -- Добавляем недостающие значения если enum уже существует
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DisputeSenderType') AND enumlabel = 'MERCHANT') THEN
            ALTER TYPE "DisputeSenderType" ADD VALUE 'MERCHANT';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DisputeSenderType') AND enumlabel = 'TRADER') THEN
            ALTER TYPE "DisputeSenderType" ADD VALUE 'TRADER';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DisputeSenderType') AND enumlabel = 'ADMIN') THEN
            ALTER TYPE "DisputeSenderType" ADD VALUE 'ADMIN';
        END IF;
    END IF;
END $$;

-- CreateTable
CREATE TABLE "WithdrawalDispute" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "traderId" TEXT NOT NULL,
    "status" "WithdrawalDisputeStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,

    CONSTRAINT "WithdrawalDispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WithdrawalDisputeMessage" (
    "id" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderType" "DisputeSenderType" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WithdrawalDisputeMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WithdrawalDisputeFile" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WithdrawalDisputeFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WithdrawalDispute_payoutId_idx" ON "WithdrawalDispute"("payoutId");

-- CreateIndex
CREATE INDEX "WithdrawalDispute_merchantId_idx" ON "WithdrawalDispute"("merchantId");

-- CreateIndex
CREATE INDEX "WithdrawalDispute_traderId_idx" ON "WithdrawalDispute"("traderId");

-- CreateIndex
CREATE INDEX "WithdrawalDispute_status_idx" ON "WithdrawalDispute"("status");

-- CreateIndex
CREATE INDEX "WithdrawalDisputeMessage_disputeId_idx" ON "WithdrawalDisputeMessage"("disputeId");

-- CreateIndex
CREATE INDEX "WithdrawalDisputeMessage_createdAt_idx" ON "WithdrawalDisputeMessage"("createdAt");

-- CreateIndex
CREATE INDEX "WithdrawalDisputeFile_messageId_idx" ON "WithdrawalDisputeFile"("messageId");

-- AddForeignKey
ALTER TABLE "WithdrawalDispute" ADD CONSTRAINT "WithdrawalDispute_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalDispute" ADD CONSTRAINT "WithdrawalDispute_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalDispute" ADD CONSTRAINT "WithdrawalDispute_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalDisputeMessage" ADD CONSTRAINT "WithdrawalDisputeMessage_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "WithdrawalDispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalDisputeFile" ADD CONSTRAINT "WithdrawalDisputeFile_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "WithdrawalDisputeMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;