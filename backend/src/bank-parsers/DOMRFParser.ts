import type { IBankParser, ParsedTransaction } from "./types";

export class DOMRFParser implements IBankParser {
  bankName = "ДОМ.РФ";
  packageNames = ["ru.domrf.mobile", "com.domrf.mobile", "ru.bank.domrf"];
  senderCodes = ["Bank_DOM.RF", "DOM.RF"];

  private patterns = [
    // "Пополнение +10 110.00 RUB на счет **8577 по СБП от ДАВИД АЛЕКСАНДРОВИЧ Ш. успешно. Доступно 11 612.00 RUB"
    /Пополнение\s*\+?\s*([\d\s]+(?:[.,]\d{1,2})?)\s*RUB\s+на\s+счет\s+\*{0,2}\d+\s+по\s+СБП\s+от\s+([А-ЯA-Z\s]+)\.\s*успешно\.\s*Доступно\s+([\d\s]+(?:[.,]\d{1,2})?)\s*RUB/i,
    // Simplified pattern for Bank_DOM.RF messages
    /(?:Bank_)?DOM\.?RF.*?Пополнение\s*\+?\s*([\d\s]+(?:[.,]\d{1,2})?)\s*(?:RUB|₽|р|руб)/i,
    // Generic patterns
    /Пополнение\s*\+?\s*([\d\s]+(?:[.,]\d{1,2})?)\s*(?:RUB|₽|р|руб).*?(?:по\s+СБП|СБП)/i,
    /(?:Поступление|Перевод|Зачисление)\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:RUB|₽|р|руб).*?ДОМ\.РФ/i,
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