import { db } from "@/db";
import { Status, TransactionType } from "@prisma/client";

async function createTestTransaction() {
  try {
    // Найдем устройство и его реквизиты
    const device = await db.device.findFirst({
      where: {
        id: "cmdn0i91l06o7ikcqim2zflxm"
      },
      include: {
        bankDetails: true,
        user: true
      }
    });

    if (!device) {
      console.log("Device not found");
      return;
    }

    // Берем первый SBERBANK реквизит с устройства
    const bankDetail = device.bankDetails.find(bd => bd.bankType === "SBERBANK");
    
    if (!bankDetail) {
      console.log("No SBERBANK bank detail found on device");
      return;
    }

    console.log("Using bank detail:", {
      id: bankDetail.id,
      bank: bankDetail.bankType,
      card: bankDetail.cardNumber
    });

    // Найдем тестового мерчанта
    const merchant = await db.merchant.findFirst({
      where: { name: "test" }
    });

    if (!merchant) {
      console.log("Test merchant not found");
      return;
    }

    // Найдем метод
    const method = await db.method.findFirst({
      where: { 
        type: bankDetail.methodType,
        isEnabled: true
      }
    });

    if (!method) {
      console.log("No suitable method found");
      return;
    }

    // Создаем транзакцию на 4571 рублей
    const transaction = await db.transaction.create({
      data: {
        merchantId: merchant.id,
        amount: 4571,
        assetOrBank: bankDetail.cardNumber,
        orderId: `TEST_${Date.now()}`,
        methodId: method.id,
        currency: "RUB",
        userId: `test_user_${Date.now()}`,
        userIp: "127.0.0.1",
        callbackUri: "",
        successUri: "",
        failUri: "",
        type: TransactionType.IN,
        expired_at: new Date(Date.now() + 3600000), // 1 час
        commission: 0,
        clientName: "Test Client",
        status: Status.IN_PROGRESS,
        rate: 90,
        merchantRate: 90,
        adjustedRate: 90,
        isMock: true,
        bankDetailId: bankDetail.id, // Используем реквизит с устройства!
        traderId: device.userId,
        frozenUsdtAmount: 0,
        calculatedCommission: 0,
        kkkPercent: 0,
        feeInPercent: 0
      }
    });

    console.log("\n✅ Transaction created:");
    console.log("- ID:", transaction.id);
    console.log("- Amount:", transaction.amount, "RUB");
    console.log("- BankDetailId:", transaction.bankDetailId);
    console.log("- Status:", transaction.status);
    console.log("\nNow send a notification from the device with amount 4571 RUB");

    await db.$disconnect();
  } catch (error) {
    console.error("Error:", error);
    await db.$disconnect();
  }
}

createTestTransaction();