-- Drop the existing TransactionAttempt table and recreate it with correct structure
DROP TABLE IF EXISTS "TransactionAttempt" CASCADE;

-- CreateTable with correct structure matching Prisma schema
CREATE TABLE "TransactionAttempt" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "methodId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransactionAttempt_merchantId_idx" ON "TransactionAttempt"("merchantId");
CREATE INDEX "TransactionAttempt_createdAt_idx" ON "TransactionAttempt"("createdAt");

-- AddForeignKey
ALTER TABLE "TransactionAttempt" ADD CONSTRAINT "TransactionAttempt_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey  
ALTER TABLE "TransactionAttempt" ADD CONSTRAINT "TransactionAttempt_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "Method"("id") ON DELETE RESTRICT ON UPDATE CASCADE;