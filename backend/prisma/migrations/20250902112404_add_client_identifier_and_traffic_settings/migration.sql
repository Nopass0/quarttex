/*
  Warnings:

  - The values [REJECTED,PROCESSED] on the enum `AggregatorDepositStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [RESOLVED,CLOSED] on the enum `DealDisputeStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "TrafficType" AS ENUM ('PRIMARY', 'SECONDARY', 'VIP');

-- AlterEnum
BEGIN;
CREATE TYPE "AggregatorDepositStatus_new" AS ENUM ('PENDING', 'CHECKING', 'CONFIRMED', 'FAILED', 'EXPIRED');
ALTER TABLE "AggregatorDepositRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "AggregatorDepositRequest" ALTER COLUMN "status" TYPE "AggregatorDepositStatus_new" USING ("status"::text::"AggregatorDepositStatus_new");
ALTER TYPE "AggregatorDepositStatus" RENAME TO "AggregatorDepositStatus_old";
ALTER TYPE "AggregatorDepositStatus_new" RENAME TO "AggregatorDepositStatus";
DROP TYPE "AggregatorDepositStatus_old";
ALTER TABLE "AggregatorDepositRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BankType" ADD VALUE 'OTP';
ALTER TYPE "BankType" ADD VALUE 'RNCB';
ALTER TYPE "BankType" ADD VALUE 'RAIFFEISENBANK';
ALTER TYPE "BankType" ADD VALUE 'URALSIBBANK';
ALTER TYPE "BankType" ADD VALUE 'UBRRBANK';
ALTER TYPE "BankType" ADD VALUE 'CIFRABANK';
ALTER TYPE "BankType" ADD VALUE 'DOMRFBANK';
ALTER TYPE "BankType" ADD VALUE 'VTBBANK';
ALTER TYPE "BankType" ADD VALUE 'AKBARSBANK';
ALTER TYPE "BankType" ADD VALUE 'HOMEBANK';
ALTER TYPE "BankType" ADD VALUE 'RENCREDITBANK';
ALTER TYPE "BankType" ADD VALUE 'ZENITBANK';
ALTER TYPE "BankType" ADD VALUE 'RSHBBANK';
ALTER TYPE "BankType" ADD VALUE 'PSBANK';
ALTER TYPE "BankType" ADD VALUE 'RSBANK';
ALTER TYPE "BankType" ADD VALUE 'AVANGARDBANK';
ALTER TYPE "BankType" ADD VALUE 'SOLIDBANK';
ALTER TYPE "BankType" ADD VALUE 'DVBANK';
ALTER TYPE "BankType" ADD VALUE 'UNICREDITBANK';
ALTER TYPE "BankType" ADD VALUE 'CMRBANK';
ALTER TYPE "BankType" ADD VALUE 'SVOIBANK';
ALTER TYPE "BankType" ADD VALUE 'INGOBANK';
ALTER TYPE "BankType" ADD VALUE 'MKBBANK';
ALTER TYPE "BankType" ADD VALUE 'MODULBANK';
ALTER TYPE "BankType" ADD VALUE 'YANDEXBANK';
ALTER TYPE "BankType" ADD VALUE 'UNISTREAMBANK';
ALTER TYPE "BankType" ADD VALUE 'BSPB';
ALTER TYPE "BankType" ADD VALUE 'KUBANKREDIT';
ALTER TYPE "BankType" ADD VALUE 'NOVIKOM';
ALTER TYPE "BankType" ADD VALUE 'AGROROSBANK';
ALTER TYPE "BankType" ADD VALUE 'KLOOKVABANK';
ALTER TYPE "BankType" ADD VALUE 'TKBBANK';
ALTER TYPE "BankType" ADD VALUE 'SNGBBANK';
ALTER TYPE "BankType" ADD VALUE 'ROSTFINANCEBANK';
ALTER TYPE "BankType" ADD VALUE 'AMRABANK';
ALTER TYPE "BankType" ADD VALUE 'METALLINVESTBANK';
ALTER TYPE "BankType" ADD VALUE 'ABRBANK';
ALTER TYPE "BankType" ADD VALUE 'NORVIKBANK';
ALTER TYPE "BankType" ADD VALUE 'AURORABANK';
ALTER TYPE "BankType" ADD VALUE 'ATBBANK';
ALTER TYPE "BankType" ADD VALUE 'SDMBANK';
ALTER TYPE "BankType" ADD VALUE 'MPBANK';
ALTER TYPE "BankType" ADD VALUE 'NSBANK';
ALTER TYPE "BankType" ADD VALUE 'TOCHKA';
ALTER TYPE "BankType" ADD VALUE 'TATSOTSBANK';
ALTER TYPE "BankType" ADD VALUE 'SEVERGAZBANK';
ALTER TYPE "BankType" ADD VALUE 'YOOMONEY';
ALTER TYPE "BankType" ADD VALUE 'SINARABANK';
ALTER TYPE "BankType" ADD VALUE 'CUPISWALLET';
ALTER TYPE "BankType" ADD VALUE 'FINSB';
ALTER TYPE "BankType" ADD VALUE 'BANKDOLINSK';
ALTER TYPE "BankType" ADD VALUE 'UMBANK';
ALTER TYPE "BankType" ADD VALUE 'PSKB';
ALTER TYPE "BankType" ADD VALUE 'EXPOBANK';
ALTER TYPE "BankType" ADD VALUE 'KOSHELEVBANK';
ALTER TYPE "BankType" ADD VALUE 'BANKOFKAZAN';
ALTER TYPE "BankType" ADD VALUE 'NSKBL';
ALTER TYPE "BankType" ADD VALUE 'IPB';
ALTER TYPE "BankType" ADD VALUE 'LOCKOBANK';
ALTER TYPE "BankType" ADD VALUE 'BANKORANGE';
ALTER TYPE "BankType" ADD VALUE 'ABANK';
ALTER TYPE "BankType" ADD VALUE 'ZHIVAGOBANK';
ALTER TYPE "BankType" ADD VALUE 'POIDEMBANK';
ALTER TYPE "BankType" ADD VALUE 'PRIMBANK';
ALTER TYPE "BankType" ADD VALUE 'VBRR';
ALTER TYPE "BankType" ADD VALUE 'GASENERGO';
ALTER TYPE "BankType" ADD VALUE 'BANKKALUGA';
ALTER TYPE "BankType" ADD VALUE 'TENDERBANK';
ALTER TYPE "BankType" ADD VALUE 'MTSDENGI';
ALTER TYPE "BankType" ADD VALUE 'DTB1';
ALTER TYPE "BankType" ADD VALUE 'CHELINVEST';
ALTER TYPE "BankType" ADD VALUE 'AKCEPT';
ALTER TYPE "BankType" ADD VALUE 'AMOBILE';
ALTER TYPE "BankType" ADD VALUE 'PSBST';
ALTER TYPE "BankType" ADD VALUE 'UNITEDBANK';
ALTER TYPE "BankType" ADD VALUE 'BSDBANK';
ALTER TYPE "BankType" ADD VALUE 'DATABANK';
ALTER TYPE "BankType" ADD VALUE 'HLYNOV';
ALTER TYPE "BankType" ADD VALUE 'LANTA';
ALTER TYPE "BankType" ADD VALUE 'NATIONALSTANDARTBANK';
ALTER TYPE "BankType" ADD VALUE 'CREDITURAL';
ALTER TYPE "BankType" ADD VALUE 'TRANSSTROYBANK';
ALTER TYPE "BankType" ADD VALUE 'BANKVL';
ALTER TYPE "BankType" ADD VALUE 'PRIOVTB';
ALTER TYPE "BankType" ADD VALUE 'NICO_BANK';
ALTER TYPE "BankType" ADD VALUE 'ITURUPBANK';
ALTER TYPE "BankType" ADD VALUE 'REALISTBANK';
ALTER TYPE "BankType" ADD VALUE 'AVITO';
ALTER TYPE "BankType" ADD VALUE 'UNIBANK';
ALTER TYPE "BankType" ADD VALUE 'AVTOTORGBANK';
ALTER TYPE "BankType" ADD VALUE 'BANKRMP';
ALTER TYPE "BankType" ADD VALUE 'BGFBANK';
ALTER TYPE "BankType" ADD VALUE 'ENERGOBANK';
ALTER TYPE "BankType" ADD VALUE 'FINAMBANK';
ALTER TYPE "BankType" ADD VALUE 'TAVRICH';
ALTER TYPE "BankType" ADD VALUE 'WILDBERRIES';
ALTER TYPE "BankType" ADD VALUE 'DCTJ';
ALTER TYPE "BankType" ADD VALUE 'CENTRINVEST';
ALTER TYPE "BankType" ADD VALUE 'FINBANK';
ALTER TYPE "BankType" ADD VALUE 'DRIVECLICKBANK';
ALTER TYPE "BankType" ADD VALUE 'KAMKOMBANK';
ALTER TYPE "BankType" ADD VALUE 'ELPLAT';
ALTER TYPE "BankType" ADD VALUE 'BANCAINTESA';
ALTER TYPE "BankType" ADD VALUE 'ICBRU';
ALTER TYPE "BankType" ADD VALUE 'DALENABANK';
ALTER TYPE "BankType" ADD VALUE 'AKIBANK';
ALTER TYPE "BankType" ADD VALUE 'KBHMB';
ALTER TYPE "BankType" ADD VALUE 'ESKHATA';
ALTER TYPE "BankType" ADD VALUE 'SPITAMENBANK';
ALTER TYPE "BankType" ADD VALUE 'ENERGOTRANSBANK';
ALTER TYPE "BankType" ADD VALUE 'ORIENBANK';
ALTER TYPE "BankType" ADD VALUE 'ECONOMBANK';
ALTER TYPE "BankType" ADD VALUE 'ARVANDBANK';
ALTER TYPE "BankType" ADD VALUE 'SOCIUMBANK';
ALTER TYPE "BankType" ADD VALUE 'VLBB';
ALTER TYPE "BankType" ADD VALUE 'BANKSARATOV';
ALTER TYPE "BankType" ADD VALUE 'FORSHTADT';
ALTER TYPE "BankType" ADD VALUE 'EVROFINANCE';
ALTER TYPE "BankType" ADD VALUE 'ANKB';
ALTER TYPE "BankType" ADD VALUE 'CHELINDBANK';
ALTER TYPE "BankType" ADD VALUE 'AMONATBONK';
ALTER TYPE "BankType" ADD VALUE 'EUROALLIANCE';
ALTER TYPE "BankType" ADD VALUE 'INBANK';
ALTER TYPE "BankType" ADD VALUE 'TAWHIDBANK';
ALTER TYPE "BankType" ADD VALUE 'RUSNARBANK';
ALTER TYPE "BankType" ADD VALUE 'M10';
ALTER TYPE "BankType" ADD VALUE 'PUBANK';
ALTER TYPE "BankType" ADD VALUE 'ORBANK';
ALTER TYPE "BankType" ADD VALUE 'BANKELITA';
ALTER TYPE "BankType" ADD VALUE 'GAZTRANSBANK';
ALTER TYPE "BankType" ADD VALUE 'VASL';
ALTER TYPE "BankType" ADD VALUE 'INVB';
ALTER TYPE "BankType" ADD VALUE 'KUZBANK';
ALTER TYPE "BankType" ADD VALUE 'BKTB';
ALTER TYPE "BankType" ADD VALUE 'TKPB';
ALTER TYPE "BankType" ADD VALUE 'VKPAY';
ALTER TYPE "BankType" ADD VALUE 'SOLID';
ALTER TYPE "BankType" ADD VALUE 'MATIN';
ALTER TYPE "BankType" ADD VALUE 'ALBANK';
ALTER TYPE "BankType" ADD VALUE 'KOMPANION';
ALTER TYPE "BankType" ADD VALUE 'BAKAI';
ALTER TYPE "BankType" ADD VALUE 'IBT';
ALTER TYPE "BankType" ADD VALUE 'TELCELL';
ALTER TYPE "BankType" ADD VALUE 'CHBRR';
ALTER TYPE "BankType" ADD VALUE 'ALFABANKBY';
ALTER TYPE "BankType" ADD VALUE 'ALIF';
ALTER TYPE "BankType" ADD VALUE 'MARITIMEBANK';
ALTER TYPE "BankType" ADD VALUE 'HUMOTJ';
ALTER TYPE "BankType" ADD VALUE 'LIFETJ';
ALTER TYPE "BankType" ADD VALUE 'AZIZIMOLIYA';
ALTER TYPE "BankType" ADD VALUE 'FASTSHIFT';
ALTER TYPE "BankType" ADD VALUE 'GARANTBANK';
ALTER TYPE "BankType" ADD VALUE 'THBANK';
ALTER TYPE "BankType" ADD VALUE 'NOVOBANK';
ALTER TYPE "BankType" ADD VALUE 'VTBAM';
ALTER TYPE "BankType" ADD VALUE 'IBAM';
ALTER TYPE "BankType" ADD VALUE 'MONETA';
ALTER TYPE "BankType" ADD VALUE 'OLABANK';
ALTER TYPE "BankType" ADD VALUE 'METCOM';
ALTER TYPE "BankType" ADD VALUE 'ROCKETBANK';
ALTER TYPE "BankType" ADD VALUE 'SBIBANKLLC';
ALTER TYPE "BankType" ADD VALUE 'IPAKYULIBANK';
ALTER TYPE "BankType" ADD VALUE 'MBANK';
ALTER TYPE "BankType" ADD VALUE 'UZUMBANK';

-- AlterEnum
BEGIN;
CREATE TYPE "DealDisputeStatus_new" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED_SUCCESS', 'RESOLVED_FAIL', 'CANCELLED');
ALTER TABLE "AggregatorDispute" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "DealDispute" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "DealDispute" ALTER COLUMN "status" TYPE "DealDisputeStatus_new" USING ("status"::text::"DealDisputeStatus_new");
ALTER TABLE "AggregatorDispute" ALTER COLUMN "status" TYPE "DealDisputeStatus_new" USING ("status"::text::"DealDisputeStatus_new");
ALTER TYPE "DealDisputeStatus" RENAME TO "DealDisputeStatus_old";
ALTER TYPE "DealDisputeStatus_new" RENAME TO "DealDisputeStatus";
DROP TYPE "DealDisputeStatus_old";
ALTER TABLE "AggregatorDispute" ALTER COLUMN "status" SET DEFAULT 'OPEN';
ALTER TABLE "DealDispute" ALTER COLUMN "status" SET DEFAULT 'OPEN';
COMMIT;

-- AlterTable
ALTER TABLE "Aggregator" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "AggregatorDispute" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "AggregatorDisputeMessage" ALTER COLUMN "fileUrls" DROP DEFAULT;

-- AlterTable (conditionally add columns to Merchant if they don't exist)
DO $$
BEGIN
    -- Add auctionBaseUrl if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'Merchant' AND column_name = 'auctionBaseUrl'
    ) THEN
        ALTER TABLE "Merchant" ADD COLUMN "auctionBaseUrl" TEXT;
    END IF;
    
    -- Add externalSystemName if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'Merchant' AND column_name = 'externalSystemName'
    ) THEN
        ALTER TABLE "Merchant" ADD COLUMN "externalSystemName" TEXT;
    END IF;
    
    -- Add isAuctionEnabled if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'Merchant' AND column_name = 'isAuctionEnabled'
    ) THEN
        ALTER TABLE "Merchant" ADD COLUMN "isAuctionEnabled" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    
    -- Add keysGeneratedAt if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'Merchant' AND column_name = 'keysGeneratedAt'
    ) THEN
        ALTER TABLE "Merchant" ADD COLUMN "keysGeneratedAt" TIMESTAMP(3);
    END IF;
    
    -- Add rsaPrivateKeyPem if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'Merchant' AND column_name = 'rsaPrivateKeyPem'
    ) THEN
        ALTER TABLE "Merchant" ADD COLUMN "rsaPrivateKeyPem" TEXT;
    END IF;
    
    -- Add rsaPublicKeyPem if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'Merchant' AND column_name = 'rsaPublicKeyPem'
    ) THEN
        ALTER TABLE "Merchant" ADD COLUMN "rsaPublicKeyPem" TEXT;
    END IF;
    
    -- Add totpEnabled if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'Merchant' AND column_name = 'totpEnabled'
    ) THEN
        ALTER TABLE "Merchant" ADD COLUMN "totpEnabled" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    
    -- Add totpSecret if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'Merchant' AND column_name = 'totpSecret'
    ) THEN
        ALTER TABLE "Merchant" ADD COLUMN "totpSecret" TEXT;
    END IF;
END $$;

-- AlterTable (conditionally add clientIdentifier to Payout if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'Payout' AND column_name = 'clientIdentifier'
    ) THEN
        ALTER TABLE "Payout" ADD COLUMN "clientIdentifier" TEXT;
    END IF;
END $$;

-- AlterTable (conditionally add bybitKkk to RateSetting if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'RateSetting' AND column_name = 'bybitKkk'
    ) THEN
        ALTER TABLE "RateSetting" ADD COLUMN "bybitKkk" DOUBLE PRECISION NOT NULL DEFAULT 0;
    END IF;
END $$;

-- AlterTable (conditionally add rateSource to TraderMerchant if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'TraderMerchant' AND column_name = 'rateSource'
    ) THEN
        ALTER TABLE "TraderMerchant" ADD COLUMN "rateSource" "RateSource";
    END IF;
END $$;

-- AlterTable (conditionally add aggregatorId to Transaction if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'Transaction' AND column_name = 'aggregatorId'
    ) THEN
        ALTER TABLE "Transaction" ADD COLUMN "aggregatorId" TEXT;
    END IF;
END $$;

-- AlterTable (conditionally add columns to User if they don't exist)
DO $$
BEGIN
    -- Add kkkPercent if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'kkkPercent'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "kkkPercent" DOUBLE PRECISION DEFAULT 0;
    END IF;
    
    -- Add rateSource if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'rateSource'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "rateSource" "RateSource";
    END IF;
    
    -- Add rateSourceConfigId if it doesn't exist (this might already exist from add_rate_sources)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'rateSourceConfigId'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "rateSourceConfigId" TEXT;
    END IF;
END $$;

-- CreateTable (conditionally create TrafficSettings if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'TrafficSettings') THEN
        CREATE TABLE "TrafficSettings" (
            "id" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "isEnabled" BOOLEAN NOT NULL DEFAULT false,
            "maxCounterparties" INTEGER NOT NULL DEFAULT 5,
            "trafficType" "TrafficType" NOT NULL DEFAULT 'PRIMARY',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,

            CONSTRAINT "TrafficSettings_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

-- CreateIndex (conditionally create indexes if they don't exist)
DO $$
BEGIN
    -- TrafficSettings_userId_key
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'TrafficSettings_userId_key') THEN
        CREATE UNIQUE INDEX "TrafficSettings_userId_key" ON "TrafficSettings"("userId");
    END IF;
    
    -- Aggregator_email_idx
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Aggregator_email_idx') THEN
        CREATE INDEX "Aggregator_email_idx" ON "Aggregator"("email");
    END IF;
    
    -- Aggregator_apiToken_idx
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Aggregator_apiToken_idx') THEN
        CREATE INDEX "Aggregator_apiToken_idx" ON "Aggregator"("apiToken");
    END IF;
    
    -- Merchant_isAuctionEnabled_idx
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Merchant_isAuctionEnabled_idx') THEN
        CREATE INDEX "Merchant_isAuctionEnabled_idx" ON "Merchant"("isAuctionEnabled");
    END IF;
    
    -- Merchant_externalSystemName_idx
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Merchant_externalSystemName_idx') THEN
        CREATE INDEX "Merchant_externalSystemName_idx" ON "Merchant"("externalSystemName");
    END IF;
    
    -- Payout_merchantId_clientIdentifier_idx
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Payout_merchantId_clientIdentifier_idx') THEN
        CREATE INDEX "Payout_merchantId_clientIdentifier_idx" ON "Payout"("merchantId", "clientIdentifier");
    END IF;
END $$;

-- AddForeignKey (conditionally add foreign keys if they don't exist)
DO $$
BEGIN
    -- User_rateSourceConfigId_fkey (might already exist from add_rate_sources)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_rateSourceConfigId_fkey') THEN
        ALTER TABLE "User" ADD CONSTRAINT "User_rateSourceConfigId_fkey" FOREIGN KEY ("rateSourceConfigId") REFERENCES "RateSourceConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    -- Transaction_aggregatorId_fkey
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Transaction_aggregatorId_fkey') THEN
        ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_aggregatorId_fkey" FOREIGN KEY ("aggregatorId") REFERENCES "Aggregator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    -- MerchantRateSource_merchantId_fkey (might already exist from add_rate_sources)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MerchantRateSource_merchantId_fkey') THEN
        ALTER TABLE "MerchantRateSource" ADD CONSTRAINT "MerchantRateSource_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    -- TrafficSettings_userId_fkey
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TrafficSettings_userId_fkey') THEN
        ALTER TABLE "TrafficSettings" ADD CONSTRAINT "TrafficSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    -- AggregatorDispute_transactionId_fkey
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AggregatorDispute_transactionId_fkey') THEN
        ALTER TABLE "AggregatorDispute" ADD CONSTRAINT "AggregatorDispute_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    -- AggregatorDispute_merchantId_fkey
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AggregatorDispute_merchantId_fkey') THEN
        ALTER TABLE "AggregatorDispute" ADD CONSTRAINT "AggregatorDispute_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    -- AggregatorCallbackLog_transactionId_fkey
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AggregatorCallbackLog_transactionId_fkey') THEN
        ALTER TABLE "AggregatorCallbackLog" ADD CONSTRAINT "AggregatorCallbackLog_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
