#!/usr/bin/env bun
import { db } from '@/db';
import axios from 'axios';

/**
 * Test script for callback flows
 * Tests both PSPWare and standard aggregator callbacks
 */

async function testPSPWareCallback() {
  console.log('\n🧪 Testing PSPWare callback flow...\n');
  
  try {
    // Find PSPWare aggregator
    const aggregator = await db.aggregator.findFirst({
      where: { apiSchema: 'PSPWARE' }
    });
    
    if (!aggregator) {
      console.error('❌ PSPWare aggregator not found');
      return;
    }
    
    console.log(`✅ Found PSPWare aggregator: ${aggregator.name}`);
    
    // Find a recent transaction
    const transaction = await db.transaction.findFirst({
      where: {
        aggregatorId: aggregator.id
      },
      orderBy: { createdAt: 'desc' },
      include: { merchant: true }
    });
    
    if (!transaction) {
      console.error('❌ No transactions found for PSPWare aggregator');
      return;
    }
    
    console.log(`✅ Found transaction: ${transaction.id}`);
    console.log(`   Order ID: ${transaction.orderId}`);
    console.log(`   Status: ${transaction.status}`);
    console.log(`   Amount: ${transaction.amount} RUB`);
    console.log(`   Merchant: ${transaction.merchant?.name}`);
    
    // Prepare PSPWare callback data (success scenario)
    const pspwareCallback = {
      id: transaction.orderId || transaction.id,
      sum: transaction.amount,
      currency: 'RUB',
      merch_profit: transaction.amount * 0.95, // 5% commission
      status: 'success',
      card: '****1234',
      bank: 'sberbank',
      bank_name: 'Сбербанк',
      is_sbp: true,
      merch_profit_currency: 'RUB',
      currency_rate: 1.0,
      order_type: 'PAY-IN',
      merchant_id: transaction.merchantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('\n📤 Sending PSPWare callback...');
    console.log('   Endpoint: /api/pspware/callback/' + aggregator.id);
    console.log('   Status: success');
    
    // Send callback to PSPWare endpoint
    const response = await axios.post(
      `http://localhost:3000/api/pspware/callback/${aggregator.id}`,
      pspwareCallback,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ PSPWare callback response:', response.data);
    
    // Check if transaction status was updated
    const updatedTransaction = await db.transaction.findUnique({
      where: { id: transaction.id }
    });
    
    console.log(`\n📊 Transaction status after callback:`);
    console.log(`   Before: ${transaction.status}`);
    console.log(`   After: ${updatedTransaction?.status}`);
    
    // Check callback history
    const callbackHistory = await db.callbackHistory.findFirst({
      where: { transactionId: transaction.id },
      orderBy: { createdAt: 'desc' }
    });
    
    if (callbackHistory) {
      console.log(`\n📝 Callback forwarded to merchant:`);
      console.log(`   URL: ${callbackHistory.url}`);
      console.log(`   Success: ${callbackHistory.success}`);
      console.log(`   Status Code: ${callbackHistory.statusCode}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing PSPWare callback:', error);
  }
}

async function testStandardCallback() {
  console.log('\n🧪 Testing standard aggregator callback flow...\n');
  
  try {
    // Find a standard aggregator (not PSPWare)
    const aggregator = await db.aggregator.findFirst({
      where: { 
        apiSchema: { not: 'PSPWARE' },
        isActive: true
      }
    });
    
    if (!aggregator) {
      console.error('❌ Standard aggregator not found');
      return;
    }
    
    console.log(`✅ Found aggregator: ${aggregator.name}`);
    console.log(`   API Token: ${aggregator.apiToken?.substring(0, 16)}...`);
    
    // Find a recent transaction
    const transaction = await db.transaction.findFirst({
      where: {
        aggregatorId: aggregator.id,
        status: { not: 'READY' }
      },
      orderBy: { createdAt: 'desc' },
      include: { merchant: true }
    });
    
    if (!transaction) {
      console.error('❌ No pending transactions found for aggregator');
      return;
    }
    
    console.log(`✅ Found transaction: ${transaction.id}`);
    console.log(`   Order ID: ${transaction.orderId}`);
    console.log(`   Status: ${transaction.status}`);
    console.log(`   Amount: ${transaction.amount} RUB`);
    console.log(`   Merchant: ${transaction.merchant?.name}`);
    
    // Prepare standard callback data
    const standardCallback = {
      type: 'transaction_status_update',
      transactionId: transaction.id,
      data: {
        status: 'READY',
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('\n📤 Sending standard aggregator callback...');
    console.log('   Endpoint: /api/aggregator/callback');
    console.log('   New Status: READY');
    
    // Send callback to standard endpoint
    const response = await axios.post(
      'http://localhost:3000/api/aggregator/callback',
      standardCallback,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-aggregator-api-token': aggregator.apiToken || ''
        }
      }
    );
    
    console.log('✅ Standard callback response:', response.data);
    
    // Check if transaction status was updated
    const updatedTransaction = await db.transaction.findUnique({
      where: { id: transaction.id }
    });
    
    console.log(`\n📊 Transaction status after callback:`);
    console.log(`   Before: ${transaction.status}`);
    console.log(`   After: ${updatedTransaction?.status}`);
    
    // Check balances
    const updatedMerchant = await db.merchant.findUnique({
      where: { id: transaction.merchantId }
    });
    
    const updatedAggregator = await db.aggregator.findUnique({
      where: { id: aggregator.id }
    });
    
    console.log(`\n💰 Balance changes:`);
    console.log(`   Merchant balance: ${updatedMerchant?.balanceUsdt} USDT`);
    console.log(`   Aggregator balance: ${updatedAggregator?.balanceUsdt} USDT`);
    
  } catch (error) {
    console.error('❌ Error testing standard callback:', error);
  }
}

// Main execution
async function main() {
  console.log('=====================================');
  console.log('   CALLBACK FLOW TESTING SCRIPT');
  console.log('=====================================');
  
  // Test PSPWare callbacks
  await testPSPWareCallback();
  
  // Test standard aggregator callbacks
  await testStandardCallback();
  
  console.log('\n✅ Callback testing completed!\n');
  process.exit(0);
}

// Run the script
main().catch(console.error);