import type { IBankParser, ParsedTransaction } from "./types";

export class SberbankParser implements IBankParser {
  bankName = "Сбербанк";
  packageNames = ["ru.sberbankmobile", "ru.sberbank", "ru.sberbank.android"];
  
  // Special sender codes
  senderCodes = ["900"];

  private patterns = [
    // "СЧЁТ2538 25.07 16:37 зачисление 5000р от Test Client Баланс: 125000.50р"
    /СЧЁТ\d+\s+\d{1,2}\.\d{1,2}\s+\d{1,2}:\d{2}\s+зачисление\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р(?:уб)?\.?\s+от\s+([А-Яа-яA-Za-z\s]+)\s+Баланс:\s*([\d\s]+(?:[.,]\d{1,2})?)\s*р/i,
    // "СБЕРБАНК. Перевод 15000р от ИВАН И. Баланс: 25000р"
    /СБЕРБАНК\.\s*(?:Перевод|Пополнение)\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р(?:уб)?\.?\s+от\s+([А-ЯA-Z\s]+)\.\s*Баланс:\s*([\d\s]+(?:[.,]\d{1,2})?)\s*р/i,
    // "Сбербанк | Пополнение на 300 ₽, счет RUB. Рамазан Г. Доступно 5 838 ₽"
    /Сбербанк\s*\|\s*Пополнение\s+на\s+([\d\s]+(?:[.,]\d{1,2})?)\s*₽[^.]*\.\s*([А-Яа-яA-Za-z]+\s+[А-Яа-яA-Z]\.).*?Доступно\s+([\d\s]+(?:[.,]\d{1,2})?)\s*₽/i,
    // Simple format with зачисление
    /(?:Перевод|Пополнение|зачисление)\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб).*?от\s+([А-Яа-яA-Za-z\s]+)/i,
    // SMS "VISA1234 25.07.24 12:34 Зачисление 5000р"
    /\b(?:VISA|MASTERCARD|МИР)?\d{0,4}\s+\d{1,2}\.\d{1,2}(?:\.\d{2,4})?\s+зачисление\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р/i,
    // "Вам перевели 1 000 ₽"
    /Вам\s+(?:перевели|поступил(?:о)?)\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб)/i,
    // "СЧЁТ6334 08.05.25 зачислен перевод по СБП 25000р из Альфа-Банк от МАКСИМ ИВАНОВИЧ Е. Сообщение: Перевод денежных средств."
    /СЧЁТ\d+\s+\d{1,2}\.\d{1,2}\.\d{2}\s+зачислен\s+перевод\s+по\s+СБП\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р\s+из\s+[А-Яа-я-]+\s+от\s+([А-ЯA-Z\s]+)\.\s*Сообщение:/i,
    // "СЧЁТ5154 14:59 Перевод из РНКБ Банк +45677р от ЕВГЕНИЙ Г. Баланс: 45677р" 
    /СЧЁТ\d+\s+\d{1,2}:\d{2}\s+Перевод\s+из\s+[А-Яа-я\s-]+\s*\+?\s*([\d\s]+(?:[.,]\d{1,2})?)\s*р\s+от\s+([А-ЯA-Z\s]+)\.\s*Баланс:\s*([\d\s]+(?:[.,]\d{1,2})?)\s*р/i,
    // "MIR-0441 13:49 Перевод 3000р от Александр Е. Баланс: 3363.48р"
    /MIR-\d+\s+\d{1,2}:\d{2}\s+Перевод\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р\s+от\s+([А-Яа-яA-Za-z\s]+)\.\s*Баланс:\s*([\d\s]+(?:[.,]\d{1,2})?)\s*р/i,
    // "MIR-0441 23:03 зачисление 5005р C2C AMOBILE Баланс: 5403.29р"
    /MIR-\d+\s+\d{1,2}:\d{2}\s+зачисление\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р\s+.*?\s*Баланс:\s*([\d\s]+(?:[.,]\d{1,2})?)\s*р/i,
    // "ПЛАТ.СЧЕТ6334 14:09 Роман Н. перевел(а) вам 10 000р."
    /ПЛАТ\.?СЧЕТ\d+\s+\d{1,2}:\d{2}\s+([А-Яа-яA-Za-z\s]+\.?)\s+перевел\(а\)\s+вам\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р/i,
    // СБП transfers from 900
    /зачислен\s+перевод\s+по\s+СБП\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:р|₽|руб|RUB)/i,
  ];

  detect(message: string): boolean {
    return this.patterns.some(pattern => pattern.test(message));
  }

  parse(message: string): ParsedTransaction | null {
    for (const pattern of this.patterns) {
      const match = message.match(pattern);
      if (match) {
        let amount: string;
        let senderName: string | undefined;
        let balance: string | undefined;
        
        // Handle different pattern structures
        if (pattern.source.includes("перевел\\(а\\)")) {
          // "ПЛАТ.СЧЕТ6334 14:09 Роман Н. перевел(а) вам 10 000р."
          senderName = match[1];
          amount = match[2];
        } else {
          // Standard pattern: amount first
          amount = match[1];
          senderName = match[2];
          balance = match[3];
        }

        return {
          amount: this.parseAmount(amount),
          currency: "RUB",
          senderName: senderName ? this.normalizeSenderName(senderName) : undefined,
          balance: balance ? this.parseAmount(balance) : undefined,
        };
      }
    }
    return null;
  }

  private parseAmount(amount: string): number {
    return parseFloat(amount.replace(/\s/g, "").replace(",", "."));
  }

  private normalizeSenderName(name: string): string {
    // Convert "ИВАН И." to "Иван И."
    const words = name.trim().split(/\s+/);
    return words.map((word, index) => {
      if (word.length === 1 || word.endsWith(".")) {
        return word; // Keep initials as is
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(" ");
  }
}