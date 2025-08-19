import type { IBankParser, ParsedTransaction } from "./types";

export class AlfabankParser implements IBankParser {
  bankName = "Альфа-Банк";
  packageNames = ["ru.alfabank.mobile.android"];

  private patterns = [
    // "Альфа-Банк | Пополнение на 181 ₽, счет RUB. Полина П. Доступно 4 722 ₽"
    /Альфа[\-\s]?Банк\s*\|\s*Пополнение\s+на\s+([\d\s]+(?:[.,]\d{1,2})?)\s*₽[^.]*\.\s*([А-Яа-яA-Za-z]+\s+[А-Яа-яA-Z]\.).*?Доступно\s+([\d\s]+(?:[.,]\d{1,2})?)\s*₽/i,
    // "Пополнение +25000. Доступно: 45320р. Альфа-Банк"
    /Пополнение\s*\+?([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб)?\.?\s*Доступно:\s*([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб)?\.?\s*Альфа[\-\s]?Банк/i,
    // "Поступление 5000 руб. на карту *1234"
    /Поступление\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб)\.?\s+на\s+карту\s*\*?\d+/i,
    // SMS "Карта *1234 пополнение 1000р"
    /карт(?:а|ы)?\s*\*?\d{2,4}[^\d]*(?:пополнение|зачисление)\s*([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб)/i,
    // "Вам перевели 1 000 ₽"
    /Вам\s+(?:перевели|поступил(?:о)?)\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб)/i,
  ];

  detect(message: string): boolean {
    return this.patterns.some(pattern => pattern.test(message));
  }

  parse(message: string): ParsedTransaction | null {
    for (const pattern of this.patterns) {
      const match = message.match(pattern);
      if (match) {
        if (match.length === 4) {
          // Pattern with sender name
          const [, amount, senderName, balance] = match;
          return {
            amount: this.parseAmount(amount),
            currency: "RUB",
            senderName: senderName.trim(),
            balance: balance ? this.parseAmount(balance) : undefined,
          };
        } else if (match.length === 3) {
          // Pattern without sender name
          const [, amount, balance] = match;
          return {
            amount: this.parseAmount(amount),
            currency: "RUB",
            balance: balance ? this.parseAmount(balance) : undefined,
          };
        } else if (match.length === 2) {
          // Simple pattern
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