import type { IBankParser, ParsedTransaction } from "./types";

export class TinkoffParser implements IBankParser {
  bankName = "Тинькофф";
  packageNames = ["com.idamob.tinkoff.android", "ru.tinkoff", "ru.tinkoff.sme"];
  senderCodes = ["T-Bank", "Т-Банк"];

  private patterns = [
    // "Тинькофф | Пополнение на 352 ₽, счет RUB. Ольга С. Доступно 3 568 ₽"
    /(?:Тинькофф|Т-Банк|Tinkoff)\s*\|?\s*Пополнение\s+на\s+([\d\s]+(?:[.,]\d{1,2})?)\s*₽[^.]*\.\s*([А-Яа-яA-Za-z]+\s+[А-Яа-яA-Z]\.).*?Доступно\s+([\d\s]+(?:[.,]\d{1,2})?)\s*₽/i,
    // "Пополнение, счет RUB. 2000 RUB. Ольга М. Доступно 5100 RUB"
    /Пополнение,\s*счет\s*RUB\.\s*([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|RUB)\.\s*([А-Яа-яA-Za-z]+\s+[А-Яа-яA-Z]\.).*?Доступно\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|RUB)/i,
    // "| Пополнение на 200 ₽, счет RUB. Валерия Г. Доступно 5 412 ₽"
    /\|\s*Пополнение\s+на\s+([\d\s]+(?:[.,]\d{1,2})?)\s*₽[^.]*\.\s*([А-Яа-яA-Za-z]+\s+[А-Яа-яA-Z]\.).*?Доступно\s+([\d\s]+(?:[.,]\d{1,2})?)\s*₽/i,
    // Other banks through Tinkoff: "Альфа-Банк | Пополнение на 181 ₽, счет RUB. Полина П. Доступно 4 722 ₽"
    /([А-Яа-я\-\s]+)\s*\|\s*Пополнение\s+на\s+([\d\s]+(?:[.,]\d{1,2})?)\s*₽[^.]*\.\s*([А-Яа-яA-Za-z]+\s+[А-Яа-яA-Z]\.).*?Доступно\s+([\d\s]+(?:[.,]\d{1,2})?)\s*₽/i,
    // SMS format "Пополнение карты ****1234 на 1000р"
    /Пополнение\s+карты[^\d]*\d{2,4}[^\d]*([\d\s]+(?:[.,]\d{1,2})?)\s*р/i,
    // "Вам перевели 1 000 ₽"
    /Вам\s+(?:перевели|поступил(?:о)?)\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб)/i,
  ];

  detect(message: string): boolean {
    return this.patterns.some(pattern => pattern.test(message));
  }

  parse(message: string): ParsedTransaction | null {
    for (const pattern of this.patterns) {
      const match = message.match(pattern);
      if (match) {
        let amount: string;
        let senderName: string;
        let balance: string | undefined;

        if (match.length === 4) {
          // Pattern without bank name prefix
          [, amount, senderName, balance] = match;
        } else if (match.length === 5) {
          // Pattern with bank name prefix
          [, , amount, senderName, balance] = match;
        } else if (match.length === 2) {
          // Simple pattern without sender/balance
          [, amount] = match;
        } else {
          continue;
        }

        return {
          amount: this.parseAmount(amount),
          currency: "RUB",
          senderName: senderName ? senderName.trim() : undefined,
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