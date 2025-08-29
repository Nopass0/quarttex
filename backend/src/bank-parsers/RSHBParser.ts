import type { IBankParser, ParsedTransaction } from "./types";

export class RSHBParser implements IBankParser {
  bankName = "Россельхозбанк";
  packageNames = ["ru.rshb.mbank", "ru.rshb", "ru.rosselkhozbank.rshb"];
  senderCodes = ["RSHB", "РСХБ"];

  private patterns = [
    // "Успешный перевод СБП. Дмитрий Вячеславович З из Озон Банк (Ozon) Зачислено 999.00 RUR"
    /Успешный\s+перевод\s+СБП\.\s+([А-Яа-яA-Za-z\s]+)\s+из\s+.*?\s*Зачислено\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:RUR|RUB|₽|р|руб)/i,
    // RSHB prefix patterns
    /(?:RSHB|РСХБ|Россельхозбанк).*?(?:Пополнение|Перевод|Зачисление).*?([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб|RUB)/i,
    // "РСХБ +10000 руб"
    /РСХБ.*?\+\s*([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб|RUB)/i,
    // Generic patterns
    /(?:Пополнение|Перевод|Зачисление).*?([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб|RUB).*?(?:РСХБ|Россельхозбанк)/i,
    // Simple format
    /(?:Поступление|Пополнение|Перевод|Зачисление|Зачислено)\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб|RUB|RUR)/i,
  ];

  detect(message: string): boolean {
    return this.patterns.some(pattern => pattern.test(message));
  }

  parse(message: string): ParsedTransaction | null {
    for (const pattern of this.patterns) {
      const match = message.match(pattern);
      if (match) {
        // Handle different capture group positions
        let amount: string;
        let senderName: string | undefined;
        
        if (pattern.source.includes("Успешный") && match.length === 3) {
          // For СБП pattern, sender is first, amount is second
          senderName = match[1];
          amount = match[2];
        } else {
          // For other patterns, amount is first
          amount = match[1];
          senderName = match[2];
        }
        
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