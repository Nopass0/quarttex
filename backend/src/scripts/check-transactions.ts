import { db } from '../db'

async function main() {
  const transactions = await db.transaction.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      numericId: true,
      orderId: true,
      status: true,
      traderId: true,
      createdAt: true
    }
  })
  
  console.log('Последние транзакции:')
  for (const tx of transactions) {
    console.log({
      id: tx.id,
      numericId: tx.numericId,
      orderId: tx.orderId,
      status: tx.status,
      traderId: tx.traderId
    })
  }
  
  await db.$disconnect()
}

main().catch(console.error)
