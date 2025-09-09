#!/usr/bin/env bun

const token = process.env.TRADER_TOKEN || '436aa6ebd9364e65629560683ae0d0fa246b3d2bc9c07339b27c46412ead0aa1'
const baseUrl = 'http://localhost:3000/api/trader'

interface TestResult {
  endpoint: string
  status: number
  success: boolean
  error?: string
}

const endpoints = [
  { method: 'GET', path: '/dashboard' },
  { method: 'GET', path: '/payouts' },
  { method: 'GET', path: '/transactions' },
  { method: 'GET', path: '/devices' },
  { method: 'GET', path: '/bank-details' },
  { method: 'GET', path: '/folders' },
  { method: 'GET', path: '/telegram/check-connection' },
  { method: 'GET', path: '/finance-stats' },
  { method: 'GET', path: '/trader-messages' },
  { method: 'GET', path: '/profile' },
  { method: 'GET', path: '/methods' },
]

async function testEndpoint(method: string, path: string): Promise<TestResult> {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'x-trader-token': token,
        'Content-Type': 'application/json'
      }
    })
    
    const result: TestResult = {
      endpoint: `${method} ${path}`,
      status: response.status,
      success: response.ok
    }
    
    if (!response.ok) {
      const text = await response.text()
      try {
        const json = JSON.parse(text)
        result.error = json.error || text
      } catch {
        result.error = text
      }
    }
    
    return result
  } catch (error: any) {
    return {
      endpoint: `${method} ${path}`,
      status: 0,
      success: false,
      error: error.message
    }
  }
}

async function main() {
  console.log('Testing trader endpoints...\n')
  
  const results: TestResult[] = []
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint.method, endpoint.path)
    results.push(result)
    
    const statusEmoji = result.success ? '✅' : '❌'
    console.log(`${statusEmoji} ${result.endpoint} - ${result.status}`)
    if (result.error) {
      console.log(`   Error: ${result.error}`)
    }
  }
  
  console.log('\n--- Summary ---')
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  console.log(`✅ Successful: ${successful}`)
  console.log(`❌ Failed: ${failed}`)
  
  if (failed > 0) {
    console.log('\nFailed endpoints:')
    results.filter(r => !r.success).forEach(r => {
      console.log(`- ${r.endpoint}: ${r.error}`)
    })
  }
}

main()