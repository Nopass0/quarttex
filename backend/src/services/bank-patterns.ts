// Bank notification patterns based on comprehensive analysis
export interface BankPattern {
  name: string;
  aliases: string[];
  packageNames?: string[];
  patterns: {
    amount: RegExp[];
    balance?: RegExp[];
    card?: RegExp[];
    time?: RegExp[];
    date?: RegExp[];
    sender_name?: RegExp[];
  };
}

export const BANK_PATTERNS: BankPattern[] = [
  // СБП должен быть первым для правильного приоритета
  {
    name: "СБП",
    aliases: ["СБП", "SBP", "Система быстрых платежей"],
    packageNames: [], // СБП работает через разные банковские приложения
    patterns: {
      amount: [
        /Поступление\s+([\d\s]+)\s*р.*?SBP/i,
        /Поступление\s+([\d\s]+)\s*р.*?СБП/i,
        /SBP.*?[+]?([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|₽)/i,
        /СБП.*?[+]?([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|₽)/i,
        /Перевод\s+СБП.*?([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|₽)/i,
        /Система\s+быстрых\s+платежей.*?([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|₽)/i,
        // Специфичный паттерн для "Поступление 3201р Счет*1234 SBP"
        /Поступление\s+([\d\s]+)р\s+Счет\*\d{4}\s+(?:SBP|СБП)/i,
        // Вариант без указания валюты: "Поступление 3201 Счет*1234 SBP"
        /Поступление\s+([\d\s]+)\s+Счет\*\d{4}\s+(?:SBP|СБП)/i
      ],
      balance: [
        /Баланс[:|\s]+([\d\s]+(?:[.,]\d{2})?)\s*р?/i,
        /Остаток[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i,
        /Доступно[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i
      ],
      card: [
        /Счет\*(\d{4})/i,
        /СЧЁТ(\d{4})/,
        /\*(\d{4})/
      ],
      time: [/(\d{2}:\d{2})/],
      sender_name: [
        /от\s+([А-ЯЁA-Z][а-яёa-z]+(?:\s+[А-ЯЁA-Z]\.?)*)/,
        /Отправитель[:|\s]+([А-ЯЁA-Z][а-яёa-z]+(?:\s+[А-ЯЁA-Z]\.?)*)/
      ]
    }
  },
  {
    name: "Тинькофф",
    aliases: ["Тинькофф", "Tinkoff", "T-Bank", "TBANK"],
    packageNames: ["com.idamob.tinkoff.android", "ru.tinkoff", "ru.tinkoff.sme"],
    patterns: {
      amount: [
        /(?:Пополнение|Покупка|Оплата|Перевод|Поступление|зачисление|пополнение)[,\s]+(?:счет\s+RUB\.\s*)?([\d\s]+(?:[.,]\d{2})?)\s*(?:RUB|RUR|₽|р|руб)/i,
        /на\s+([\d\s]+(?:[.,]\d{2})?)\s*(?:RUB|RUR|₽|р|руб)/i,
        /([+-]?[\d\s]+(?:[.,]\d{2})?)\s*(?:RUB|RUR|₽|р|руб)/i
      ],
      balance: [
        /(?:Доступно|Баланс|Остаток)[:|\s]+([\d\s]+(?:[.,]\d{2})?)\s*(?:RUB|RUR|₽|р|руб)?/i,
        /Баланс:\s*([\d\s]+(?:[.,]\d{2})?)\s*(?:RUB|RUR|₽|р|руб)?/i
      ],
      card: [
        /(?:Карта|Card)?[*\s]?(\d{4})/,
        /MIR-(\d{4})/,
        /СЧЁТ(\d{4})/
      ],
      time: [/(\d{1,2}:\d{2})/],
      date: [/(\d{1,2}\.\d{2}\.\d{2,4})/],
      sender_name: [/от\s+([А-ЯЁA-Z][а-яёa-z]+(?:\s+[А-ЯЁA-Z]\.?)*)/]
    }
  },
  {
    name: "Альфа-Банк",
    aliases: ["Альфа-Банк", "Альфа_Банк", "Альфа Банк", "ALFABANK"],
    packageNames: ["ru.alfabank.mobile.android", "ru.alfabank"],
    patterns: {
      amount: [
        /(?:Перевод|Покупка|Зачисление|Списание|Оплата|зачисление)(?:\s+из\s+[^\+]+)?\s*[+]?([\d\s]+)\s*р/i,
        /([+-]?[\d\s]+(?:[.,]\d{2})?)\s*(?:р|руб|RUB|RUR)/i
      ],
      balance: [
        /Баланс[:|\s]+([\d\s]+(?:[.,]\d{2})?)\s*р?/i,
        /Доступно[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i
      ],
      card: [
        /MIR-(\d{4})/,
        /СЧЁТ(\d{4})/,
        /\*(\d{4})/
      ],
      time: [/(\d{2}:\d{2})/],
      sender_name: [/от\s+([А-ЯЁA-Z][а-яёa-z]+(?:\s+[А-ЯЁA-Z]\.?)*)/]
    }
  },
  {
    name: "Сбербанк",
    aliases: ["Сбербанк", "Sberbank", "SBERBANK", "СБЕР"],
    packageNames: ["ru.sberbankmobile", "com.sberbank", "ru.sberbank.android"],
    patterns: {
      amount: [
        /СБЕР\s*\+?([\d\s]+(?:[.,]\d{2})?)\s*₽/i,
        /(?:Перевод|покупка|оплата|зачисление|поступление)\s+([\d\s]+)\s*р/i,
        /([+-]?[\d\s]+(?:[.,]\d{2})?)\s*(?:р|руб|RUB|₽)/i
      ],
      balance: [
        /Баланс:\s*([\d\s]+(?:[.,]\d{2})?)\s*р?/i,
        /доступно:\s*([\d\s]+(?:[.,]\d{2})?)/i
      ],
      card: [
        /MIR-(\d{4})/,
        /СЧЁТ(\d{4})/,
        /\*(\d{4})/
      ],
      time: [/(\d{2}:\d{2})/],
      sender_name: [/от\s+([А-ЯЁA-Z][а-яёa-z]+(?:\s+[А-ЯЁA-Z]\.?)*)/]
    }
  },
  {
    name: "ВТБ",
    aliases: ["ВТБ", "VTB"],
    packageNames: ["ru.vtb24.mobilebanking.android", "ru.vtb24", "ru.vtb"],
    patterns: {
      amount: [
        /Поступление\s+([\d\s]+(?:[.,]\d{2})?)\s*₽/i,  // Оставляем для символа ₽
        /Поступление\s+([\d\s]+(?:[.,]\d{2})?)\s*р/i,
        /Поступление\s+([\d\s]+(?:[.,]\d{2})?)(?=\s+Счет\*)/i,  // Для сообщений без указания валюты
        /Поступление\s+([\d\s]+)\s*р/i,  // Для СБП формата "Поступление 3201р"
        /(?:Перевод|Оплата|Покупка|Зачисление|зачисление)(?:\s+из\s+[^\+]+)?\s*[+]?([\d\s]+)\s*р/i,
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|₽)/i,
        /Счет\*(\d{4})\s+([+-]?[\d\s]+(?:[.,]\d{2})?)\s*р/i,
        /ВТБ\s+Онлайн.*?Поступление\s+([\d\s]+)\s*р/i
      ],
      balance: [
        /Баланс[:|\s]+([\d\s]+(?:[.,]\d{2})?)\s*р?/i,
        /Остаток[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i,
        /Доступно[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i
      ],
      card: [
        /Счет\*(\d{4})/i,
        /СЧЁТ(\d{4})/,
        /MIR-(\d{4})/,
        /Карта\*?(\d{4})/
      ],
      time: [/(\d{2}:\d{2})/],
      sender_name: [/от\s+([А-ЯЁA-Z][а-яёa-z]+(?:\s+[А-ЯЁA-Z]\.?)*)/]
    }
  },
  {
    name: "Газпромбанк",
    aliases: ["Газпромбанк", "Gazprombank", "GAZPROMBANK"],
    packageNames: ["ru.gazprombank.android.mobilebank.app", "ru.gazprombank.android", "ru.gazprombank"],
    patterns: {
      amount: [
        /Перевод\s+зачисление\s+([\d\s]+(?:[.,]\d{2})?)\s*₽/i,
        /(?:Перевод|зачисление|оплата|пополнение)(?:\s+из\s+[^\+]+)?\s*[+]?([\d\s]+(?:[.,]\d{2})?)\s*(?:₽|р|руб|RUB)/i,
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:₽|р|руб|RUB)/i
      ],
      balance: [
        /Баланс[:|\s]+([\d\s]+(?:[.,]\d{2})?)\s*(?:₽|р)?/i,
        /остаток[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i,
        /Доступно\s+([\d\s]+(?:[.,]\d{2})?)/i
      ],
      card: [/\*(\d{4})/],
      sender_name: [/от\s+([А-ЯЁA-Z][а-яёa-z]+(?:\s+[А-ЯЁA-Z]\.?)*)/]
    }
  },
  {
    name: "Райффайзенбанк",
    aliases: ["Райффайзенбанк", "Raiffeisen", "RAIFFEISEN"],
    packageNames: ["ru.raiffeisen.mobile.new", "ru.raiffeisen", "ru.raiffeisenbank"],
    patterns: {
      amount: [
        /(?:Пополнение|Перевод от|Зачисление).*?([\d\s]+(?:[.,]\d{2})?)\s*₽/i,
        /\+([\d\s]+(?:[.,]\d{2})?)\s*RUB.*?перевод/i,
        /Поступление\s+([\d\s]+(?:[.,]\d{2})?)\s*₽/i
      ],
      balance: [
        /Баланс[:|\s]+([\d\s]+(?:[.,]\d{2})?)\s*₽?/i,
        /Доступно[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i
      ],
      card: [
        /MIR-(\d{4})/,
        /\*(\d{4})/
      ]
    }
  },
  {
    name: "Почта Банк",
    aliases: ["Почта Банк", "Pochtabank", "POCHTABANK"],
    packageNames: ["ru.pochta.bank"],
    patterns: {
      amount: [
        /(?:Пополнение|Перевод|Зачисление).*?([\d\s]+(?:[.,]\d{2})?)\s*₽/i,
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB)/i
      ],
      balance: [
        /Баланс[:|\s]+([\d\s]+(?:[.,]\d{2})?)\s*₽?/i
      ],
      card: [
        /\*(\d{4})/,
        /Карта\s*(\d{4})/
      ]
    }
  },
  {
    name: "Озон Банк",
    aliases: ["Озон Банк", "Ozon Bank", "OZONBANK"],
    packageNames: ["ru.ozon.bank"],
    patterns: {
      amount: [
        /(?:Пополнение|Перевод|Поступление).*?([\d\s]+(?:[.,]\d{2})?)\s*₽/i,
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB)/i
      ],
      balance: [
        /Баланс[:|\s]+([\d\s]+(?:[.,]\d{2})?)\s*₽?/i
      ],
      card: [/\*(\d{4})/]
    }
  },
  {
    name: "Хоум Кредит",
    aliases: ["Хоум Кредит", "Home Credit", "HOMECREDIT"],
    packageNames: ["ru.homecredit.bank"],
    patterns: {
      amount: [
        /(?:Пополнение|Перевод|Поступление).*?([\d\s]+(?:[.,]\d{2})?)\s*₽/i,
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB)/i
      ],
      balance: [
        /Баланс[:|\s]+([\d\s]+(?:[.,]\d{2})?)\s*₽?/i
      ],
      card: [/\*(\d{4})/]
    }
  },
  {
    name: "ОТП Банк",
    aliases: ["ОТП Банк", "OTP Bank", "OTPBANK"],
    packageNames: ["ru.otpbank"],
    patterns: {
      amount: [
        /(?:Пополнение|Перевод|Поступление|Зачисление).*?([\d\s]+(?:[.,]\d{2})?)\s*(?:₽|р|руб|RUB)/i,
        /Зачисление\s+([\d\s]+)\s*р/i,
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB)/i
      ],
      balance: [
        /Баланс[:|\s]+([\d\s]+(?:[.,]\d{2})?)\s*₽?/i,
        /Доступно[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i
      ],
      card: [/\*(\d{4})/]
    }
  },
  {
    name: "ПСБ",
    aliases: ["ПСБ", "Промсвязьбанк", "PSB", "PROMSVYAZBANK"],
    packageNames: ["ru.psbank.android", "ru.psb"],
    patterns: {
      amount: [
        /(?:пополнение|Покупка|Оплата|Перевод|зачисление)\s+(?:на\s+)?([\d\s]+(?:[.,]\d{2})?)\s*(?:RUR|руб|р)/i,
        /([\d\s]+(?:[.,]\d{2})?)\s*р\./
      ],
      balance: [
        /Баланс[:|\s]+([\d\s]+(?:[.,]\d{2})?)\s*р?/i,
        /Остаток\s+([\d\s]+(?:[.,]\d{2})?)\s*(?:RUR|руб)?/i
      ],
      card: [
        /Карта\*(\d{4})/,
        /MIR-(\d{4})/,
        /СЧЁТ(\d{4})/
      ]
    }
  },
  {
    name: "МТС Банк",
    aliases: ["МТС Банк", "MTS Bank", "MTSBANK"],
    packageNames: ["ru.mts.bank", "ru.mtsbank"],
    patterns: {
      amount: [
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|RUR|₽)/i
      ],
      balance: [
        /(?:Баланс|баланс|остаток|Остаток|Доступно)[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i
      ],
      card: [
        /\*(\d{4})/,
        /MIR-(\d{4})/,
        /СЧЁТ(\d{4})/
      ]
    }
  },
  {
    name: "УралСиб",
    aliases: ["УралСиб", "Uralsib", "URALSIB"],
    packageNames: ["ru.uralsib.bank"],
    patterns: {
      amount: [
        /(?:Пополнение|Перевод|Поступление).*?([\d\s]+(?:[.,]\d{2})?)\s*₽/i,
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB)/i
      ],
      balance: [
        /Баланс[:|\s]+([\d\s]+(?:[.,]\d{2})?)\s*₽?/i
      ],
      card: [/\*(\d{4})/]
    }
  },
  {
    name: "МКБ",
    aliases: ["МКБ", "Московский Кредитный Банк", "MKB"],
    packageNames: ["ru.mkb"],
    patterns: {
      amount: [
        /(?:Пополнение|Перевод|Поступление).*?([\d\s]+(?:[.,]\d{2})?)\s*₽/i,
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB)/i
      ],
      balance: [
        /Баланс[:|\s]+([\d\s]+(?:[.,]\d{2})?)\s*₽?/i
      ],
      card: [/\*(\d{4})/]
    }
  },
  {
    name: "Банк Санкт-Петербург",
    aliases: ["Банк Санкт-Петербург", "BSPB", "SPBBANK"],
    packageNames: ["ru.bspb"],
    patterns: {
      amount: [
        /(?:Пополнение|Перевод).*?([\d\s]+(?:[.,]\d{2})?)\s*₽/i
      ],
      balance: [
        /Баланс[:|\s]+([\d\s]+(?:[.,]\d{2})?)\s*₽?/i
      ],
      card: [/\*(\d{4})/]
    }
  },
  {
    name: "РНКБ",
    aliases: ["РНКБ", "RNKB"],
    packageNames: ["ru.rnkb"],
    patterns: {
      amount: [
        /(?:Пополнение|Перевод|Поступление).*?([\d\s]+(?:[.,]\d{2})?)\s*₽/i,
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB)/i
      ],
      balance: [
        /Баланс[:|\s]+([\d\s]+(?:[.,]\d{2})?)\s*₽?/i
      ],
      card: [/\*(\d{4})/]
    }
  },
  {
    name: "Россельхозбанк",
    aliases: ["Россельхозбанк", "RSHB", "ROSSELKHOZBANK"],
    packageNames: ["ru.rshb.mbank"],
    patterns: {
      amount: [
        /(?:Пополнение|Перевод).*?([\d\s]+(?:[.,]\d{2})?)\s*₽/i
      ],
      balance: [
        /Баланс[:|\s]+([\d\s]+(?:[.,]\d{2})?)\s*₽?/i
      ],
      card: [/\*(\d{4})/]
    }
  },
  {
    name: "Акбарс",
    aliases: ["Акбарс", "Akbars", "AKBARS"],
    packageNames: ["ru.akbars.mobile", "ru.akbars"],
    patterns: {
      amount: [
        /(?:Пополнение|Перевод|Зачисление).*?(?:Сумма:|на сумму)\s*([\d\s]+[.,]?\d{0,2})\s*(?:RUR|₽|руб)/i,
        /Поступление\s+([\d\s]+[.,]?\d{0,2})\s*(?:₽|руб)/i
      ],
      balance: [
        /Баланс[:|\s]+([\d\s]+(?:[.,]\d{2})?)\s*₽?/i
      ],
      card: [/\*(\d{4})/]
    }
  },
  {
    name: "Локо-Банк",
    aliases: ["Локо-Банк", "Loko Bank", "LOKOBANK"],
    packageNames: ["ru.lokobank"],
    patterns: {
      amount: [
        /(?:Пополнение|Перевод|Поступление).*?([\d\s]+(?:[.,]\d{2})?)\s*₽/i,
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB)/i
      ],
      balance: [
        /Баланс[:|\s]+([\d\s]+(?:[.,]\d{2})?)\s*₽?/i
      ],
      card: [/\*(\d{4})/]
    }
  },
  {
    name: "Ренессанс Кредит",
    aliases: ["Ренессанс Кредит", "Renaissance", "RENAISSANCE"],
    packageNames: ["ru.renaissance"],
    patterns: {
      amount: [
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|RUR|₽)/i
      ],
      balance: [
        /(?:Баланс|баланс|остаток|Остаток|Доступно)[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i
      ],
      card: [
        /\*(\d{4})/,
        /MIR-(\d{4})/,
        /СЧЁТ(\d{4})/
      ]
    }
  },
  {
    name: "Авангард",
    aliases: ["Авангард", "Avangard", "AVANGARD"],
    packageNames: ["ru.avangard"],
    patterns: {
      amount: [
        /(?:Пополнение|Перевод|Поступление).*?([\d\s]+(?:[.,]\d{2})?)\s*₽/i,
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB)/i
      ],
      balance: [
        /Баланс[:|\s]+([\d\s]+(?:[.,]\d{2})?)\s*₽?/i
      ],
      card: [/\*(\d{4})/]
    }
  },
  {
    name: "БКС Банк",
    aliases: ["БКС Банк", "BCS Bank", "BCSBANK"],
    packageNames: ["ru.bcs"],
    patterns: {
      amount: [
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|RUR|₽)/i
      ],
      balance: [
        /(?:Баланс|баланс|остаток|Остаток|Доступно)[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i
      ],
      card: [
        /\*(\d{4})/,
        /MIR-(\d{4})/,
        /СЧЁТ(\d{4})/
      ]
    }
  },
  {
    name: "ББР Банк",
    aliases: ["ББР Банк", "BBR Bank", "BBRBANK"],
    packageNames: ["ru.bbr"],
    patterns: {
      amount: [
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|RUR|₽)/i
      ],
      balance: [
        /(?:Баланс|баланс|остаток|Остаток|Доступно)[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i
      ],
      card: [
        /\*(\d{4})/,
        /MIR-(\d{4})/,
        /СЧЁТ(\d{4})/
      ]
    }
  },
  {
    name: "Кредит Европа Банк",
    aliases: ["Кредит Европа Банк", "Credit Europe", "CREDITEUROPE"],
    packageNames: ["ru.crediteurope"],
    patterns: {
      amount: [
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|RUR|₽)/i
      ],
      balance: [
        /(?:Баланс|баланс|остаток|Остаток|Доступно)[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i
      ],
      card: [
        /\*(\d{4})/,
        /MIR-(\d{4})/,
        /СЧЁТ(\d{4})/
      ]
    }
  },
  {
    name: "УБРИР",
    aliases: ["УБРИР", "UBRIR"],
    packageNames: ["ru.ubrir"],
    patterns: {
      amount: [
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|RUR|₽)/i
      ],
      balance: [
        /(?:Баланс|баланс|остаток|Остаток|Доступно)[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i
      ],
      card: [
        /\*(\d{4})/,
        /MIR-(\d{4})/,
        /СЧЁТ(\d{4})/
      ]
    }
  },
  {
    name: "Генбанк",
    aliases: ["Генбанк", "Genbank", "GENBANK"],
    packageNames: ["ru.genbank"],
    patterns: {
      amount: [
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|RUR|₽)/i
      ],
      balance: [
        /(?:Баланс|баланс|остаток|Остаток|Доступно)[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i
      ],
      card: [
        /\*(\d{4})/,
        /MIR-(\d{4})/,
        /СЧЁТ(\d{4})/
      ]
    }
  },
  {
    name: "Синара",
    aliases: ["Синара", "Sinara", "SINARA"],
    packageNames: ["ru.sinara"],
    patterns: {
      amount: [
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|RUR|₽)/i
      ],
      balance: [
        /(?:Баланс|баланс|остаток|Остаток|Доступно)[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i
      ],
      card: [
        /\*(\d{4})/,
        /MIR-(\d{4})/,
        /СЧЁТ(\d{4})/
      ]
    }
  },
  {
    name: "Абсолют Банк",
    aliases: ["Абсолют Банк", "Absolut Bank", "ABSOLUTBANK"],
    packageNames: ["ru.absolutbank"],
    patterns: {
      amount: [
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|RUR|₽)/i
      ],
      balance: [
        /(?:Баланс|баланс|остаток|Остаток|Доступно)[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i
      ],
      card: [
        /\*(\d{4})/,
        /MIR-(\d{4})/,
        /СЧЁТ(\d{4})/
      ]
    }
  },
  {
    name: "МТС Деньги",
    aliases: ["МТС Деньги", "MTS Money", "MTSMONEY"],
    packageNames: ["ru.mts.money"],
    patterns: {
      amount: [
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|RUR|₽)/i
      ],
      balance: [
        /(?:Баланс|баланс|остаток|Остаток|Доступно)[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i
      ],
      card: [
        /\*(\d{4})/,
        /MIR-(\d{4})/,
        /СЧЁТ(\d{4})/
      ]
    }
  },
  {
    name: "Свой Банк",
    aliases: ["Свой Банк", "Svoy Bank", "SVOYBANK"],
    packageNames: ["ru.svoybank"],
    patterns: {
      amount: [
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|RUR|₽)/i
      ],
      balance: [
        /(?:Баланс|баланс|остаток|Остаток|Доступно)[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i
      ],
      card: [
        /\*(\d{4})/,
        /MIR-(\d{4})/,
        /СЧЁТ(\d{4})/
      ]
    }
  },
  {
    name: "Транскапиталбанк",
    aliases: ["Транскапиталбанк", "Transcapitalbank", "TRANSKAPITALBANK"],
    packageNames: ["ru.tkb"],
    patterns: {
      amount: [
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|RUR|₽)/i
      ],
      balance: [
        /(?:Баланс|баланс|остаток|Остаток|Доступно)[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i
      ],
      card: [
        /\*(\d{4})/,
        /MIR-(\d{4})/,
        /СЧЁТ(\d{4})/
      ]
    }
  },
  {
    name: "Долинск",
    aliases: ["Долинск", "Dolinsk", "DOLINSK"],
    packageNames: ["ru.dolinsk"],
    patterns: {
      amount: [
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|RUR|₽)/i
      ],
      balance: [
        /(?:Баланс|баланс|остаток|Остаток|Доступно)[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i
      ],
      card: [
        /\*(\d{4})/,
        /MIR-(\d{4})/,
        /СЧЁТ(\d{4})/
      ]
    }
  },
  {
    name: "Совкомбанк",
    aliases: ["Совкомбанк", "Sovcombank", "SOVCOMBANK"],
    packageNames: ["ru.ftc.faktura.sovkombank"],
    patterns: {
      amount: [
        /(?:Пополнение|Перевод).*?([\d\s]+(?:[.,]\d{2})?)\s*₽/i
      ],
      balance: [
        /Баланс[:|\s]+([\d\s]+(?:[.,]\d{2})?)\s*₽?/i
      ],
      card: [/\*(\d{4})/]
    }
  },
  {
    name: "Росбанк",
    aliases: ["Росбанк", "Rosbank", "ROSBANK"],
    packageNames: ["ru.rosbank", "ru.rosbank.android"],
    patterns: {
      amount: [
        /Перевод\s*\+?([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|RUR|₽)/i,
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|RUR|₽)/i
      ],
      balance: [
        /(?:Баланс|баланс|остаток|Остаток|Доступно)[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i
      ],
      card: [
        /\*(\d{4})/,
        /Карта\s*\*(\d{4})/,
        /MIR-(\d{4})/,
        /СЧЁТ(\d{4})/
      ]
    }
  },
  {
    name: "ЮниКредит",
    aliases: ["ЮниКредит", "UniCredit", "UNICREDIT"],
    packageNames: ["ru.unicredit"],
    patterns: {
      amount: [
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|RUR|₽)/i
      ],
      balance: [
        /(?:Баланс|баланс|остаток|Остаток|Доступно)[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i
      ],
      card: [
        /\*(\d{4})/,
        /MIR-(\d{4})/,
        /СЧЁТ(\d{4})/
      ]
    }
  },
  {
    name: "Ситибанк",
    aliases: ["Ситибанк", "Citibank", "CITIBANK"],
    packageNames: ["ru.citibank"],
    patterns: {
      amount: [
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|RUR|₽)/i
      ],
      balance: [
        /(?:Баланс|баланс|остаток|Остаток|Доступно)[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i
      ],
      card: [
        /\*(\d{4})/,
        /MIR-(\d{4})/,
        /СЧЁТ(\d{4})/
      ]
    }
  },
  {
    name: "Русский Стандарт",
    aliases: ["Русский Стандарт", "Russian Standard", "RUSSIANSTANDARD"],
    packageNames: ["ru.rsb"],
    patterns: {
      amount: [
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|RUR|₽)/i
      ],
      balance: [
        /(?:Баланс|баланс|остаток|Остаток|Доступно)[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i
      ],
      card: [
        /\*(\d{4})/,
        /MIR-(\d{4})/,
        /СЧЁТ(\d{4})/
      ]
    }
  },
  {
    name: "Открытие",
    aliases: ["Открытие", "Otkritie", "OTKRITIE", "Открытие Банк"],
    packageNames: ["com.openbank", "ru.openbank"],
    patterns: {
      amount: [
        /Пополнение\s+счета\s+на\s+([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|₽)/i,
        /(?:Перевод|Пополнение).*?([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|₽)/i,
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|₽)/i
      ],
      balance: [
        /Баланс[:|\s]+([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|₽)?/i
      ],
      card: [/\*(\d{4})/]
    }
  },
  {
    name: "Владбизнесбанк",
    aliases: ["Владбизнесбанк", "Vladbusinessbank", "VLADBUSINESSBANK"],
    packageNames: ["ru.vladbusinessbank"],
    patterns: {
      amount: [
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|RUR|₽)/i
      ],
      balance: [
        /(?:Баланс|баланс|остаток|Остаток|Доступно)[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i
      ],
      card: [
        /\*(\d{4})/,
        /MIR-(\d{4})/,
        /СЧЁТ(\d{4})/
      ]
    }
  },
  {
    name: "Таврический",
    aliases: ["Таврический", "Tavricheskiy", "TAVRICHESKIY"],
    packageNames: ["ru.tavricheskiy"],
    patterns: {
      amount: [
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|RUR|₽)/i
      ],
      balance: [
        /(?:Баланс|баланс|остаток|Остаток|Доступно)[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i
      ],
      card: [
        /\*(\d{4})/,
        /MIR-(\d{4})/,
        /СЧЁТ(\d{4})/
      ]
    }
  },
  {
    name: "Фора-Банк",
    aliases: ["Фора-Банк", "Forabank", "FORABANK"],
    packageNames: ["ru.forabank"],
    patterns: {
      amount: [
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|RUR|₽)/i
      ],
      balance: [
        /(?:Баланс|баланс|остаток|Остаток|Доступно)[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i
      ],
      card: [
        /\*(\d{4})/,
        /MIR-(\d{4})/,
        /СЧЁТ(\d{4})/
      ]
    }
  },
  {
    name: "GenericSMS",
    aliases: ["GenericSMS", "SMS", "GENERIC"],
    packageNames: [],
    patterns: {
      amount: [
        /([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|RUR|₽)/i,
        /(?:сумма|на сумму)[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i,
        /([+-]?[\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|RUR|₽)/i
      ],
      balance: [
        /(?:Баланс|баланс|остаток|Остаток|Доступно)[:|\s]+([\d\s]+(?:[.,]\d{2})?)\s*(?:руб|р|RUB|RUR|₽)?/i,
        /доступно[:|\s]+([\d\s]+(?:[.,]\d{2})?)/i
      ],
      card: [
        /\*(\d{4})/,
        /MIR-(\d{4})/,
        /СЧЁТ(\d{4})/,
        /(?:Карта|карта|Card)\s*\*?(\d{4})/
      ],
      sender_name: [
        /от\s+([А-ЯЁA-Z][а-яёa-z]+(?:\s+[А-ЯЁA-Z]\.?)*)/
      ]
    }
  }
];

// Helper function to map bank names to enum values
export function getBankTypeFromPattern(bankName: string): string {
  const mapping: Record<string, string> = {
    "СБП": "SBP",
    "Тинькофф": "TBANK",
    "Альфа-Банк": "ALFABANK",
    "Сбербанк": "SBERBANK",
    "ВТБ": "VTB",
    "Газпромбанк": "GAZPROMBANK",
    "Райффайзенбанк": "RAIFFEISEN",
    "Почта Банк": "POCHTABANK",
    "Озон Банк": "OZONBANK",
    "Хоум Кредит": "HOMECREDIT",
    "ОТП Банк": "OTPBANK",
    "ПСБ": "PROMSVYAZBANK",
    "МТС Банк": "MTSBANK",
    "УралСиб": "URALSIB",
    "МКБ": "MKB",
    "Банк Санкт-Петербург": "SPBBANK",
    "РНКБ": "RNKB",
    "Россельхозбанк": "ROSSELKHOZBANK",
    "Акбарс": "AKBARS",
    "Локо-Банк": "LOKOBANK",
    "Ренессанс Кредит": "RENAISSANCE",
    "Авангард": "AVANGARD",
    "БКС Банк": "BCSBANK",
    "ББР Банк": "BBRBANK",
    "Кредит Европа Банк": "CREDITEUROPE",
    "УБРИР": "UBRIR",
    "Генбанк": "GENBANK",
    "Синара": "SINARA",
    "Абсолют Банк": "ABSOLUTBANK",
    "МТС Деньги": "MTSMONEY",
    "Свой Банк": "SVOYBANK",
    "Транскапиталбанк": "TRANSKAPITALBANK",
    "Долинск": "DOLINSK",
    "Совкомбанк": "SOVCOMBANK",
    "Росбанк": "ROSBANK",
    "ЮниКредит": "UNICREDIT",
    "Ситибанк": "CITIBANK",
    "Русский Стандарт": "RUSSIANSTANDARD",
    "Открытие": "OPENBANK",
    "Владбизнесбанк": "VLADBUSINESSBANK",
    "Таврический": "TAVRICHESKIY",
    "Фора-Банк": "FORABANK",
    "Промсвязьбанк": "PROMSVYAZBANK"
  };
  
  return mapping[bankName] || bankName.toUpperCase().replace(/[\s-]/g, '');
}