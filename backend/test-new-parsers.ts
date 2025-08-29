import { BankRegexFactory } from "./src/bank-parsers";

async function testNewParsers() {
  const factory = new BankRegexFactory();
  
  const testMessages = [
    // Сбербанк от 900
    {
      message: "СЧЁТ6334 08.05.25 зачислен перевод по СБП 25000р из Альфа-Банк от МАКСИМ ИВАНОВИЧ Е. Сообщение: Перевод денежных средств.",
      sender: "900"
    },
    {
      message: "СЧЁТ5154 14:59 Перевод из РНКБ Банк +45677р от ЕВГЕНИЙ Г. Баланс: 45677р",
      sender: "900"
    },
    {
      message: "MIR-0441 13:49 Перевод 3000р от Александр Е. Баланс: 3363.48р",
      sender: "900"
    },
    {
      message: "ПЛАТ.СЧЕТ6334 14:09 Роман Н. перевел(а) вам 10 000р.",
      sender: "900"
    },
    // ОТП Банк
    {
      message: "Счет *0084 зачисление 30000р. Доступно 30755.03р. otpbank.ru/tr",
      sender: "OTP Bank"
    },
    // T-Bank
    {
      message: "Пополнение, счет RUB. 27000 RUB. Александр П. Доступно 27726,35 RUB",
      sender: "T-Bank"
    },
    // БСП СБП
    {
      message: "*0977 Зачислен перевод по СБП 12264RUB 16:54 от Владимир Олегович Л",
      sender: "BankSPB"
    },
    // ПСБ
    {
      message: "СЧЁТ5154 16:04 зачисление 50 000р ПСБ Баланс: 50 001.2р",
      sender: "900"
    },
    // ДОМ.РФ
    {
      message: "Пополнение +10 110.00 RUB на счет **8577 по СБП от ДАВИД АЛЕКСАНДРОВИЧ Ш. успешно. Доступно 11 612.00 RUB",
      sender: "Bank_DOM.RF"
    },
    // МТС Банк
    {
      message: "Перевод на карту 5 000,00 RUB PEREVOD DR BANK Остаток: 5 122,50 RUB; *9131",
      sender: "MTS-Bank"
    },
    // УралСиб
    {
      message: "Пополнение *2301 Сумма 3000.00 р Остаток 12663.20 р T-Bank Card2Ca",
      sender: "UBRR"
    },
    // Россельхозбанк
    {
      message: "Успешный перевод СБП. Дмитрий Вячеславович З из Озон Банк (Ozon) Зачислено 999.00 RUR",
      sender: "RSHB"
    }
  ];

  console.log("=== ТЕСТИРОВАНИЕ НОВЫХ ПАРСЕРОВ ===\n");
  
  for (const test of testMessages) {
    console.log(`Сообщение: "${test.message}"`);
    console.log(`Отправитель: ${test.sender}`);
    
    const result = factory.parseMessage(test.message, undefined, test.sender);
    
    if (result) {
      console.log(`✅ Распознан банк: ${result.parser.bankName}`);
      console.log(`   Сумма: ${result.transaction.amount} ${result.transaction.currency}`);
      if (result.transaction.senderName) {
        console.log(`   Отправитель: ${result.transaction.senderName}`);
      }
      if (result.transaction.balance) {
        console.log(`   Баланс: ${result.transaction.balance}`);
      }
    } else {
      console.log(`❌ Не удалось распарсить`);
    }
    console.log();
  }
  
  console.log("\n=== ПОДДЕРЖИВАЕМЫЕ БАНКИ ===");
  console.log(factory.getBankNames().join(", "));
}

testNewParsers().catch(console.error).finally(() => process.exit(0));