import { db } from '@/db'
import { Status, TransactionType, PayoutStatus, SettleRequestStatus } from '@prisma/client'

async function checkDiscrepancy() {
  const merchantId = 'cmdt9563l07f5ikq4s7gy7mt2' // test merchant with transactions
  
  // Get last completed settle request
  const lastCompletedSettle = await db.settleRequest.findFirst({
    where: {
      merchantId,
      status: SettleRequestStatus.COMPLETED
    },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true }
  })
  
  console.log('Last completed settle:', lastCompletedSettle?.createdAt || 'None')
  
  // Get ALL successful transactions (admin panel might be doing this)
  const allSuccessfulTransactions = await db.transaction.findMany({
    where: {
      merchantId,
      status: Status.READY,
      type: TransactionType.IN
    },
    include: { method: true }
  })
  
  // Get filtered transactions (after last settle)
  const dateFilter = lastCompletedSettle?.createdAt 
    ? { createdAt: { gt: lastCompletedSettle.createdAt } }
    : {}
    
  const filteredTransactions = await db.transaction.findMany({
    where: {
      merchantId,
      status: Status.READY,
      type: TransactionType.IN,
      ...dateFilter
    },
    include: { method: true }
  })
  
  // Get rate settings
  const methodIds = [...new Set(allSuccessfulTransactions.map(tx => tx.method?.id).filter(Boolean))]
  const rateSettings = await db.rateSettings.findMany({
    where: { methodId: { in: methodIds } }
  })
  const rateSettingsMap = new Map(rateSettings.map(rs => [rs.methodId, rs]))
  
  // Calculate USDT for ALL transactions
  let totalAllUsdt = 0
  let commissionAllUsdt = 0
  
  for (const tx of allSuccessfulTransactions) {
    let effectiveRate = tx.merchantRate
    if (!tx.merchantRate && tx.rate && tx.method) {
      const rateSetting = rateSettingsMap.get(tx.method.id)
      const kkkPercent = rateSetting?.kkkPercent || 0
      effectiveRate = tx.rate / (1 + (kkkPercent / 100))
    }
    
    if (effectiveRate && effectiveRate > 0) {
      const dealUsdt = tx.amount / effectiveRate
      const commissionUsdt = dealUsdt * (tx.method.commissionPayin / 100)
      
      // Truncate to 2 decimal places
      const truncatedDealUsdt = Math.floor(dealUsdt * 100) / 100
      const truncatedCommissionUsdt = Math.floor(commissionUsdt * 100) / 100
      
      totalAllUsdt += truncatedDealUsdt
      commissionAllUsdt += truncatedCommissionUsdt
    }
  }
  
  // Calculate USDT for FILTERED transactions
  let totalFilteredUsdt = 0
  let commissionFilteredUsdt = 0
  
  for (const tx of filteredTransactions) {
    let effectiveRate = tx.merchantRate
    if (!tx.merchantRate && tx.rate && tx.method) {
      const rateSetting = rateSettingsMap.get(tx.method.id)
      const kkkPercent = rateSetting?.kkkPercent || 0
      effectiveRate = tx.rate / (1 + (kkkPercent / 100))
    }
    
    if (effectiveRate && effectiveRate > 0) {
      const dealUsdt = tx.amount / effectiveRate
      const commissionUsdt = dealUsdt * (tx.method.commissionPayin / 100)
      
      // Truncate to 2 decimal places
      const truncatedDealUsdt = Math.floor(dealUsdt * 100) / 100
      const truncatedCommissionUsdt = Math.floor(commissionUsdt * 100) / 100
      
      totalFilteredUsdt += truncatedDealUsdt
      commissionFilteredUsdt += truncatedCommissionUsdt
    }
  }
  
  console.log('\n==== ALL TRANSACTIONS (No Filter) ====')
  console.log('Count:', allSuccessfulTransactions.length)
  console.log('Total USDT:', totalAllUsdt.toFixed(2))
  console.log('Commission:', commissionAllUsdt.toFixed(2))
  console.log('Balance:', (totalAllUsdt - commissionAllUsdt).toFixed(2))
  
  console.log('\n==== FILTERED TRANSACTIONS (After Last Settle) ====')
  console.log('Count:', filteredTransactions.length)
  console.log('Total USDT:', totalFilteredUsdt.toFixed(2))
  console.log('Commission:', commissionFilteredUsdt.toFixed(2))
  console.log('Balance:', (totalFilteredUsdt - commissionFilteredUsdt).toFixed(2))
  
  console.log('\n==== EXPECTED VALUES ====')
  console.log('Admin Panel Shows: 503.08 USDT deals, 452.84 USDT balance')
  console.log('Merchant Dashboard Shows: 359.52 USDT deals, 323.57 USDT balance')
  
  console.log('\n==== ANALYSIS ====')
  if (Math.abs(totalAllUsdt - 503.08) < 1) {
    console.log('❌ Admin panel is using ALL transactions (not filtering by settle date)')
  } else if (Math.abs(totalFilteredUsdt - 503.08) < 1) {
    console.log('✅ Admin panel is correctly filtering by settle date')
  } else {
    console.log('⚠️ Admin panel calculation doesn\'t match either scenario')
  }
  
  if (Math.abs(totalFilteredUsdt - 359.52) < 1) {
    console.log('✅ Merchant dashboard is correctly filtering by settle date')
  } else {
    console.log('⚠️ Merchant dashboard calculation doesn\'t match expected')
  }
}

checkDiscrepancy().catch(console.error).finally(() => process.exit())