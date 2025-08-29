import type { IBankParser, ParsedTransaction } from "./types";

export class UralSibParser implements IBankParser {
  bankName = "УралСиб";
  packageNames = ["ru.uralsib.mobile", "ru.uralsib.mb", "ru.uralsib"];
  senderCodes = ["UBRR", "УралСиб"];

  private patterns = [
    // "Пополнение *2301 Сумма 3000.00 р Остаток 12663.20 р T-Bank Card2Ca"
    /Пополнение\s*\*\d+\s+Сумма\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р\s+Остаток\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р/i,
    // UBRR prefix
    /UBRR.*?Пополнение\s*\*?\d*\s*Сумма\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р/i,
    // Generic patterns
    /УралСиб.*?(?:Пополнение|Перевод|Зачисление).*?([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб|RUB)/i,
    /(?:Пополнение|Перевод|Зачисление).*?([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб|RUB).*?УралСиб/i,
    // Simple format
    /(?:Поступление|Пополнение|Перевод|Зачисление)\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб|RUB)/i,
  ];

  detect(message: string): boolean {
    return this.patterns.some(pattern => pattern.test(message));
  }

  parse(message: string): ParsedTransaction | null {
    for (const pattern of this.patterns) {
      const match = message.match(pattern);
      if (match) {
        const amount = match[1];
        const balance = match[2];
        
        return {
          amount: this.parseAmount(amount),
          currency: "RUB",
          balance: balance ? this.parseAmount(balance) : undefined,
        };
      }
    }
    return null;
  }

  private parseAmount(amount: string): number {
    return parseFloat(amount.replace(/\s/g, "").replace(",", "."));
  }
}