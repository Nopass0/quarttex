import { db } from '@/db'
import { Status, TransactionType, SettleRequestStatus } from '@prisma/client'

async function checkRounding() {
  const merchantId = 'cmdt9563l07f5ikq4s7gy7mt2'
  
  // Get transactions
  const transactions = await db.transaction.findMany({
    where: {
      merchantId,
      status: Status.READY,
      type: TransactionType.IN
    },
    include: { method: true }
  })
  
  // Get rate settings
  const methodIds = [...new Set(transactions.map(tx => tx.method?.id).filter(Boolean))]
  const rateSettings = await db.rateSettings.findMany({
    where: { methodId: { in: methodIds } }
  })
  const rateSettingsMap = new Map(rateSettings.map(rs => [rs.methodId, rs]))
  
  console.log('Transaction-by-transaction calculation:\n')
  
  let totalUsdt = 0
  let totalCommission = 0
  let netTotal = 0
  
  for (const tx of transactions) {
    let effectiveRate = tx.merchantRate
    if (!tx.merchantRate && tx.rate && tx.method) {
      const rateSetting = rateSettingsMap.get(tx.method.id)
      const kkkPercent = rateSetting?.kkkPercent || 0
      effectiveRate = tx.rate / (1 + (kkkPercent / 100))
    }
    
    if (effectiveRate && effectiveRate > 0) {
      const dealUsdt = tx.amount / effectiveRate
      const commissionUsdt = dealUsdt * (tx.method.commissionPayin / 100)
      const netUsdt = dealUsdt - commissionUsdt
      
      // Different truncation approaches
      const truncatedDeal = Math.floor(dealUsdt * 100) / 100
      const truncatedCommission = Math.floor(commissionUsdt * 100) / 100
      const truncatedNet = Math.floor(netUsdt * 100) / 100
      
      // Alternative: truncate net after calculation
      const altNet = Math.floor((dealUsdt - commissionUsdt) * 100) / 100
      
      console.log(`TX ${tx.numericId}:`)
      console.log(`  Amount: ${tx.amount} RUB, Rate: ${effectiveRate}`)
      console.log(`  Deal USDT: ${dealUsdt.toFixed(4)} → truncated: ${truncatedDeal}`)
      console.log(`  Commission: ${commissionUsdt.toFixed(4)} → truncated: ${truncatedCommission}`)
      console.log(`  Net (deal - commission): ${netUsdt.toFixed(4)} → truncated: ${truncatedNet}`)
      console.log(`  Alt Net (truncate after): ${altNet}`)
      console.log(`  Difference: ${(truncatedNet - altNet).toFixed(4)}`)
      console.log()
      
      totalUsdt += truncatedDeal
      totalCommission += truncatedCommission
      netTotal += truncatedNet
    }
  }
  
  console.log('='.repeat(60))
  console.log('Summary:')
  console.log(`Total Deals: ${totalUsdt.toFixed(2)} USDT`)
  console.log(`Total Commission: ${totalCommission.toFixed(2)} USDT`)
  console.log(`Net Balance (sum of truncated nets): ${netTotal.toFixed(2)} USDT`)
  console.log(`Net Balance (total - commission): ${(totalUsdt - totalCommission).toFixed(2)} USDT`)
  console.log()
  console.log('Admin shows: 452.84 USDT')
  console.log('Merchant shows: 452.78 USDT')
}

checkRounding().catch(console.error).finally(() => process.exit())