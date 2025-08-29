import { db } from "../db";
import { MethodType, Currency } from "@prisma/client";

async function seedWellbitMethods() {
  try {
    const methods = [
      {
        code: "sbp_wellbit",
        name: "СБП Wellbit (5k-10k)",
        type: MethodType.sbp,
        currency: Currency.rub,
        commissionPayin: 2.5,
        commissionPayout: 1.5,
        minPayin: 5000,
        maxPayin: 10000,
        minPayout: 5000,
        maxPayout: 10000,
        chancePayin: 90,
        chancePayout: 95,
        isEnabled: true
      },
      {
        code: "sbp_wellbit_10k",
        name: "СБП Wellbit (10k-300k)",
        type: MethodType.sbp,
        currency: Currency.rub,
        commissionPayin: 2.5,
        commissionPayout: 1.5,
        minPayin: 10000,
        maxPayin: 300000,
        minPayout: 10000,
        maxPayout: 300000,
        chancePayin: 90,
        chancePayout: 95,
        isEnabled: true
      },
      {
        code: "c2c_wellbit",
        name: "Карта Wellbit (5k-10k)",
        type: MethodType.c2c,
        currency: Currency.rub,
        commissionPayin: 3.0,
        commissionPayout: 2.0,
        minPayin: 5000,
        maxPayin: 10000,
        minPayout: 5000,
        maxPayout: 10000,
        chancePayin: 85,
        chancePayout: 90,
        isEnabled: true
      },
      {
        code: "c2c_wellbit_10k",
        name: "Карта Wellbit (10k-300k)",
        type: MethodType.c2c,
        currency: Currency.rub,
        commissionPayin: 3.0,
        commissionPayout: 2.0,
        minPayin: 10000,
        maxPayin: 300000,
        minPayout: 10000,
        maxPayout: 300000,
        chancePayin: 85,
        chancePayout: 90,
        isEnabled: true
      }
    ];

    for (const method of methods) {
      const existing = await db.method.findFirst({
        where: { code: method.code }
      });

      if (!existing) {
        const created = await db.method.create({
          data: method
        });
        console.log(`✅ Created method: ${created.name} (${created.code}) with ID: ${created.id}`);
      } else {
        // Update existing method
        const updated = await db.method.update({
          where: { id: existing.id },
          data: {
            name: method.name,
            minPayin: method.minPayin,
            maxPayin: method.maxPayin,
            minPayout: method.minPayout,
            maxPayout: method.maxPayout,
            isEnabled: true
          }
        });
        console.log(`✅ Updated method: ${updated.name} (${updated.code})`);
      }
    }

    console.log("\nWellbit methods seeded successfully!");

  } catch (error) {
    console.error("Error seeding Wellbit methods:", error);
  } finally {
    await db.$disconnect();
  }
}

seedWellbitMethods();