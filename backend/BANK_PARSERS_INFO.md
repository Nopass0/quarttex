# Парсеры банковских уведомлений

## Добавленные банки и их обработка

### Поддерживаемые банки

1. **Сбербанк** (Sberbank)
   - Коды отправителей: 900
   - Package names: ru.sberbankmobile, ru.sberbank, ru.sberbank.android
   - Обрабатывает множество форматов включая MIR карты, СБП переводы

2. **Тинькофф/T-Bank** (Tinkoff)
   - Коды отправителей: T-Bank, Т-Банк
   - Package names: com.idamob.tinkoff.android, ru.tinkoff, ru.tinkoff.sme

3. **ВТБ** (VTB)
   - Package names: ru.vtb24.mobilebanking.android, ru.vtb24, ru.vtb

4. **Альфа-Банк** (Alfabank)
   - Package names: ru.alfabank.mobile.android, ru.alfabank

5. **Газпромбанк** (Gazprombank)
   - Package names: ru.gazprombank.android.mobilebank.app, ru.gazprombank.android, ru.gazprombank

6. **Озон Банк** (OzonBank)
   - Package names: ru.ozon.app.android, ru.ozonbank, ru.ozon.bank

7. **ОТП Банк** (OTP Bank)
   - Коды отправителей: OTP Bank, ОТП Банк, OTPBank
   - Package names: ru.otpbank, ru.otpbank.mobile

8. **ПСБ** (PSB)
   - Package names: ru.psbank.mobile, ru.psbank, ru.promsvyazbank

9. **ДОМ.РФ** (DOM.RF)
   - Коды отправителей: Bank_DOM.RF, DOM.RF
   - Package names: ru.domrf.mobile, com.domrf.mobile, ru.bank.domrf

10. **МТС Банк** (MTS Bank)
    - Коды отправителей: MTS-Bank, МТС-Банк
    - Package names: ru.mtsbank.mobile, ru.mtsbank.android, ru.mtsbank

11. **УралСиб** (UralSib)
    - Коды отправителей: UBRR, УралСиб
    - Package names: ru.uralsib.mobile, ru.uralsib.mb, ru.uralsib

12. **Райффайзенбанк** (Raiffeisen)
    - Package names: ru.raiffeisen.mobile.new, ru.raiffeisen, ru.raiffeisenbank

13. **Почта Банк** (Pochta Bank)
    - Package names: ru.pochta.bank, ru.pochtabank

14. **Банк Санкт-Петербург** (Bank SPB)
    - Коды отправителей: BankSPB, БСПБ
    - Package names: com.bssys.bspb, ru.bspb

15. **РНКБ** (RNKB)
    - Package names: com.fakemobile.rnkb, ru.rnkb

16. **Россельхозбанк** (RSHB)
    - Коды отправителей: RSHB, РСХБ
    - Package names: ru.rshb.mbank, ru.rshb, ru.rosselkhozbank.rshb

17. **Хоум Кредит** (Home Credit)
    - Package names: ru.homecredit.smartbank, ru.homecredit

## Как работает система

1. **Определение банка происходит тремя способами:**
   - По коду отправителя (например, 900 для Сбербанка)
   - По package name приложения
   - По тексту сообщения

2. **Приоритет определения:**
   - Сначала проверяется код отправителя
   - Затем package name
   - В последнюю очередь - все парсеры по тексту

3. **Извлекаемые данные:**
   - Сумма транзакции
   - Валюта (обычно RUB)
   - Имя отправителя (если есть)
   - Баланс после операции (если есть)

## Примеры обработанных сообщений

- **Сбербанк от 900**: "СЧЁТ6334 08.05.25 зачислен перевод по СБП 25000р из Альфа-Банк от МАКСИМ ИВАНОВИЧ Е."
- **T-Bank**: "Пополнение, счет RUB. 27000 RUB. Александр П. Доступно 27726,35 RUB"
- **ОТП Банк**: "Счет *0084 зачисление 30000р. Доступно 30755.03р. otpbank.ru/tr"
- **БСП**: "*0977 Зачислен перевод по СБП 12264RUB 16:54 от Владимир Олегович Л"
- **ДОМ.РФ**: "Пополнение +10 110.00 RUB на счет **8577 по СБП от ДАВИД АЛЕКСАНДРОВИЧ Ш. успешно. Доступно 11 612.00 RUB"
- **МТС Банк**: "Перевод на карту 5 000,00 RUB PEREVOD DR BANK Остаток: 5 122,50 RUB; *9131"
- **УралСиб**: "Пополнение *2301 Сумма 3000.00 р Остаток 12663.20 р T-Bank Card2Ca"

## Важные моменты

1. Система автоматически сопоставляет только уведомления с транзакциями того же банка
2. Временное окно для сопоставления - 4 часа до получения уведомления
3. Допустимая погрешность суммы - 1 рубль
4. Все парсеры поддерживают различные форматы чисел (с пробелами, запятыми)