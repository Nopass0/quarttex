import { PrismaClient, MessageType, MessagePriority } from "@prisma/client";

const db = new PrismaClient();

async function createTestMessages() {
  try {
    // Find a trader
    const trader = await db.trader.findFirst({
      where: {
        user: {
          username: "trader"
        }
      }
    });

    if (!trader) {
      console.error("No trader found");
      return;
    }

    console.log(`Creating test messages for trader ${trader.id}`);

    // Create 100 test messages
    const messages = [];
    const types = Object.values(MessageType);
    const priorities = Object.values(MessagePriority);

    for (let i = 1; i <= 100; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const priority = priorities[Math.floor(Math.random() * priorities.length)];
      const isRead = Math.random() > 0.3; // 70% read

      messages.push({
        traderId: trader.id,
        subject: `Тестовое сообщение #${i}`,
        content: `Это тестовое сообщение номер ${i}. ${getMessageContent(type)}`,
        type,
        priority,
        isRead,
        isStarred: Math.random() > 0.8, // 20% starred
        readAt: isRead ? new Date(Date.now() - Math.random() * 86400000) : null,
        createdAt: new Date(Date.now() - i * 3600000), // Each message 1 hour older
      });
    }

    await db.message.createMany({
      data: messages
    });

    console.log(`Created ${messages.length} test messages`);
  } catch (error) {
    console.error("Error creating test messages:", error);
  } finally {
    await db.$disconnect();
  }
}

function getMessageContent(type: MessageType): string {
  const contents: Record<MessageType, string> = {
    SYSTEM: "Системное уведомление о работе платформы.",
    TRANSACTION: "Информация о транзакции и её статусе.",
    PAYOUT: "Детали выплаты и подтверждение операции.",
    ACCOUNT: "Обновление информации аккаунта.",
    SECURITY: "Важное уведомление безопасности.",
    DISPUTE: "Информация о споре по транзакции.",
    DEPOSIT: "Подтверждение депозита на счёт.",
    WITHDRAWAL: "Информация о выводе средств.",
    DEVICE: "Уведомление об устройстве.",
    ANNOUNCEMENT: "Важное объявление от администрации."
  };
  return contents[type] || "Общее уведомление.";
}

createTestMessages();