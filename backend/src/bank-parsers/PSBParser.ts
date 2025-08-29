import type { IBankParser, ParsedTransaction } from "./types";

export class PSBParser implements IBankParser {
  bankName = "ПСБ";
  packageNames = ["ru.psbank.mobile", "ru.psbank", "ru.promsvyazbank"];

  private patterns = [
    // "СЧЁТ5154 16:04 зачисление 50 000р ПСБ Баланс: 50 001.2р"
    /СЧЁТ\d+\s+\d{1,2}:\d{2}\s+зачисление\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р\s*ПСБ\s*Баланс:\s*([\d\s]+(?:[.,]\d{1,2})?)\s*р/i,
    // "*8454 Пополнение 1000p 1CUPIS.RU Доступно 1480,06p"
    /\*\d{4}\s+Пополнение\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:р|p|₽)\s+.*?Доступно\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:р|p|₽)/i,
    // Generic patterns for PSB
    /ПСБ.*?(?:Пополнение|Перевод|Зачисление).*?([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб)/i,
    /(?:Пополнение|Перевод|Зачисление).*?([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб).*?ПСБ/i,
    // Simple format
    /(?:Поступление|Пополнение|Перевод|Зачисление)\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб|RUB)/i,
    // "C2C PSB M F" transfers
    /C2C\s+PSB.*?(?:Пополнение|Перевод|зачисление)?\s*([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб|RUB)/i,
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