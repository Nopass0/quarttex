import { db } from "../db"
import { Status } from "@prisma/client"

async function main() {
  // Проверяем последние транзакции
  const transactions = await db.transaction.findMany({
    where: {
      type: 'IN',
      OR: [
        { status: Status.IN_PROGRESS },
        { status: Status.READY }
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      trader: {
        select: {
          id: true,
          name: true,
          profitFromDeals: true
        }
      }
    }
  })

  console.log('Recent IN transactions:')
  
  const byStatus = {
    IN_PROGRESS: [] as any[],
    READY: [] as any[]
  }
  
  transactions.forEach(tx => {
    byStatus[tx.status].push(tx)
    console.log(`
ID: ${tx.id.slice(-8)}
Status: ${tx.status}
Frozen USDT: ${tx.frozenUsdtAmount || 0}
Commission: ${tx.calculatedCommission || 0} ${tx.calculatedCommission === 0 ? '⚠️' : '✓'}
Fee %: ${tx.feeInPercent || 0}
Created: ${tx.createdAt.toLocaleTimeString()}
Trader: ${tx.trader?.name || 'Unknown'}`)
  })

  console.log('\n\nSummary by status:')
  console.log(`IN_PROGRESS: ${byStatus.IN_PROGRESS.length} transactions`)
  console.log(`READY: ${byStatus.READY.length} transactions`)

  // Проверяем прибыль трейдера
  const trader = await db.user.findUnique({
    where: { email: 'trader@test.com' },
    select: {
      id: true,
      name: true,
      profitFromDeals: true,
      trustBalance: true,
      frozenUsdt: true
    }
  })

  console.log(`\n\nTest Trader (${trader?.name}):`)
  console.log(`Profit from deals: ${trader?.profitFromDeals || 0} USDT`)
  console.log(`Trust balance: ${trader?.trustBalance || 0} USDT`)
  console.log(`Frozen USDT: ${trader?.frozenUsdt || 0} USDT`)

  // Считаем сколько должно быть прибыли от READY транзакций
  const expectedProfit = transactions
    .filter(tx => tx.status === 'READY')
    .filter(tx => tx.traderId === trader?.id)
    .reduce((sum, tx) => sum + (tx.calculatedCommission || 0), 0)

  console.log(`\nExpected profit from READY/COMPLETED transactions: ${expectedProfit} USDT`)
  
  if (trader && trader.profitFromDeals < expectedProfit) {
    console.log(`\n⚠️ WARNING: Trader profit (${trader.profitFromDeals}) is less than expected (${expectedProfit})`)
    console.log('Possible reasons:')
    console.log('1. Transactions moved to READY without proper profit calculation')
    console.log('2. calculatedCommission is 0 for many transactions (no fee settings)')
  }

  // Проверим настройки комиссий
  const merchant = await db.merchant.findFirst({ where: { name: 'test' } })
  if (merchant && trader) {
    const traderMerchantSettings = await db.traderMerchant.findMany({
      where: {
        traderId: trader.id,
        merchantId: merchant.id
      }
    })
    
    console.log('\n\nTrader-Merchant fee settings:')
    if (traderMerchantSettings.length === 0) {
      console.log('❌ No fee settings found!')
    } else {
      traderMerchantSettings.forEach(tm => {
        console.log(`Method ${tm.methodId}: feeIn=${tm.feeIn}%, feeOut=${tm.feeOut}%`)
      })
    }
  }

  await db.$disconnect()
}

main().catch(console.error)