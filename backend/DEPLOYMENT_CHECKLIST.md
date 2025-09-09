# Чеклист развертывания исправлений округления

## Проблема
Ошибка 500 при создании транзакций на продакшене после изменений в логике округления.

## Исправления
1. Добавлена функция `roundUp2()` в `backend/src/utils/rounding.ts`
2. Изменена логика в `backend/src/routes/admin/transactions.ts` (строка 2397)
3. Изменена логика в `backend/src/routes/trader/transactions.ts` (строка 1014)

## Шаги развертывания

### 1. Проверка текущего состояния на продакшене
```bash
# Проверить версию кода
git log --oneline -5

# Проверить логи для выяснения точной ошибки
pm2 logs --lines 50

# Проверить статус процессов
pm2 status
```

### 2. Развертывание изменений
```bash
# Обновить код
git pull origin main

# Установить зависимости (если нужно)
npm install

# Перезапустить сервер
pm2 restart all
```

### 3. Проверка после развертывания
```bash
# Проверить логи на ошибки
pm2 logs --lines 20

# Тестовый запрос
curl -X POST https://domainchsp.ru/api/merchant/transactions/in \
  -H "Content-Type: application/json" \
  -H "x-merchant-api-key: VALID_API_KEY" \
  -d '{"amount": 1000, "methodId": "VALID_METHOD_ID", "orderId": "test-123", "expired_at": "2025-09-06T12:00:00Z"}'
```

### 4. Откат (если проблемы продолжаются)
Если проблемы продолжаются, можно временно откатить изменения:

```typescript
// В admin/transactions.ts (строка 2397):
const spentUsdt = existing.frozenUsdtAmount || 
  roundDown2(existing.amount / savedRate);

// В trader/transactions.ts (строка 1014):
const amountToDeduct = txWithFreezing?.frozenUsdtAmount ||
  (transaction.rate ? roundDown2(transaction.amount / transaction.rate) : 0);
```

## Мониторинг
После развертывания следить за:
- Логами ошибок в pm2 logs
- Успешностью создания транзакций
- Точностью расчетов баланса

## Контакты
При проблемах с развертыванием обращайтесь к команде разработки.
