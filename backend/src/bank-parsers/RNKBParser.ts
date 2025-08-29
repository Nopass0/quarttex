import type { IBankParser, ParsedTransaction } from "./types";

export class RNKBParser implements IBankParser {
  bankName = "РНКБ";
  packageNames = ["com.fakemobile.rnkb", "ru.rnkb"];

  private patterns = [
    // "СЧЁТ5154 14:59 Перевод из РНКБ Банк +45677р от ЕВГЕНИЙ Г. Баланс: 45677р"
    /Перевод\s+из\s+РНКБ\s+Банк\s*\+?\s*([\d\s]+(?:[.,]\d{1,2})?)\s*(?:р|₽|руб)\s+от\s+([А-ЯA-Z\s]+)\.\s*Баланс:\s*([\d\s]+(?:[.,]\d{1,2})?)\s*р/i,
    // "СЧЁТ8749 13.03.25 зачислен перевод по СБП 5100р из РНКБ Банк от ЕВГЕНИЙ АНДРЕЕВИЧ О."
    /зачислен\s+перевод\s+по\s+СБП\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:р|₽|руб)\s+из\s+РНКБ\s+Банк\s+от\s+([А-ЯA-Z\s]+)/i,
    // Generic patterns
    /РНКБ(?:\s+Банк)?.*?(?:Пополнение|Перевод|Зачисление).*?([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб|RUB)/i,
    /(?:Пополнение|Перевод|Зачисление).*?([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб|RUB).*?РНКБ/i,
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
        const senderName = match[2];
        const balance = match[3];
        
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
    const words = name.trim().split(/\s+/);
    return words.map((word, index) => {
      if (word.length === 1 || word.endsWith(".")) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(" ");
  }
}