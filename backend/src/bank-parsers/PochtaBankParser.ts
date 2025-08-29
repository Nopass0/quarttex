import type { IBankParser, ParsedTransaction } from "./types";

export class PochtaBankParser implements IBankParser {
  bankName = "Почта Банк";
  packageNames = ["ru.pochta.bank", "ru.pochtabank"];

  private patterns = [
    // "СЧЁТ6686 15:26 Перевод из Почта Банк +31749р от АЛЕНА К. Баланс: 55474.45р"
    /Перевод\s+из\s+Почта\s+Банк\s*\+?\s*([\d\s]+(?:[.,]\d{1,2})?)\s*(?:р|₽|руб)\s+от\s+([А-ЯA-Z\s]+)\.\s*Баланс:\s*([\d\s]+(?:[.,]\d{1,2})?)\s*р/i,
    // Generic patterns
    /Почта\s+Банк.*?(?:Пополнение|Перевод|Зачисление).*?([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб|RUB)/i,
    /(?:Пополнение|Перевод|Зачисление).*?([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб|RUB).*?Почта\s+Банк/i,
    // "Вам поступил перевод 5000 руб"
    /Вам\s+поступил\s+перевод\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб|RUB)/i,
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