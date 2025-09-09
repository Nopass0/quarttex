import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function checkData() {
  console.log("=== Проверка данных в БД ===\n");

  // Проверяем мерчантов
  const merchants = await db.merchant.count();
  console.log(`Мерчантов: ${merchants}`);

  // Проверяем методы
  const methods = await db.method.findMany({
    where: { isEnabled: true }
  });
  console.log(`\nАктивных методов: ${methods.length}`);
  methods.forEach(m => {
    console.log(`- ${m.type} (${m.name})`);
  });

  // Проверяем настройки курсов
  const rateSettings = await db.rateSettings.count();
  console.log(`\nНастроек курсов: ${rateSettings}`);

  // Проверяем трейдеров
  const traders = await db.user.count({
    where: {
      banned: false,
      deposit: { gt: 0 },
      teamId: { not: null },
      trafficEnabled: true
    }
  });
  console.log(`Активных трейдеров: ${traders}`);

  // Проверяем реквизиты
  const requisites = await db.bankDetail.count({
    where: {
      isArchived: false,
      user: {
        banned: false,
        deposit: { gt: 0 },
        teamId: { not: null },
        trafficEnabled: true
      }
    }
  });
  console.log(`Активных реквизитов: ${requisites}`);

  // Проверяем команды
  const teams = await db.team.count();
  console.log(`Команд: ${teams}`);

  // Детали первого метода
  if (methods.length > 0) {
    const firstMethod = methods[0];
    const rateForMethod = await db.rateSettings.findUnique({
      where: { methodId: firstMethod.id }
    });
    
    console.log(`\nДетали метода ${firstMethod.type}:`);
    console.log(`- ID: ${firstMethod.id}`);
    console.log(`- Настройки курса: ${rateForMethod ? 'Есть' : 'Нет'}`);
    if (rateForMethod) {
      console.log(`  - Курс IN: ${rateForMethod.rateIn}`);
      console.log(`  - Курс OUT: ${rateForMethod.rateOut}`);
    }
  }
}

checkData()
  .catch(console.error)
  .finally(() => db.$disconnect());