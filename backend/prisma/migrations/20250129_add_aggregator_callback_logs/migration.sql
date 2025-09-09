-- Добавляем поле fileUrls в AggregatorDisputeMessage (если таблица существует и колонки нет)
DO $$
BEGIN
    IF to_regclass('"AggregatorDisputeMessage"') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'AggregatorDisputeMessage' AND column_name = 'fileUrls'
    ) THEN
        EXECUTE 'ALTER TABLE "AggregatorDisputeMessage" ADD COLUMN "fileUrls" TEXT[] DEFAULT ARRAY[]::TEXT[]';
    END IF;
END $$;

-- Создаем таблицу для логирования callback'ов агрегаторов (если не существует)
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

-- Создаем индексы (если не существуют)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'AggregatorCallbackLog_aggregatorId_idx' AND n.nspname = 'public'
    ) THEN
        CREATE INDEX "AggregatorCallbackLog_aggregatorId_idx" ON "AggregatorCallbackLog"("aggregatorId");
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'AggregatorCallbackLog_transactionId_idx' AND n.nspname = 'public'
    ) THEN
        CREATE INDEX "AggregatorCallbackLog_transactionId_idx" ON "AggregatorCallbackLog"("transactionId");
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'AggregatorCallbackLog_createdAt_idx' AND n.nspname = 'public'
    ) THEN
        CREATE INDEX "AggregatorCallbackLog_createdAt_idx" ON "AggregatorCallbackLog"("createdAt" DESC);
    END IF;
END $$;

-- Добавляем внешние ключи (если таблицы существуют и ограничений нет)
DO $$
BEGIN
    IF to_regclass('"AggregatorCallbackLog"') IS NOT NULL AND to_regclass('"Aggregator"') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AggregatorCallbackLog_aggregatorId_fkey'
    ) THEN
        ALTER TABLE "AggregatorCallbackLog" ADD CONSTRAINT "AggregatorCallbackLog_aggregatorId_fkey" 
            FOREIGN KEY ("aggregatorId") REFERENCES "Aggregator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF to_regclass('"AggregatorCallbackLog"') IS NOT NULL AND to_regclass('"Transaction"') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AggregatorCallbackLog_transactionId_fkey'
    ) THEN
        ALTER TABLE "AggregatorCallbackLog" ADD CONSTRAINT "AggregatorCallbackLog_transactionId_fkey" 
            FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;














