import type { IBankParser, ParsedTransaction } from "./types";

export class HomeCreditParser implements IBankParser {
  bankName = "Хоум Кредит";
  packageNames = ["ru.homecredit.smartbank", "ru.homecredit"];

  private patterns = [
    // "Хоум Кредит | Пополнение на 500 ₽, счет RUB. Иван И. Доступно 1 500 ₽"
    /(?:Хоум\s+Кредит|Home\s+Credit)\s*\|\s*Пополнение\s+на\s+([\d\s]+(?:[.,]\d{1,2})?)\s*₽[^.]*\.\s*([А-Яа-яA-Za-z]+\s+[А-Яа-яA-Z]\.).*?Доступно\s+([\d\s]+(?:[.,]\d{1,2})?)\s*₽/i,
    // Generic pattern
    /(?:Хоум\s+Кредит|Home\s+Credit).*?(?:Пополнение|Перевод|Зачисление|Поступление)\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб)/i,
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
