import type { IBankParser, ParsedTransaction } from "./types";

export class BankSPBParser implements IBankParser {
  bankName = "Банк Санкт-Петербург";
  packageNames = ["com.bssys.bspb", "ru.bspb"];
  senderCodes = ["BankSPB", "БСПБ"];

  private patterns = [
    // "*0977 Зачислен перевод по СБП 12264RUB 16:54 от Владимир Олегович Л"
    /\*\d{4}\s+Зачислен\s+перевод\s+по\s+СБП\s+([\d\s]+(?:[.,]\d{1,2})?)\s*RUB\s+\d{1,2}:\d{2}\s+от\s+([А-Яа-яA-Za-z\s]+)/i,
    // "*1352 Зачислен перевод по СБП 3500RUB 00:30 от Данила Дмитриевич Г"
    /\*\d{4}\s+Зачислен\s+перевод\s+по\s+СБП\s+([\d\s]+(?:[.,]\d{1,2})?)\s*RUB\s+\d{1,2}:\d{2}\s+от\s+([А-Яа-яA-Za-z\s]+)/i,
    // BankSPB prefix
    /(?:BankSPB|БСПБ|Банк\s+Санкт-Петербург).*?(?:Зачислен|Пополнение|Перевод)\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб|RUB)/i,
    // СБП transfers
    /(?:Зачислен\s+)?перевод\s+по\s+СБП\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб|RUB)/i,
    // Simple format
    /(?:Поступление|Пополнение|Перевод|Зачисление|Зачислен)\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб|RUB)/i,
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
        
        return {
          amount: this.parseAmount(amount),
          currency: "RUB",
          senderName: senderName ? this.normalizeSenderName(senderName) : undefined,
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