import { db } from '../db'
import { randomBytes } from 'crypto'

async function testTrader() {
  try {
    // Find trader
    const trader = await db.user.findUnique({
      where: { email: 'trader@test.com' }
    })
    
    if (!trader) {
      console.log('No trader found with email trader@test.com')
      // Check all users
      const users = await db.user.findMany({
        select: { email: true, id: true, name: true }
      })
      console.log('All users:', users)
      return
    }
    
    console.log('Found trader:', {
      email: trader.email,
      id: trader.id,
      name: trader.name,
      trustBalance: trader.trustBalance,
      deposit: trader.deposit,
      profitFromDeals: trader.profitFromDeals,
      profitFromPayouts: trader.profitFromPayouts,
      frozenUsdt: trader.frozenUsdt
    })
    
    // Create session token
    const token = randomBytes(32).toString('hex')
    
    const session = await db.session.create({
      data: {
        token,
        ip: 'test',
        userId: trader.id,
        expiredAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }
    })
    
    console.log('Created session token:', token)
    console.log('Test the profile endpoint with:')
    console.log(`curl -H "x-trader-token: ${token}" http://localhost:3000/api/trader/profile`)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await db.$disconnect()
  }
}

testTrader()