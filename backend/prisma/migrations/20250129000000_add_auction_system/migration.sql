-- Добавление полей для аукционной системы к таблице Merchant
-- Проверяем существование таблицы и добавляем колонки только если они не существуют

DO $$ 
BEGIN
    -- Проверяем существование таблицы Merchant
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Merchant') THEN
        -- Добавляем колонку isAuctionEnabled если она не существует
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'Merchant' AND column_name = 'isAuctionEnabled') THEN
            ALTER TABLE "Merchant" ADD COLUMN "isAuctionEnabled" BOOLEAN NOT NULL DEFAULT false;
        END IF;

        -- Добавляем колонку auctionBaseUrl если она не существует
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'Merchant' AND column_name = 'auctionBaseUrl') THEN
            ALTER TABLE "Merchant" ADD COLUMN "auctionBaseUrl" TEXT;
        END IF;

        -- Добавляем колонку rsaPublicKeyPem если она не существует
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'Merchant' AND column_name = 'rsaPublicKeyPem') THEN
            ALTER TABLE "Merchant" ADD COLUMN "rsaPublicKeyPem" TEXT;
        END IF;

        -- Добавляем колонку rsaPrivateKeyPem если она не существует
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'Merchant' AND column_name = 'rsaPrivateKeyPem') THEN
            ALTER TABLE "Merchant" ADD COLUMN "rsaPrivateKeyPem" TEXT;
        END IF;

        -- Добавляем колонку keysGeneratedAt если она не существует
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'Merchant' AND column_name = 'keysGeneratedAt') THEN
            ALTER TABLE "Merchant" ADD COLUMN "keysGeneratedAt" TIMESTAMP(3);
        END IF;

        -- Добавляем колонку externalSystemName если она не существует
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'Merchant' AND column_name = 'externalSystemName') THEN
            ALTER TABLE "Merchant" ADD COLUMN "externalSystemName" TEXT;
        END IF;
    END IF;
END $$;

-- Создание индексов для оптимизации запросов (только если они не существуют)
DO $$ 
BEGIN
    -- Проверяем существование таблицы Merchant перед созданием индексов
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Merchant') THEN
        -- Создаем индекс для isAuctionEnabled если он не существует
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Merchant_isAuctionEnabled_idx') THEN
            CREATE INDEX "Merchant_isAuctionEnabled_idx" ON "Merchant"("isAuctionEnabled");
        END IF;

        -- Создаем индекс для externalSystemName если он не существует
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Merchant_externalSystemName_idx') THEN
            CREATE INDEX "Merchant_externalSystemName_idx" ON "Merchant"("externalSystemName");
        END IF;
    END IF;
END $$;

-- Комментарии для документации (только если таблица существует)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Merchant') THEN
        COMMENT ON COLUMN "Merchant"."isAuctionEnabled" IS 'Работает ли мерчант по системе аукциона';
        COMMENT ON COLUMN "Merchant"."auctionBaseUrl" IS 'Базовый URL API внешней системы аукциона';
        COMMENT ON COLUMN "Merchant"."rsaPublicKeyPem" IS 'Публичный RSA ключ в формате PEM X.509';
        COMMENT ON COLUMN "Merchant"."rsaPrivateKeyPem" IS 'Приватный RSA ключ в формате PEM PKCS#8';
        COMMENT ON COLUMN "Merchant"."keysGeneratedAt" IS 'Дата и время генерации RSA ключей';
        COMMENT ON COLUMN "Merchant"."externalSystemName" IS 'Имя внешней системы для подписи запросов';
    END IF;
END $$;
