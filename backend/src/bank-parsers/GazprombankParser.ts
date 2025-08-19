import type { IBankParser, ParsedTransaction } from "./types";

export class GazprombankParser implements IBankParser {
  bankName = "Газпромбанк";
  packageNames = ["ru.gazprombank.android.mobilebank.app"];

  private patterns = [
    // "Газпромбанк | Пополнение на 215 ₽, счет RUB. Виталий Б. Доступно 1 693,42 ₽"
    /Газпромбанк\s*\|\s*Пополнение\s+на\s+([\d\s]+(?:[.,]\d{1,2})?)\s*₽[^.]*\.\s*([А-Яа-яA-Za-z]+\s+[А-Яа-яA-Z]\.).*?Доступно\s+([\d\s,]+(?:\.\d{1,2})?)\s*₽/i,
    // Generic pattern
    /Газпромбанк.*?(?:Пополнение|Перевод|Зачисление)\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб)/i,
    // SMS "VISA1234 поступление 1500р"
    /\b\w*\d{2,4}\b[^\d]*(?:поступление|пополнение|перевод)\s*([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб)/i,
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
          const [, amount, senderName, balance] = match;
          return {
            amount: this.parseAmount(amount),
            currency: "RUB",
            senderName: senderName.trim(),
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