import type { IBankParser, ParsedTransaction } from "./types";

export class OTPBankParser implements IBankParser {
  bankName = "ОТП Банк";
  packageNames = ["ru.otpbank", "ru.otpbank.mobile"];
  senderCodes = ["OTP Bank", "ОТП Банк", "OTPBank"];

  private patterns = [
    // "ОТП Банк | Пополнение на 500 ₽, счет RUB. Иван И. Доступно 1 500 ₽"
    /(?:ОТП\s*Банк|OTP)\s*\|?\s*Пополнение\s+на\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|RUB)[^.]*\.\s*([А-Яа-яA-Za-z]+\s+[А-Яа-яA-Z]\.).*?Доступно\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|RUB)/i,
    // Generic pattern
    /(?:ОТП\s*Банк|OTP).*?(?:Пополнение|Перевод|Зачисление|Поступление)\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|руб|RUB|р)/i,
    // "Счет *0084 зачисление 30000р. Доступно 30755.03р. otpbank.ru/tr"
    /Счет\s*\*\d{4}\s+зачисление\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р\.?\s*Доступно\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р.*?otpbank/i,
    // SMS "Карта *1234 пополнение 1000р"
    /карт(?:а|ы)?\s*\*?\d{2,4}[^\d]*(?:пополнение|зачисление)\s*([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|руб|RUB|р)/i,
    // "Вам перевели 1 000 ₽"
    /Вам\s+(?:перевели|поступил(?:о)?)\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|руб|RUB|р)/i,
  ];

  detect(message: string): boolean {
    return this.patterns.some(pattern => pattern.test(message));
  }

  parse(message: string): ParsedTransaction | null {
    for (const pattern of this.patterns) {
      const match = message.match(pattern);
      if (match) {
        if (match.length === 4) {
          const [, amount, senderName, balance] = match;
          return {
            amount: this.parseAmount(amount),
            currency: "RUB",
            senderName: senderName?.trim(),
            balance: balance ? this.parseAmount(balance) : undefined,
          };
        } else if (match.length === 3) {
          const [, amount, balance] = match;
          return {
            amount: this.parseAmount(amount),
            currency: "RUB",
            balance: balance ? this.parseAmount(balance) : undefined,
          };
        } else if (match.length === 2) {
          const [, amount] = match;
          return {
            amount: this.parseAmount(amount),
            currency: "RUB",
          };
        }
      }
    }
    return null;
  }

  private parseAmount(amount: string): number {
    return parseFloat(amount.replace(/\s/g, "").replace(",", "."));
  }
}
