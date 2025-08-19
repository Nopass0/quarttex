import { describe, expect, test } from "bun:test";
import { NotificationMatcherService } from "../src/services/NotificationMatcherService";

const service = new NotificationMatcherService() as any;

describe("notification amount extraction", () => {
  test("extracts amounts from OTP Bank message", () => {
    const msg = "Счет *4420 зачисление 6150р. Доступно 19177р. otpbank.ru/tr";
    const amounts = service.extractAmounts(msg);
    expect(amounts).toEqual(expect.arrayContaining([6150, 19177, 4420]));
  });

  test("extracts amount from SBP message without currency", () => {
    const msg = "Поступление 3201 Счет*1234 SBP";
    const amounts = service.extractAmounts(msg);
    expect(amounts).toEqual(expect.arrayContaining([3201, 1234]));
  });

  test("extracts amounts from Sberbank message", () => {
    const msg = "Сбербанк. Пополнение 500р. Баланс 1500р. Счет*1234";
    const amounts = service.extractAmounts(msg);
    expect(amounts).toEqual(expect.arrayContaining([500, 1500, 1234]));
  });
});
