import type { IBankParser, ParsedTransaction } from "./types";

export class VTBParser implements IBankParser {
  bankName = "ВТБ";
  packageNames = ["ru.vtb24.mobilebanking.android"];

  private patterns = [
    // "ВТБ Онлайн | Поступление 55р Счет*0347 от Михаил Р. Баланс 143р 18:33"
    /ВТБ(?:\s+Онлайн)?\s*\|\s*(?:Поступление|Перевод|Пополнение)\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р(?:уб)?\.?\s+Счет[*\s]*\d+\s+от\s+([А-Яа-яA-Za-z]+\s+[А-Яа-яA-Z]\.).*?Баланс\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р/i,
    // "ВТБ: зачисление 10000р. Отправитель: ООО КОМПАНИЯ"
    /ВТБ:\s*(?:зачисление|перевод|пополнение)\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р(?:уб)?\.?\s*Отправитель:\s*([А-Яа-яA-Za-z\s\-"'«»]+)/i,
    // SMS format "Поступление 1000р карта *1234"
    /Поступление\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р.*?карта/i,
    // "Вам перевели 1 000 ₽"
    /Вам\s+(?:перевели|поступил(?:о)?)\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб)/i,
    // "Поступление 1234 Счет*5715 от ИЛЬМАН Д. Баланс 188911.53р 23:43"
    /Поступление\s+([\d\s]+(?:[.,]\d{1,2})?)\s+Счет[*\s]*\d+\s+от\s+([А-Яа-яA-Za-z\s]+\.).*?Баланс\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р/i,
    // "Поступление 100р Счет*5715 от ИЛЬМАН Д. Баланс 189011.53р 00:11"
    /Поступление\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р\s+Счет[*\s]*\d+\s+от\s+([А-Яа-яA-Za-z\s]+\.).*?Баланс\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р/i,
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