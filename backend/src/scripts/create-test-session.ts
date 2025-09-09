#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
const db = new PrismaClient();

async function createTestSession() {
  try {
    const user = await db.user.findUnique({
      where: { id: 'cmdt3szv50001ikim64p88222' }
    });
    
    if (!user) {
      console.error('User not found');
      return;
    }
    
    // Создаем токен
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        name: user.name,
        role: 'trader'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    console.log('Token:', token);
    
    // Тестируем API
    const response = await fetch('http://localhost:3000/api/trader/bank-details', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    console.log('\nAPI Response:', JSON.stringify(data[0], null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

createTestSession();