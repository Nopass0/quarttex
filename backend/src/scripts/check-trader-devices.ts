import { db } from "@/db";

async function checkTraderDevices() {
  try {
    // Найдем трейдера
    const trader = await db.user.findFirst({
      where: {
        id: "cmdmyxs1q0001iklukqvj3np7"
      }
    });

    if (!trader) {
      console.log("Trader not found");
      return;
    }

    console.log("=== Trader Info ===");
    console.log("ID:", trader.id);
    console.log("Name:", trader.name);
    console.log("Email:", trader.email);

    // Найдем все устройства трейдера
    const devices = await db.device.findMany({
      where: {
        userId: trader.id
      },
      include: {
        bankDetails: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log("\n=== Devices Summary ===");
    console.log("Total devices:", devices.length);

    console.log("\n=== Device Details ===");
    devices.forEach((device, index) => {
      console.log(`\n${index + 1}. Device: ${device.name}`);
      console.log(`   ID: ${device.id}`);
      console.log(`   Token: ${device.token.substring(0, 10)}...`);
      console.log(`   Online: ${device.isOnline}`);
      console.log(`   Working: ${device.isWorking}`);
      console.log(`   Created: ${device.createdAt}`);
      console.log(`   Bank Details: ${device.bankDetails.length}`);
      
      if (device.bankDetails.length > 0) {
        console.log("   Bank Detail List:");
        device.bankDetails.forEach(bd => {
          console.log(`     - ${bd.bankType}: ${bd.cardNumber} (ID: ${bd.id}, Archived: ${bd.isArchived})`);
        });
      }
    });

    // Статистика по реквизитам
    const totalBankDetails = devices.reduce((sum, device) => sum + device.bankDetails.length, 0);
    const activeBankDetails = devices.reduce((sum, device) => 
      sum + device.bankDetails.filter(bd => !bd.isArchived).length, 0
    );

    console.log("\n=== Bank Details Summary ===");
    console.log("Total bank details across all devices:", totalBankDetails);
    console.log("Active bank details:", activeBankDetails);
    console.log("Archived bank details:", totalBankDetails - activeBankDetails);

    // Найдем все реквизиты трейдера (включая не привязанные к устройствам)
    const allBankDetails = await db.bankDetail.findMany({
      where: {
        userId: trader.id
      }
    });

    const unlinkedBankDetails = allBankDetails.filter(bd => !bd.deviceId);
    
    console.log("\n=== Unlinked Bank Details ===");
    console.log("Bank details without device:", unlinkedBankDetails.length);
    if (unlinkedBankDetails.length > 0) {
      unlinkedBankDetails.forEach(bd => {
        console.log(`  - ${bd.bankType}: ${bd.cardNumber} (ID: ${bd.id})`);
      });
    }

    await db.$disconnect();
  } catch (error) {
    console.error("Error:", error);
    await db.$disconnect();
  }
}

checkTraderDevices();