import { describe, expect, test } from "bun:test";
import { BankRegexFactory } from "../src/bank-parsers";

describe("Bank regex parsing", () => {
  const factory = new BankRegexFactory();

  const cases = [
    { bank: "Тинькофф", message: "Вам перевели 1 500 ₽", amount: 1500 },
    { bank: "Тинькофф", message: "Пополнение, счет RUB. 2 000 RUB. Ольга М. Доступно 5 100 RUB", amount: 2000 },
    { bank: "Сбербанк", message: "Вам перевели 2 000 руб", amount: 2000 },
    { bank: "Хоум Кредит", message: "Вам перевели 700 ₽", amount: 700 },
    { bank: "ОТП Банк", message: "ОТП Банк | Пополнение на 1 000 ₽, счет RUB. Иван И. Доступно 5 000 ₽", amount: 1000 },
  ];

  for (const { bank, message, amount } of cases) {
    test(`${bank} message`, () => {
      const parser = factory.getParser(bank);
      expect(parser).toBeDefined();
      const result = parser!.parse(message);
      expect(result).toBeTruthy();
      expect(result?.amount).toBe(amount);
    });
  }
});
