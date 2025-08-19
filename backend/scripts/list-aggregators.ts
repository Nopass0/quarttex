import { db } from '../src/db'

async function listAggregators() {
  try {
    const aggregators = await db.aggregator.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        apiToken: true,
        balanceUsdt: true,
        isActive: true,
        twoFactorEnabled: true,
        createdAt: true,
        sessions: {
          select: {
            id: true,
            token: true,
            expiresAt: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 3
        }
      }
    })
    
    console.log('=== AGGREGATORS IN DATABASE ===\n')
    
    for (const agg of aggregators) {
      console.log(`Aggregator: ${agg.name}`)
      console.log(`  Email: ${agg.email}`)
      console.log(`  ID: ${agg.id}`)
      console.log(`  API Token: ${agg.apiToken}`)
      console.log(`  Balance USDT: ${agg.balanceUsdt}`)
      console.log(`  Active: ${agg.isActive}`)
      console.log(`  2FA: ${agg.twoFactorEnabled}`)
      console.log(`  Created: ${agg.createdAt}`)
      
      if (agg.sessions.length > 0) {
        console.log(`  Recent Sessions:`)
        for (const session of agg.sessions) {
          const expired = session.expiresAt < new Date()
          console.log(`    - Token: ${session.token.substring(0, 20)}...`)
          console.log(`      Created: ${session.createdAt}`)
          console.log(`      Expires: ${session.expiresAt} ${expired ? '(EXPIRED)' : '(ACTIVE)'}`)
        }
      } else {
        console.log(`  No sessions`)
      }
      console.log('')
    }
    
    console.log(`Total aggregators: ${aggregators.length}`)
    
  } catch (error) {
    console.error('Error listing aggregators:', error)
  } finally {
    await db.$disconnect()
  }
}

listAggregators()
