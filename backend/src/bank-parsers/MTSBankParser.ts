import type { IBankParser, ParsedTransaction } from "./types";

export class MTSBankParser implements IBankParser {
  bankName = "МТС Банк";
  packageNames = ["ru.mtsbank.mobile", "ru.mtsbank.android", "ru.mtsbank"];
  senderCodes = ["MTS-Bank", "МТС-Банк"];

  private patterns = [
    // "Перевод на карту 5 000,00 RUB PEREVOD DR BANK Остаток: 5 122,50 RUB; *9131"
    /Перевод\s+на\s+карту\s+([\d\s]+(?:[.,]\d{1,2})?)\s*RUB.*?Остаток:\s*([\d\s]+(?:[.,]\d{1,2})?)\s*RUB/i,
    // "Поступление 5000р. Вадим Денисович Д через СБП."
    /Поступление\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:р|₽|руб|RUB)\.\s*([А-Яа-яA-Za-z\s]+)\s+через\s+СБП/i,
    // "СЧЁТ6001 23:15 Перевод из МТС-Банк +10000р от ДЕНИС Х. Баланс: 32428.74р"
    /Перевод\s+из\s+МТС-Банк\s*\+?\s*([\d\s]+(?:[.,]\d{1,2})?)\s*(?:р|₽|руб)\s+от\s+([А-ЯA-Z\s]+)\.\s*Баланс:\s*([\d\s]+(?:[.,]\d{1,2})?)\s*р/i,
    // MTS-Bank prefix
    /(?:MTS-Bank|МТС\s*Банк).*?(?:Перевод|Пополнение|Поступление)\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб|RUB)/i,
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
        const balance = match[3] || match[2]; // Balance might be in different position
        
        return {
          amount: this.parseAmount(amount),
          currency: "RUB",
          senderName: senderName && !this.isBalance(senderName) ? this.normalizeSenderName(senderName) : undefined,
          balance: balance && this.isBalance(balance) ? this.parseAmount(balance) : undefined,
        };
      }
    }
    return null;
  }

  private parseAmount(amount: string): number {
    return parseFloat(amount.replace(/\s/g, "").replace(",", "."));
  }

  private isBalance(str: string): boolean {
    return /\d/.test(str) && !/[А-Яа-яA-Za-z]{2,}/.test(str);
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