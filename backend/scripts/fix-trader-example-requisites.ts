import { db } from '../src/db'

async function fixTraderExampleRequisites() {
  console.log('=== FIXING TRADER@EXAMPLE.COM REQUISITES ===\n')

  // Найдем реквизит trader@example.com
  const trader = await db.user.findFirst({
    where: { email: 'trader@example.com' },
    include: { 
      bankDetails: {
        select: {
          id: true,
          methodType: true,
          bankType: true,
          cardNumber: true,
          recipientName: true,
          phoneNumber: true,
          minAmount: true,
          maxAmount: true,
          totalAmountLimit: true,
          currentTotalAmount: true,
          operationLimit: true,
          sumLimit: true,
          intervalMinutes: true,
          isArchived: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          deviceId: true,
          userId: true,
        },
      }
    }
  })

  if (!trader) {
    console.log('Trader not found!')
    return
  }

  console.log(`Found trader: ${trader.email}`)
  console.log(`Bank details: ${trader.bankDetails.length}`)

  // Обновляем methodType на c2c для всех реквизитов
  for (const bd of trader.bankDetails) {
    console.log(`\nUpdating bank detail ${bd.id}:`)
    console.log(`  Current methodType: ${bd.methodType}`)
    
    const updated = await db.bankDetail.update({
      where: { id: bd.id },
      data: { methodType: 'c2c' }
    })
    
    console.log(`  ✓ Updated methodType to: ${updated.methodType}`)
  }

  console.log('\n✅ Done!')
}

fixTraderExampleRequisites().catch(console.error).finally(() => process.exit(0))