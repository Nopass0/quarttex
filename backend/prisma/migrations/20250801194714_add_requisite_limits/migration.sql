/*
  Warnings:

  - You are about to drop the column `dailyLimit` on the `BankDetail` table. All the data in the column will be lost.
  - You are about to drop the column `dailyTraffic` on the `BankDetail` table. All the data in the column will be lost.
  - You are about to drop the column `maxCountTransactions` on the `BankDetail` table. All the data in the column will be lost.
  - You are about to drop the column `monthlyLimit` on the `BankDetail` table. All the data in the column will be lost.
  - You are about to drop the column `monthlyTraffic` on the `BankDetail` table. All the data in the column will be lost.

*/
-- AlterTable
DO $$ BEGIN
    BEGIN
        ALTER TABLE "BankDetail" DROP COLUMN "dailyLimit";
    EXCEPTION WHEN undefined_column THEN NULL; END;
    BEGIN
        ALTER TABLE "BankDetail" DROP COLUMN "dailyTraffic";
    EXCEPTION WHEN undefined_column THEN NULL; END;
    BEGIN
        ALTER TABLE "BankDetail" DROP COLUMN "maxCountTransactions";
    EXCEPTION WHEN undefined_column THEN NULL; END;
    BEGIN
        ALTER TABLE "BankDetail" DROP COLUMN "monthlyLimit";
    EXCEPTION WHEN undefined_column THEN NULL; END;
    BEGIN
        ALTER TABLE "BankDetail" DROP COLUMN "monthlyTraffic";
    EXCEPTION WHEN undefined_column THEN NULL; END;
    BEGIN
        ALTER TABLE "BankDetail" ADD COLUMN "currentTotalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN
        ALTER TABLE "BankDetail" ADD COLUMN "maxActiveTransactions" INTEGER NOT NULL DEFAULT 5;
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN
        ALTER TABLE "BankDetail" ADD COLUMN "operationLimit" INTEGER NOT NULL DEFAULT 0;
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN
        ALTER TABLE "BankDetail" ADD COLUMN "sumLimit" DOUBLE PRECISION NOT NULL DEFAULT 0;
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN
        ALTER TABLE "BankDetail" ADD COLUMN "totalAmountLimit" DOUBLE PRECISION NOT NULL DEFAULT 0;
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN
        ALTER TABLE "BankDetail" ADD COLUMN "transactionLimit" INTEGER NOT NULL DEFAULT 0;
    EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;
