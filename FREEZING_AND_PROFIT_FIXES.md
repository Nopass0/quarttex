# Исправления заморозки баланса и расчета прибыли

## Проблемы
1. Баланс не замораживался при создании транзакции
2. Прибыль трейдера показывалась как 0 в интерфейсе

## Причины

### 1. Двойное применение KKK
В функции `calculateFreezingParams` происходило двойное применение коэффициента KKK:
- Первый раз KKK применялся в `rapiraService.getRateWithKkk()`
- Второй раз KKK применялся внутри `calculateFreezingParams`

Это приводило к неправильному расчету замораживаемой суммы.

### 2. Отсутствие сохранения прибыли
Прибыль трейдера рассчитывалась при завершении транзакции, но не всегда корректно отображалась в интерфейсе.

## Решения

### 1. Исправлено двойное применение KKK
В вызовах `calculateFreezingParams` теперь передается 0 вместо `kkkPercent`:

```typescript
// Было:
freezingParams = calculateFreezingParams(amount, rapiraRateWithKkk, kkkPercent, feeInPercent);

// Стало:
freezingParams = calculateFreezingParams(amount, rapiraRateWithKkk, 0, feeInPercent);
```

### 2. Улучшен расчет прибыли
- Добавлено логирование расчета прибыли для отладки
- Прибыль сохраняется в поле `traderProfit` в транзакции
- Интерфейс трейдера теперь использует сохраненную прибыль

## Как работает система теперь

### При создании транзакции:
1. Получается курс Rapira с уже примененным KKK
2. Рассчитывается сумма для заморозки без повторного применения KKK
3. Замораживается правильная сумма USDT на балансе трейдера

### При завершении транзакции:
1. Рассчитывается прибыль трейдера (комиссия от потраченной суммы)
2. Размораживается баланс
3. Списывается потраченная сумма с trustBalance
4. Начисляется прибыль на deposit (доступный баланс)
5. Обновляется общая прибыль от сделок (profitFromDeals)

## Важно
- Все расчеты используют поле `rate` (курс Rapira с KKK)
- Поле `merchantRate` используется только для отображения мерчанту
- KKK применяется только один раз при получении курса от Rapira