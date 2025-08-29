-- Создание enum для направления интеграции (если не существует)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IntegrationDirection') THEN
        CREATE TYPE "IntegrationDirection" AS ENUM ('IN', 'OUT');
    END IF;
END $$;

-- Создание enum для статуса депозита агрегатора (если не существует)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AggregatorDepositStatus') THEN
        CREATE TYPE "AggregatorDepositStatus" AS ENUM ('PENDING', 'CHECKING', 'CONFIRMED', 'REJECTED', 'PROCESSED');
    END IF;
END $$;

-- Создание enum для статуса спора (если не существует)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DealDisputeStatus') THEN
        CREATE TYPE "DealDisputeStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
    END IF;
END $$;

-- Создание enum для типа отправителя сообщения в споре (если не существует)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DisputeSenderType') THEN
        CREATE TYPE "DisputeSenderType" AS ENUM ('AGGREGATOR', 'ADMIN');
    ELSE
        -- Добавляем значение AGGREGATOR если enum уже существует
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DisputeSenderType') AND enumlabel = 'AGGREGATOR') THEN
            ALTER TYPE "DisputeSenderType" ADD VALUE 'AGGREGATOR';
        END IF;
    END IF;
END $$;

-- Создание таблицы Aggregator
CREATE TABLE IF NOT EXISTS "Aggregator" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiToken" TEXT NOT NULL,
    "callbackToken" TEXT NOT NULL,
    "apiBaseUrl" TEXT,
    "balanceUsdt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "maxSlaMs" INTEGER NOT NULL DEFAULT 2000,
    "minBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxDailyVolume" DOUBLE PRECISION,
    "currentDailyVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastVolumeReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "twoFactorSecret" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPriorityChangeBy" TEXT,
    "lastPriorityChangeAt" TIMESTAMP(3),

    CONSTRAINT "Aggregator_pkey" PRIMARY KEY ("id")
);

-- Создание уникальных индексов для Aggregator
CREATE UNIQUE INDEX IF NOT EXISTS "Aggregator_email_key" ON "Aggregator"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Aggregator_apiToken_key" ON "Aggregator"("apiToken");
CREATE UNIQUE INDEX IF NOT EXISTS "Aggregator_callbackToken_key" ON "Aggregator"("callbackToken");

-- Создание обычных индексов для Aggregator
CREATE INDEX IF NOT EXISTS "Aggregator_callbackToken_idx" ON "Aggregator"("callbackToken");
CREATE INDEX IF NOT EXISTS "Aggregator_priority_idx" ON "Aggregator"("priority");
CREATE INDEX IF NOT EXISTS "Aggregator_isActive_idx" ON "Aggregator"("isActive");

-- Создание таблицы AggregatorSession
CREATE TABLE IF NOT EXISTS "AggregatorSession" (
    "id" TEXT NOT NULL,
    "aggregatorId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AggregatorSession_pkey" PRIMARY KEY ("id")
);

-- Создание индексов для AggregatorSession
CREATE UNIQUE INDEX IF NOT EXISTS "AggregatorSession_token_key" ON "AggregatorSession"("token");
CREATE INDEX IF NOT EXISTS "AggregatorSession_aggregatorId_idx" ON "AggregatorSession"("aggregatorId");
CREATE INDEX IF NOT EXISTS "AggregatorSession_token_idx" ON "AggregatorSession"("token");

-- Создание таблицы AggregatorDepositRequest
CREATE TABLE IF NOT EXISTS "AggregatorDepositRequest" (
    "id" TEXT NOT NULL,
    "aggregatorId" TEXT NOT NULL,
    "amountUSDT" DOUBLE PRECISION NOT NULL,
    "address" TEXT NOT NULL,
    "status" "AggregatorDepositStatus" NOT NULL DEFAULT 'PENDING',
    "txHash" TEXT,
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "AggregatorDepositRequest_pkey" PRIMARY KEY ("id")
);

-- Создание индексов для AggregatorDepositRequest
CREATE INDEX IF NOT EXISTS "AggregatorDepositRequest_aggregatorId_idx" ON "AggregatorDepositRequest"("aggregatorId");
CREATE INDEX IF NOT EXISTS "AggregatorDepositRequest_status_idx" ON "AggregatorDepositRequest"("status");

-- Создание таблицы AggregatorDispute
CREATE TABLE IF NOT EXISTS "AggregatorDispute" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "aggregatorId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "status" "DealDisputeStatus" NOT NULL DEFAULT 'OPEN',
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "AggregatorDispute_pkey" PRIMARY KEY ("id")
);

-- Создание индексов для AggregatorDispute
CREATE INDEX IF NOT EXISTS "AggregatorDispute_transactionId_idx" ON "AggregatorDispute"("transactionId");
CREATE INDEX IF NOT EXISTS "AggregatorDispute_aggregatorId_idx" ON "AggregatorDispute"("aggregatorId");
CREATE INDEX IF NOT EXISTS "AggregatorDispute_status_idx" ON "AggregatorDispute"("status");

-- Создание таблицы AggregatorDisputeMessage
CREATE TABLE IF NOT EXISTS "AggregatorDisputeMessage" (
    "id" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderType" "DisputeSenderType" NOT NULL,
    "message" TEXT NOT NULL,
    "fileUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AggregatorDisputeMessage_pkey" PRIMARY KEY ("id")
);

-- Создание индексов для AggregatorDisputeMessage
CREATE INDEX IF NOT EXISTS "AggregatorDisputeMessage_disputeId_idx" ON "AggregatorDisputeMessage"("disputeId");

-- Создание таблицы AggregatorApiLog
CREATE TABLE IF NOT EXISTS "AggregatorApiLog" (
    "id" TEXT NOT NULL,
    "aggregatorId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "requestData" JSONB,
    "responseData" JSONB,
    "statusCode" INTEGER,
    "error" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AggregatorApiLog_pkey" PRIMARY KEY ("id")
);

-- Создание индексов для AggregatorApiLog
CREATE INDEX IF NOT EXISTS "AggregatorApiLog_aggregatorId_idx" ON "AggregatorApiLog"("aggregatorId");
CREATE INDEX IF NOT EXISTS "AggregatorApiLog_createdAt_idx" ON "AggregatorApiLog"("createdAt");

-- Создание таблицы AggregatorCallbackLog
CREATE TABLE IF NOT EXISTS "AggregatorCallbackLog" (
    "id" TEXT NOT NULL,
    "aggregatorId" TEXT NOT NULL,
    "transactionId" TEXT,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "response" TEXT,
    "statusCode" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AggregatorCallbackLog_pkey" PRIMARY KEY ("id")
);

-- Создание индексов для AggregatorCallbackLog
CREATE INDEX IF NOT EXISTS "AggregatorCallbackLog_aggregatorId_idx" ON "AggregatorCallbackLog"("aggregatorId");
CREATE INDEX IF NOT EXISTS "AggregatorCallbackLog_transactionId_idx" ON "AggregatorCallbackLog"("transactionId");
CREATE INDEX IF NOT EXISTS "AggregatorCallbackLog_createdAt_idx" ON "AggregatorCallbackLog"("createdAt" DESC);

-- Создание таблицы AggregatorIntegrationLog
CREATE TABLE IF NOT EXISTS "AggregatorIntegrationLog" (
    "id" TEXT NOT NULL,
    "aggregatorId" TEXT NOT NULL,
    "direction" "IntegrationDirection" NOT NULL,
    "eventType" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "headers" JSONB NOT NULL,
    "requestBody" JSONB,
    "responseBody" JSONB,
    "statusCode" INTEGER,
    "responseTimeMs" INTEGER,
    "slaViolation" BOOLEAN NOT NULL DEFAULT false,
    "idempotencyKey" TEXT,
    "ourDealId" TEXT,
    "partnerDealId" TEXT,
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AggregatorIntegrationLog_pkey" PRIMARY KEY ("id")
);

-- Создание индексов для AggregatorIntegrationLog
CREATE INDEX IF NOT EXISTS "AggregatorIntegrationLog_aggregatorId_idx" ON "AggregatorIntegrationLog"("aggregatorId");
CREATE INDEX IF NOT EXISTS "AggregatorIntegrationLog_direction_idx" ON "AggregatorIntegrationLog"("direction");
CREATE INDEX IF NOT EXISTS "AggregatorIntegrationLog_eventType_idx" ON "AggregatorIntegrationLog"("eventType");
CREATE INDEX IF NOT EXISTS "AggregatorIntegrationLog_ourDealId_idx" ON "AggregatorIntegrationLog"("ourDealId");
CREATE INDEX IF NOT EXISTS "AggregatorIntegrationLog_partnerDealId_idx" ON "AggregatorIntegrationLog"("partnerDealId");
CREATE INDEX IF NOT EXISTS "AggregatorIntegrationLog_createdAt_idx" ON "AggregatorIntegrationLog"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "AggregatorIntegrationLog_slaViolation_idx" ON "AggregatorIntegrationLog"("slaViolation");

-- Добавление внешних ключей (только если соответствующие таблицы существуют)
DO $$
BEGIN
    -- AggregatorSession -> Aggregator
    IF to_regclass('"AggregatorSession"') IS NOT NULL AND to_regclass('"Aggregator"') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AggregatorSession_aggregatorId_fkey'
    ) THEN
        ALTER TABLE "AggregatorSession" ADD CONSTRAINT "AggregatorSession_aggregatorId_fkey" 
            FOREIGN KEY ("aggregatorId") REFERENCES "Aggregator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- AggregatorDepositRequest -> Aggregator
    IF to_regclass('"AggregatorDepositRequest"') IS NOT NULL AND to_regclass('"Aggregator"') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AggregatorDepositRequest_aggregatorId_fkey'
    ) THEN
        ALTER TABLE "AggregatorDepositRequest" ADD CONSTRAINT "AggregatorDepositRequest_aggregatorId_fkey" 
            FOREIGN KEY ("aggregatorId") REFERENCES "Aggregator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- AggregatorDispute -> Aggregator
    IF to_regclass('"AggregatorDispute"') IS NOT NULL AND to_regclass('"Aggregator"') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AggregatorDispute_aggregatorId_fkey'
    ) THEN
        ALTER TABLE "AggregatorDispute" ADD CONSTRAINT "AggregatorDispute_aggregatorId_fkey" 
            FOREIGN KEY ("aggregatorId") REFERENCES "Aggregator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    -- AggregatorDispute -> Transaction (если таблица Transaction существует)
    IF to_regclass('"AggregatorDispute"') IS NOT NULL AND to_regclass('"Transaction"') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AggregatorDispute_transactionId_fkey'
    ) THEN
        ALTER TABLE "AggregatorDispute" ADD CONSTRAINT "AggregatorDispute_transactionId_fkey" 
            FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    -- AggregatorDispute -> Merchant (если таблица Merchant существует)
    IF to_regclass('"AggregatorDispute"') IS NOT NULL AND to_regclass('"Merchant"') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AggregatorDispute_merchantId_fkey'
    ) THEN
        ALTER TABLE "AggregatorDispute" ADD CONSTRAINT "AggregatorDispute_merchantId_fkey" 
            FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    -- AggregatorDisputeMessage -> AggregatorDispute
    IF to_regclass('"AggregatorDisputeMessage"') IS NOT NULL AND to_regclass('"AggregatorDispute"') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AggregatorDisputeMessage_disputeId_fkey'
    ) THEN
        ALTER TABLE "AggregatorDisputeMessage" ADD CONSTRAINT "AggregatorDisputeMessage_disputeId_fkey" 
            FOREIGN KEY ("disputeId") REFERENCES "AggregatorDispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- AggregatorApiLog -> Aggregator
    IF to_regclass('"AggregatorApiLog"') IS NOT NULL AND to_regclass('"Aggregator"') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AggregatorApiLog_aggregatorId_fkey'
    ) THEN
        ALTER TABLE "AggregatorApiLog" ADD CONSTRAINT "AggregatorApiLog_aggregatorId_fkey" 
            FOREIGN KEY ("aggregatorId") REFERENCES "Aggregator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    -- AggregatorCallbackLog -> Aggregator
    IF to_regclass('"AggregatorCallbackLog"') IS NOT NULL AND to_regclass('"Aggregator"') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AggregatorCallbackLog_aggregatorId_fkey'
    ) THEN
        ALTER TABLE "AggregatorCallbackLog" ADD CONSTRAINT "AggregatorCallbackLog_aggregatorId_fkey" 
            FOREIGN KEY ("aggregatorId") REFERENCES "Aggregator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    -- AggregatorCallbackLog -> Transaction (если таблица Transaction существует)
    IF to_regclass('"AggregatorCallbackLog"') IS NOT NULL AND to_regclass('"Transaction"') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AggregatorCallbackLog_transactionId_fkey'
    ) THEN
        ALTER TABLE "AggregatorCallbackLog" ADD CONSTRAINT "AggregatorCallbackLog_transactionId_fkey" 
            FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- AggregatorIntegrationLog -> Aggregator
    IF to_regclass('"AggregatorIntegrationLog"') IS NOT NULL AND to_regclass('"Aggregator"') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AggregatorIntegrationLog_aggregatorId_fkey'
    ) THEN
        ALTER TABLE "AggregatorIntegrationLog" ADD CONSTRAINT "AggregatorIntegrationLog_aggregatorId_fkey" 
            FOREIGN KEY ("aggregatorId") REFERENCES "Aggregator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
