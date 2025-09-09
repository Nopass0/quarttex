#!/usr/bin/env bun

import { PrismaClient, MethodType } from '@prisma/client';
const db = new PrismaClient();

async function debugPoolQuery() {
  try {
    const methodId = 'cmdt3szvx0004ikim5z5iaqcf';
    const merchantId = 'cmdt3szvd0002ikimoy8ozixi';
    
    // 1. Get method
    const method = await db.method.findUnique({
      where: { id: methodId }
    });
    console.log('Method:', method?.type);
    
    // 2. Get connected traders
    const connectedTraders = await db.traderMerchant.findMany({
      where: {
        merchantId,
        methodId,
        isMerchantEnabled: true,
        isFeeInEnabled: true
      },
      select: { traderId: true }
    });
    
    const traderIds = connectedTraders.map(ct => ct.traderId);
    console.log('Connected traders:', traderIds);
    
    // 3. Run the exact pool query from merchant endpoint
    const pool = await db.bankDetail.findMany({
      where: {
        isArchived: false,
        isActive: true,
        methodType: method?.type,
        userId: { in: traderIds },
        user: { 
          banned: false,
          deposit: { gte: 1000 },
          trafficEnabled: true
        },
        OR: [
          { deviceId: null },
          { device: { isWorking: true, isOnline: true } }
        ]
      },
      orderBy: { updatedAt: "asc" },
      include: { user: true, device: true },
    });
    
    console.log('\nPool size:', pool.length);
    console.log('\nPool requisites:');
    pool.forEach((bd, index) => {
      console.log(`${index + 1}. ${bd.id} - ${bd.cardNumber} (${bd.minAmount}-${bd.maxAmount})`);
    });
    
    // 4. Simulate selection for amount 1500
    const amount = 1500;
    console.log(`\nChecking requisites for amount ${amount}:`);
    
    for (const bd of pool) {
      console.log(`\n--- ${bd.id} ---`);
      
      // Amount check
      const amountCheck = amount >= bd.minAmount && amount <= bd.maxAmount;
      console.log(`Amount check (${bd.minAmount}-${bd.maxAmount}): ${amountCheck ? 'PASS' : 'FAIL'}`);
      
      // User amount check
      const userAmountCheck = amount >= bd.user.minAmountPerRequisite && amount <= bd.user.maxAmountPerRequisite;
      console.log(`User amount check (${bd.user.minAmountPerRequisite}-${bd.user.maxAmountPerRequisite}): ${userAmountCheck ? 'PASS' : 'FAIL'}`);
      
      if (!amountCheck || !userAmountCheck) continue;
      
      // Dispute limit check
      const disputeCount = await db.transaction.count({
        where: {
          traderId: bd.userId,
          dealDispute: {
            isNot: null
          }
        }
      });
      const disputeCheck = disputeCount < bd.user.disputeLimit;
      console.log(`Dispute check (${disputeCount}/${bd.user.disputeLimit}): ${disputeCheck ? 'PASS' : 'FAIL'}`);
      
      if (!disputeCheck) continue;
      
      console.log('✓ This requisite would be selected!');
      break;
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

debugPoolQuery();