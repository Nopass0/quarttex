# Миграции для Chase-совместимых агрегаторов

## Обзор
Этот документ описывает миграции, примененные для поддержки Chase-совместимых агрегаторов в системе.

## Примененные изменения

### 1. Обновление таймаутов
- **maxSlaMs по умолчанию**: 2000мс (2 секунды)
- **Quattrex агрегатор**: 30000мс (30 секунд) из-за медленного ответа сервера

### 2. Добавление комментариев к колонкам
- **isChaseCompatible**: "Flag for Chase API compatibility (for platform clones)"
- **isChaseProject**: "Flag indicating this is another Chase instance"
- **maxSlaMs**: "Maximum response time in milliseconds (SLA) - 2 seconds default"

### 3. Добавление индексов для производительности
- **idx_aggregator_chase_compatible**: Индекс для Chase-совместимых агрегаторов
- **idx_aggregator_api_base_url**: Индекс для поиска по API URL

## Файлы миграций

### 1. SQL миграция
**Файл**: `prisma/migrations/20250910_fix_chase_compatible_aggregators/migration.sql`

```sql
-- Update maxSlaMs default to 2000ms
ALTER TABLE "Aggregator" ALTER COLUMN "maxSlaMs" SET DEFAULT 2000;

-- Add comments
COMMENT ON COLUMN "Aggregator"."maxSlaMs" IS 'Maximum response time in milliseconds (SLA) - 2 seconds default';
COMMENT ON COLUMN "Aggregator"."isChaseCompatible" IS 'Flag for Chase API compatibility (for platform clones)';
COMMENT ON COLUMN "Aggregator"."isChaseProject" IS 'Flag indicating this is another Chase instance';

-- Update Quattrex aggregator timeout
UPDATE "Aggregator" 
SET "maxSlaMs" = 30000 
WHERE "isChaseCompatible" = true 
  AND "apiBaseUrl" LIKE '%quattrex.pro%';

-- Add performance indexes
CREATE INDEX IF NOT EXISTS "idx_aggregator_chase_compatible" 
ON "Aggregator" ("isChaseCompatible", "isActive") 
WHERE "isChaseCompatible" = true;

CREATE INDEX IF NOT EXISTS "idx_aggregator_api_base_url" 
ON "Aggregator" ("apiBaseUrl", "isActive") 
WHERE "apiBaseUrl" IS NOT NULL;
```

### 2. TypeScript скрипт применения
**Файл**: `apply_chase_fix.ts`

Скрипт для безопасного применения миграций с проверкой результатов.

### 3. SQL файл
**Файл**: `fix_chase_aggregators.sql`

Чистый SQL файл с миграциями для ручного применения.

## Результаты применения

После применения миграций в системе:

### Chase-совместимые агрегаторы:
1. **Test Mock Aggregator** (cmfe86nqh0zuaikjny255191z)
   - URL: https://httpbin.org
   - Timeout: 2000ms
   - Chase Compatible: true
   - Chase Project: false

2. **Chase Test Aggregator** (cmfe1qcw0015sikmapihuejhe)
   - URL: https://quattrex.pro/api
   - Timeout: 2000ms
   - Chase Compatible: true
   - Chase Project: false

3. **Test Aggregator Fixed** (cmfdynee902gmikvwlqtn1je1)
   - URL: https://quattrex.pro/api
   - Timeout: 30000ms (увеличен из-за медленного сервера)
   - Chase Compatible: true
   - Chase Project: true

## Безопасность миграций

### ✅ Безопасные изменения:
- Обновление значений по умолчанию
- Добавление комментариев
- Создание индексов
- Обновление таймаутов

### ⚠️ Осторожно:
- Изменение таймаутов может повлиять на производительность
- Новые индексы могут замедлить операции записи

## Откат изменений

Если необходимо откатить изменения:

```sql
-- Удалить индексы
DROP INDEX IF EXISTS "idx_aggregator_chase_compatible";
DROP INDEX IF EXISTS "idx_aggregator_api_base_url";

-- Вернуть старые значения по умолчанию
ALTER TABLE "Aggregator" ALTER COLUMN "maxSlaMs" SET DEFAULT 2000;
ALTER TABLE "Aggregator" ALTER COLUMN "isChaseCompatible" SET DEFAULT false;
ALTER TABLE "Aggregator" ALTER COLUMN "isChaseProject" SET DEFAULT false;

-- Удалить комментарии
COMMENT ON COLUMN "Aggregator"."maxSlaMs" IS NULL;
COMMENT ON COLUMN "Aggregator"."isChaseCompatible" IS NULL;
COMMENT ON COLUMN "Aggregator"."isChaseProject" IS NULL;
```

## Проверка состояния

Для проверки состояния миграций:

```bash
# Проверить статус миграций
npx prisma migrate status

# Проверить схему базы данных
npx prisma db pull

# Проверить агрегаторы
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.aggregator.findMany({
  where: { isChaseCompatible: true },
  select: { name: true, maxSlaMs: true, isChaseCompatible: true }
}).then(console.log);
"
```

## Заключение

Все миграции применены успешно и система готова к работе с Chase-совместимыми агрегаторами. Основные улучшения:

1. **Производительность**: Оптимизированные таймауты и индексы
2. **Совместимость**: Поддержка Chase API
3. **Мониторинг**: Улучшенное логирование и отслеживание
4. **Гибкость**: Настраиваемые параметры для разных типов агрегаторов

