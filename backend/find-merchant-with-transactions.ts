import { db } from '@/db'
import { Status, TransactionType } from '@prisma/client'

async function findMerchant() {
  // Find a merchant with successful transactions
  const transactions = await db.transaction.findMany({
    where: {
      status: Status.READY,
      type: TransactionType.IN
    },
    select: { 
      merchantId: true,
      merchant: {
        select: {
          id: true,
          name: true,
          countInRubEquivalent: true
        }
      }
    },
    take: 10
  })
  
  if (transactions.length === 0) {
    console.log('No successful transactions found')
    return
  }
  
  // Get unique merchants
  const merchants = new Map()
  for (const tx of transactions) {
    if (tx.merchantId && tx.merchant) {
      merchants.set(tx.merchantId, tx.merchant)
    }
  }
  
  console.log('Merchants with successful transactions:')
  for (const [id, merchant] of merchants) {
    const count = await db.transaction.count({
      where: {
        merchantId: id,
        status: Status.READY,
        type: TransactionType.IN
      }
    })
    console.log(`- ${merchant.name} (${id}): ${count} successful transactions, countInRubEquivalent: ${merchant.countInRubEquivalent}`)
  }
}

findMerchant().catch(console.error).finally(() => process.exit())