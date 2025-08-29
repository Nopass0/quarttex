-- Добавление поля auctionCallbackUrl для аукционных мерчантов
-- Это URL куда отправляются callback'и при изменении статуса заказов

DO $$ 
BEGIN
    -- Проверяем существование таблицы Merchant
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Merchant') THEN
        -- Добавляем колонку auctionCallbackUrl если она не существует
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'Merchant' AND column_name = 'auctionCallbackUrl') THEN
            ALTER TABLE "Merchant" ADD COLUMN "auctionCallbackUrl" TEXT;
        END IF;
    END IF;
END $$;

-- Добавляем комментарий к полю
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Merchant') THEN
        EXECUTE 'COMMENT ON COLUMN "Merchant"."auctionCallbackUrl" IS ''URL для отправки callback''''ов при изменении статуса аукционных заказов''';
    END IF;
END $$;
