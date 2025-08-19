import { test, expect, beforeAll, afterAll } from "bun:test";
import { db } from "../src/db";
import { Status, TransactionType, MethodType, BankType, Currency } from "@prisma/client";

// Test that inactive requisites are not selected for transactions
test("Inactive requisites should not be selected for transactions", async () => {
  // Create a test merchant
  const merchant = await db.merchant.create({
    data: {
      name: "Test Merchant Requisite",
      token: "test-merchant-token-" + Date.now(),
      apiKeyPublic: "test-public-key-" + Date.now(),
      apiKeyPrivate: "test-private-key-" + Date.now(),
      disabled: false,
      countInRubEquivalent: false,
    }
  });

  // Create a test method
  const method = await db.method.create({
    data: {
      code: "test-c2c-" + Date.now(),
      name: "Test C2C",
      type: MethodType.c2c,
      isEnabled: true,
      minPayin: 100,
      maxPayin: 100000,
      minPayout: 100,
      maxPayout: 100000,
      currency: Currency.rub,
      commissionPayin: 0,
      commissionPayout: 0,
      chancePayin: 100,
      chancePayout: 100,
    }
  });

  // Create merchant method
  await db.merchantMethod.create({
    data: {
      merchantId: merchant.id,
      methodId: method.id,
      isEnabled: true,
    }
  });

  // Create a test trader
  const trader = await db.user.create({
    data: {
      email: "test-trader-requisite-" + Date.now() + "@test.com",
      name: "Test Trader Requisite",
      password: "password123",
      banned: false,
      balanceUsdt: 5000,
      balanceRub: 10000,
      trafficEnabled: true,
      deposit: 5000,
      minAmountPerRequisite: 100,
      maxAmountPerRequisite: 50000,
      trustBalance: 10000,
    }
  });

  // Connect trader to merchant
  await db.traderMerchant.create({
    data: {
      traderId: trader.id,
      merchantId: merchant.id,
      methodId: method.id,
      isMerchantEnabled: true,
      isFeeInEnabled: true,
    }
  });

  // Create an active requisite
  const activeRequisite = await db.bankDetail.create({
    data: {
      userId: trader.id,
      methodType: MethodType.c2c,
      bankType: BankType.tbank,
      cardNumber: "1234567890123456",
      holderName: "Active Requisite",
      recipientName: "Active Test",
      isActive: true,
      isArchived: false,
      minAmount: 100,
      maxAmount: 50000,
      dailyLimit: 500000,
      monthlyLimit: 10000000,
      maxCountTransactions: 0,
    }
  });

  // Create an inactive requisite (should not be selected)
  const inactiveRequisite = await db.bankDetail.create({
    data: {
      userId: trader.id,
      methodType: MethodType.c2c,
      bankType: BankType.sber,
      cardNumber: "9876543210987654",
      holderName: "Inactive Requisite",
      recipientName: "Inactive Test",
      isActive: false, // This requisite is inactive
      isArchived: false,
      minAmount: 100,
      maxAmount: 50000,
      dailyLimit: 500000,
      monthlyLimit: 10000000,
      maxCountTransactions: 0,
    }
  });

  // Query for available requisites (simulating what the merchant endpoint does)
  const availableRequisites = await db.bankDetail.findMany({
    where: {
      isArchived: false,
      isActive: true, // Only active requisites
      methodType: method.type,
      userId: trader.id,
      user: {
        banned: false,
        deposit: { gte: 1000 },
        trafficEnabled: true
      }
    }
  });

  // Verify that only active requisite is returned
  expect(availableRequisites.length).toBe(1);
  expect(availableRequisites[0].id).toBe(activeRequisite.id);
  expect(availableRequisites[0].isActive).toBe(true);

  // Verify inactive requisite is not included
  const inactiveFound = availableRequisites.some(r => r.id === inactiveRequisite.id);
  expect(inactiveFound).toBe(false);

  // Clean up
  await db.bankDetail.deleteMany({ where: { userId: trader.id } });
  await db.traderMerchant.deleteMany({ where: { traderId: trader.id } });
  await db.user.delete({ where: { id: trader.id } });
  await db.merchantMethod.deleteMany({ where: { merchantId: merchant.id } });
  await db.method.delete({ where: { id: method.id } });
  await db.merchant.delete({ where: { id: merchant.id } });
});

// Test that requisites from stopped devices are not selected
test("Requisites from stopped devices should not be selected", async () => {
  // Create a test merchant
  const merchant = await db.merchant.create({
    data: {
      name: "Test Merchant Device",
      token: "test-merchant-token-device-" + Date.now(),
      apiKeyPublic: "test-public-key-device-" + Date.now(),
      apiKeyPrivate: "test-private-key-device-" + Date.now(),
      disabled: false,
      countInRubEquivalent: false,
    }
  });

  // Create a test method
  const method = await db.method.create({
    data: {
      code: "test-sbp-" + Date.now(),
      name: "Test SBP",
      type: MethodType.sbp,
      isEnabled: true,
      minPayin: 100,
      maxPayin: 100000,
      minPayout: 100,
      maxPayout: 100000,
      currency: Currency.rub,
      commissionPayin: 0,
      commissionPayout: 0,
      chancePayin: 100,
      chancePayout: 100,
    }
  });

  // Create merchant method
  await db.merchantMethod.create({
    data: {
      merchantId: merchant.id,
      methodId: method.id,
      isEnabled: true,
    }
  });

  // Create a test trader
  const trader = await db.user.create({
    data: {
      email: "test-trader-device-" + Date.now() + "@test.com",
      name: "Test Trader Device",
      password: "password123",
      banned: false,
      balanceUsdt: 5000,
      balanceRub: 10000,
      trafficEnabled: true,
      deposit: 5000,
      minAmountPerRequisite: 100,
      maxAmountPerRequisite: 50000,
      trustBalance: 10000,
    }
  });

  // Connect trader to merchant
  await db.traderMerchant.create({
    data: {
      traderId: trader.id,
      merchantId: merchant.id,
      methodId: method.id,
      isMerchantEnabled: true,
      isFeeInEnabled: true,
    }
  });

  // Create a working device
  const workingDevice = await db.device.create({
    data: {
      code: "WORK" + Date.now(),
      name: "Working Device",
      userId: trader.id,
      isWorking: true,
      isOnline: true,
      isTrusted: true,
    }
  });

  // Create a stopped device
  const stoppedDevice = await db.device.create({
    data: {
      code: "STOP" + Date.now(),
      name: "Stopped Device",
      userId: trader.id,
      isWorking: false, // Device is stopped
      isOnline: true,
      isTrusted: true,
    }
  });

  // Create requisite linked to working device
  const workingRequisite = await db.bankDetail.create({
    data: {
      userId: trader.id,
      deviceId: workingDevice.id,
      methodType: MethodType.sbp,
      bankType: BankType.tbank,
      cardNumber: "79001234567",
      holderName: "Working Device Requisite",
      recipientName: "Working Test",
      isActive: true,
      isArchived: false,
      minAmount: 100,
      maxAmount: 50000,
      dailyLimit: 500000,
      monthlyLimit: 10000000,
      maxCountTransactions: 0,
    }
  });

  // Create requisite linked to stopped device
  const stoppedRequisite = await db.bankDetail.create({
    data: {
      userId: trader.id,
      deviceId: stoppedDevice.id,
      methodType: MethodType.sbp,
      bankType: BankType.sber,
      cardNumber: "79009876543",
      holderName: "Stopped Device Requisite",
      recipientName: "Stopped Test",
      isActive: true, // Requisite is active
      isArchived: false,
      minAmount: 100,
      maxAmount: 50000,
      dailyLimit: 500000,
      monthlyLimit: 10000000,
      maxCountTransactions: 0,
    }
  });

  // Create requisite without device (should be available)
  const noDeviceRequisite = await db.bankDetail.create({
    data: {
      userId: trader.id,
      deviceId: null, // No device
      methodType: MethodType.sbp,
      bankType: BankType.alfa,
      cardNumber: "79005555555",
      holderName: "No Device Requisite",
      recipientName: "No Device Test",
      isActive: true,
      isArchived: false,
      minAmount: 100,
      maxAmount: 50000,
      dailyLimit: 500000,
      monthlyLimit: 10000000,
      maxCountTransactions: 0,
    }
  });

  // Query for available requisites (simulating what the merchant endpoint does)
  const availableRequisites = await db.bankDetail.findMany({
    where: {
      isArchived: false,
      isActive: true,
      methodType: method.type,
      userId: trader.id,
      user: {
        banned: false,
        deposit: { gte: 1000 },
        trafficEnabled: true
      },
      OR: [
        { deviceId: null }, // Requisite without device
        { device: { isWorking: true, isOnline: true } } // Or device is working
      ]
    },
    include: { device: true }
  });

  // Verify that only requisites from working device or no device are returned
  expect(availableRequisites.length).toBe(2);
  
  const workingFound = availableRequisites.some(r => r.id === workingRequisite.id);
  const noDeviceFound = availableRequisites.some(r => r.id === noDeviceRequisite.id);
  const stoppedFound = availableRequisites.some(r => r.id === stoppedRequisite.id);
  
  expect(workingFound).toBe(true);
  expect(noDeviceFound).toBe(true);
  expect(stoppedFound).toBe(false); // Stopped device requisite should not be found

  // Clean up
  await db.bankDetail.deleteMany({ where: { userId: trader.id } });
  await db.device.deleteMany({ where: { userId: trader.id } });
  await db.traderMerchant.deleteMany({ where: { traderId: trader.id } });
  await db.user.delete({ where: { id: trader.id } });
  await db.merchantMethod.deleteMany({ where: { merchantId: merchant.id } });
  await db.method.delete({ where: { id: method.id } });
  await db.merchant.delete({ where: { id: merchant.id } });
});