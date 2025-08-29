import { db } from '../src/db'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

async function createTestAggregator() {
  try {
    // Проверяем, существует ли уже тестовый агрегатор
    const existing = await db.aggregator.findUnique({
      where: { email: 'test@aggregator.com' }
    })
    
    if (existing) {
      console.log('Test aggregator already exists:', {
        email: existing.email,
        name: existing.name,
        apiToken: existing.apiToken
      })
      return
    }
    
    // Создаем нового агрегатора
    const hashedPassword = await bcrypt.hash('Test123!', 10)
    const apiToken = crypto.randomBytes(32).toString('hex')
    const callbackToken = crypto.randomBytes(32).toString('hex')
    
    const aggregator = await db.aggregator.create({
      data: {
        email: 'test@aggregator.com',
        password: hashedPassword,
        name: 'Test Aggregator',
        apiToken: apiToken,
        callbackToken: callbackToken,
        balanceUsdt: 10000,
        isActive: true,
        twoFactorEnabled: false
      }
    })
    
    console.log('Test aggregator created successfully:')
    console.log('Email:', aggregator.email)
    console.log('Password: Test123!')
    console.log('Name:', aggregator.name)
    console.log('API Token:', aggregator.apiToken)
    console.log('Balance USDT:', aggregator.balanceUsdt)
    
  } catch (error) {
    console.error('Error creating test aggregator:', error)
  } finally {
    await db.$disconnect()
  }
}

createTestAggregator()
