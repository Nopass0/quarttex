import type { IBankParser, ParsedTransaction } from "./types";

export class GenericSmsParser implements IBankParser {
  bankName = "GenericSMS";
  packageNames: string[] = [];

  private patterns = [
    /(?:Поступление|Перевод|Пополнение)[^\d]*([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб)/i,
    /([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб).*?(?:зачисление|пополнение|перевод)/i,
  ];

  detect(message: string): boolean {
    return this.patterns.some((p) => p.test(message));
  }

  parse(message: string): ParsedTransaction | null {
    for (const pattern of this.patterns) {
      const match = message.match(pattern);
      if (match) {
        const [, amount] = match;
        return {
          amount: this.parseAmount(amount),
          currency: "RUB",
        };
      }
    }
    return null;
  }

  private parseAmount(amount: string): number {
    return parseFloat(amount.replace(/\s/g, "").replace(",", "."));
  }
}
