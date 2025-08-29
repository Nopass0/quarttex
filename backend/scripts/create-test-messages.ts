import { db } from "../src/db";
import { MessageType, MessagePriority } from "@prisma/client";

async function createTestMessages() {
  try {
    console.log("Creating test messages...");

    // Get first trader
    const trader = await db.user.findFirst({
      where: {
        sessions: {
          some: {}
        }
      }
    });

    if (!trader) {
      console.error("No trader found. Please create a trader first.");
      return;
    }

    console.log(`Creating messages for trader: ${trader.email}`);

    const messages = [
      {
        subject: "Добро пожаловать в Chase!",
        content: "Спасибо за регистрацию в нашей платформе. Мы рады видеть вас среди наших трейдеров. Если у вас есть вопросы, обращайтесь в поддержку.",
        type: MessageType.ANNOUNCEMENT,
        priority: MessagePriority.NORMAL,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      },
      {
        subject: "Транзакция #12345 успешно завершена",
        content: "Ваша транзакция на сумму 5000 RUB успешно завершена. Средства зачислены на ваш баланс.",
        type: MessageType.TRANSACTION,
        priority: MessagePriority.NORMAL,
        relatedEntityId: "12345",
        relatedEntity: "transaction",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        subject: "Новая выплата ожидает подтверждения",
        content: "Поступила новая выплата #67890 на сумму 10000 RUB. Пожалуйста, проверьте и подтвердите выплату.",
        type: MessageType.PAYOUT,
        priority: MessagePriority.HIGH,
        relatedEntityId: "67890",
        relatedEntity: "payout",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        isRead: false
      },
      {
        subject: "Депозит успешно зачислен",
        content: "Ваш депозит на сумму 1000 USDT успешно зачислен на баланс. TxHash: 0x1234567890abcdef",
        type: MessageType.DEPOSIT,
        priority: MessagePriority.HIGH,
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        isRead: false
      },
      {
        subject: "Предупреждение безопасности",
        content: "Обнаружен вход в вашу учетную запись с нового IP-адреса: 192.168.1.1. Если это были не вы, немедленно смените пароль.",
        type: MessageType.SECURITY,
        priority: MessagePriority.URGENT,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        isRead: false
      },
      {
        subject: "Заявка на вывод одобрена",
        content: "Ваша заявка на вывод 500 USDT одобрена и будет обработана в течение 24 часов.",
        type: MessageType.WITHDRAWAL,
        priority: MessagePriority.NORMAL,
        relatedEntityId: "wd123",
        relatedEntity: "withdrawal",
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        isRead: false
      },
      {
        subject: "Новое устройство добавлено",
        content: "В вашу учетную запись добавлено новое устройство: iPhone 14 Pro. Если это были не вы, обратитесь в поддержку.",
        type: MessageType.DEVICE,
        priority: MessagePriority.NORMAL,
        createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        isRead: false,
        isStarred: true
      },
      {
        subject: "Открыт спор по транзакции #98765",
        content: "По транзакции #98765 открыт спор. Пожалуйста, предоставьте дополнительную информацию для разрешения спора.",
        type: MessageType.DISPUTE,
        priority: MessagePriority.HIGH,
        relatedEntityId: "98765",
        relatedEntity: "transaction",
        createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        isRead: false
      },
      {
        subject: "Обновление системы",
        content: "Завтра с 02:00 до 04:00 по МСК будут проводиться технические работы. Некоторые функции могут быть временно недоступны.",
        type: MessageType.SYSTEM,
        priority: MessagePriority.NORMAL,
        createdAt: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago
        isRead: false
      }
    ];

    for (const messageData of messages) {
      const message = await db.message.create({
        data: {
          ...messageData,
          traderId: trader.id
        }
      });
      console.log(`✓ Created message: ${message.subject}`);
    }

    // Create a message with attachment
    const messageWithAttachment = await db.message.create({
      data: {
        traderId: trader.id,
        subject: "Документы для верификации",
        content: "Пожалуйста, ознакомьтесь с приложенными документами для завершения верификации вашего аккаунта.",
        type: MessageType.ACCOUNT,
        priority: MessagePriority.NORMAL,
        attachments: {
          create: [
            {
              filename: "verification_guide.pdf",
              url: "/uploads/docs/verification_guide.pdf",
              size: 1024 * 256, // 256 KB
              mimeType: "application/pdf"
            },
            {
              filename: "requirements.docx",
              url: "/uploads/docs/requirements.docx",
              size: 1024 * 128, // 128 KB
              mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            }
          ]
        }
      }
    });
    console.log(`✓ Created message with attachments: ${messageWithAttachment.subject}`);

    const messageCount = await db.message.count({ where: { traderId: trader.id } });
    const unreadCount = await db.message.count({ 
      where: { 
        traderId: trader.id,
        isRead: false
      } 
    });

    console.log(`\nTotal messages created: ${messageCount}`);
    console.log(`Unread messages: ${unreadCount}`);
    
  } catch (error) {
    console.error("Error creating test messages:", error);
  } finally {
    await db.$disconnect();
  }
}

createTestMessages();