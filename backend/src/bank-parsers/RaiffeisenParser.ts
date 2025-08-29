import type { IBankParser, ParsedTransaction } from "./types";

export class RaiffeisenParser implements IBankParser {
  bankName = "Райффайзенбанк";
  packageNames = ["ru.raiffeisen.mobile.new", "ru.raiffeisen", "ru.raiffeisenbank"];

  private patterns = [
    // "СЧЁТ6686 16:24 Перевод из Райффайзенбанк +20000р от ВАДИМ Ш. Баланс: 21024.48р"
    /Перевод\s+из\s+Райффайзенбанк\s*\+?\s*([\d\s]+(?:[.,]\d{1,2})?)\s*(?:р|₽|руб)\s+от\s+([А-ЯA-Z\s]+)\.\s*Баланс:\s*([\d\s]+(?:[.,]\d{1,2})?)\s*р/i,
    // "СЧЁТ8510 02:59 Перевод из Райффайзенбанк +5000р от МАКСИМ Д. Баланс: 5800.02р"
    /Перевод\s+из\s+Райффайзенбанк\s*\+?\s*([\d\s]+(?:[.,]\d{1,2})?)\s*(?:р|₽|руб)\s+от\s+([А-ЯA-Z\s]+)\.\s*Баланс:\s*([\d\s]+(?:[.,]\d{1,2})?)\s*р/i,
    // Generic patterns
    /Райффайзен(?:банк)?.*?(?:Пополнение|Перевод|Зачисление).*?([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб|RUB)/i,
    /(?:Пополнение|Перевод от|Зачисление).*?([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб|RUB).*?Райффайзен/i,
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