import { db } from "../src/db";
import bcrypt from "bcrypt";
import { BankType, MethodType } from "@prisma/client";

async function createTestBankDetail() {
  try {
    // Create test user
    const hashedPassword = await bcrypt.hash("Test123!", 10);
    const timestamp = Date.now();
    const user = await db.user.create({
      data: {
        email: `test_${timestamp}@example.com`,
        name: "Test Trader for Emulator",
        password: hashedPassword,
        balanceUsdt: 0,
        balanceRub: 0,
      },
    });

    // Create bank detail
    const bankDetail = await db.bankDetail.create({
      data: {
        userId: user.id,
        methodType: MethodType.sbp,
        bankType: BankType.SBERBANK,
        cardNumber: "4111111111111111",
        recipientName: "Test User",
        phoneNumber: "+79001234567",
        minAmount: 100,
        maxAmount: 100000,
        dailyLimit: 1000000,
        monthlyLimit: 10000000,
      },
    });

    console.log("\n=== Test Device Code Created ===");
    console.log(`Device Code: ${bankDetail.id}`);
    console.log("Bank: Сбербанк");
    console.log(`User email: ${user.email}`);
    console.log("Status: Ready to connect");
    console.log("\nUse this code in the emulator to connect the device.\n");

    await db.$disconnect();
  } catch (error) {
    console.error("Error:", error);
    await db.$disconnect();
    process.exit(1);
  }
}

createTestBankDetail();