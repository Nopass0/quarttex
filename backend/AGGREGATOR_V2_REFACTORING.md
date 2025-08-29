# Рефакторинг системы агрегаторов v2.0

## Дата: 29.01.2025
## Статус: ✅ Реализовано

## Обзор изменений

Полностью переработана «агрегаторская» часть системы с сохранением логики пополнения баланса. Реализованы все требования согласно ТЗ.

## 1. База данных

### Обновленная модель Aggregator
```prisma
model Aggregator {
  // Новые поля:
  callbackToken   String  @unique  // Токен для верификации входящих callback'ов
  priority        Int     @default(0)  // Приоритет для fallback маршрутизации
  maxSlaMs        Int     @default(2000)  // Максимальное время ответа (SLA)
  minBalance      Float   @default(0)  // Минимальный баланс для работы
  maxDailyVolume  Float?  // Максимальный дневной объем
  currentDailyVolume Float @default(0)  // Текущий дневной объем
  lastVolumeReset DateTime  // Последний сброс объема
  lastPriorityChangeBy String?  // Кто изменил приоритет
  lastPriorityChangeAt DateTime?  // Когда изменен приоритет
}
```

### Новая модель AggregatorIntegrationLog
```prisma
model AggregatorIntegrationLog {
  direction       IntegrationDirection  // IN/OUT
  eventType       String  // Тип события
  method          String  // HTTP метод
  url             String
  headers         Json  // С маскированными токенами
  requestBody     Json?
  responseBody    Json?
  statusCode      Int?
  responseTimeMs  Int?
  slaViolation    Boolean  // Нарушен ли SLA
  idempotencyKey  String?
  ourDealId       String?
  partnerDealId   String?
  error           String?
  metadata        Json?
}
```

## 2. Fallback маршрутизация сделок

### Принцип работы
1. Если сделка не назначена трейдеру, включается fallback на агрегаторов
2. Агрегаторы сортируются по приоритету (настраивается в админке)
3. Система последовательно пробует каждого агрегатора
4. При отказе/ошибке/нарушении SLA переходит к следующему
5. Все попытки детально логируются

### Реализация
- **Файл:** `backend/src/services/fallback-routing.service.ts`
- **Класс:** `FallbackRoutingService`
- **Основной метод:** `routeTransactionToAggregators()`

### Автоматическое управление приоритетами
- Анализ метрик за последние 24 часа
- Расчет score на основе: успешности, времени ответа, SLA
- Автоматическая перестановка приоритетов
- Метод: `updateAggregatorPriorities()`

## 3. API Endpoints

### Callback от агрегаторов (наша сторона)
- **POST /api/aggregators/callback** - одиночный callback
- **POST /api/aggregators/callback/batch** - массовые callbacks (до 100)
- **GET /api/aggregators/integration-logs** - журнал интеграций

### Endpoints агрегатора (их сторона)
- **POST {baseUrl}/deals** - создание сделки
- **POST {baseUrl}/deals/{partnerDealId}/disputes** - создание спора

### Аутентификация
- **API Token** - для наших запросов к агрегатору
- **Callback Token** - для callback'ов от агрегатора к нам

## 4. Личный кабинет агрегатора

### Функционал (dashboard-v2.ts)
- Просмотр callback URL и токенов
- Настройка Base URL агрегатора
- Регенерация callback токена с подтверждением
- Отправка мок-сделок для тестирования
- Просмотр журнала интеграций с фильтрами
- Статистика по дням и периодам

### Endpoints личного кабинета
- **GET /aggregator/dashboard/profile** - профиль и токены
- **PATCH /aggregator/dashboard/settings** - обновление настроек
- **POST /aggregator/dashboard/regenerate-token** - регенерация токена
- **POST /aggregator/dashboard/test-deal** - тестовая сделка
- **POST /aggregator/dashboard/test-deals-batch** - пакет тестовых сделок
- **GET /aggregator/dashboard/integration-logs** - журнал интеграций
- **GET /aggregator/dashboard/stats** - статистика

## 5. Админка

### Функционал (aggregators-v2.ts)
- Управление приоритетами (drag-and-drop)
- Включение/выключение агрегаторов
- Настройка SLA и лимитов
- Регенерация токенов
- Просмотр статистики и метрик
- Автоматическое обновление приоритетов

### Endpoints админки
- **GET /admin/aggregators-v2** - список с статистикой
- **PUT /admin/aggregators-v2/priorities** - обновление приоритетов
- **PATCH /admin/aggregators-v2/:id** - настройки агрегатора
- **POST /admin/aggregators-v2/:id/regenerate-token** - регенерация токена
- **GET /admin/aggregators-v2/:id/stats** - детальная статистика
- **POST /admin/aggregators-v2/:id/test-deal** - тестовая сделка
- **GET /admin/aggregators-v2/stats/overview** - общая статистика
- **POST /admin/aggregators-v2/update-priorities-auto** - авто-приоритеты

## 6. Логирование и аудит

### Что логируется
- Все исходящие запросы к агрегаторам
- Все входящие callback'и от агрегаторов
- Мок-тесты из ЛК
- Время ответа и нарушения SLA
- Idempotency-Key для идемпотентности

### Маскирование данных
- Токены в заголовках автоматически маскируются
- Сохраняется только начало и конец токена

### Фильтры журнала
- По направлению (IN/OUT)
- По типу события
- По ID сделки (наш/партнерский)
- По датам
- По нарушениям SLA
- По наличию ошибок

## 7. Документация

### Созданные файлы
1. **aggregator-integration-v2.md** - полная документация по интеграции
2. **aggregator-openapi-v2.yaml** - OpenAPI спецификация

### Содержание документации
- Схема взаимодействия
- Описание всех endpoints
- Примеры запросов/ответов
- Справочники констант
- Требования к SLA
- Примеры кода на Python, Node.js, PHP

## 8. Идемпотентность и безопасность

### Идемпотентность
- Поддержка Idempotency-Key для исходящих запросов
- Дедупликация входящих callback'ов
- Защита от повторной обработки

### Безопасность
- Два отдельных токена (API и Callback)
- Проверка токенов на всех endpoints
- Безопасная регенерация с подтверждением
- Маскирование токенов в логах

## 9. Файлы проекта

### Новые файлы
- `backend/src/services/aggregator-v2.service.ts` - основной сервис
- `backend/src/services/fallback-routing.service.ts` - fallback логика
- `backend/src/routes/aggregator/callback-v3.ts` - новые callback endpoints
- `backend/src/routes/aggregator/dashboard-v2.ts` - новый ЛК
- `backend/src/routes/admin/aggregators-v2.ts` - новая админка
- `backend/docs/aggregator-integration-v2.md` - документация
- `backend/docs/aggregator-openapi-v2.yaml` - OpenAPI спецификация
- `backend/prisma/migrations/20250129_aggregator_refactoring/migration.sql` - миграция БД

### Обновленные файлы
- `backend/prisma/schema.prisma` - схема БД
- `backend/src/routes/merchant/index.ts` - интеграция fallback routing
- `backend/src/routes/aggregator/index.ts` - подключение новых routes
- `backend/src/routes/admin.ts` - подключение новой админки

## 10. Миграция

### Применение миграций
```bash
cd backend
npx prisma migrate deploy
```

### Обратная совместимость
- Старые endpoints продолжают работать
- Новые endpoints работают параллельно
- Можно плавно переключиться на новую версию

## Итоги

✅ Реализована полная переработка агрегаторской части
✅ Сохранена логика пополнения баланса без изменений
✅ Добавлена система приоритетов и fallback маршрутизация
✅ Создан полнофункциональный ЛК агрегатора
✅ Реализована расширенная админка с управлением приоритетами
✅ Внедрена детальная система логирования и аудита
✅ Подготовлена полная документация и OpenAPI спецификация
✅ Обеспечена идемпотентность и безопасность
✅ Поддержана обратная совместимость
