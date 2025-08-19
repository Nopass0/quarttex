/**
 * Manual script to verify transaction recalculation endpoint.
 * Usage:
 *   ADMIN_KEY=your_admin_key NODE_ENV=test ts-node tests/recalc-transaction.manual.ts <trxId> <amount>
 */

const id = process.argv[2]
const amount = Number(process.argv[3])
const adminKey = process.env.ADMIN_KEY || ''
const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

async function main() {
  if (!id || !amount) {
    console.error('Usage: ts-node tests/recalc-transaction.manual.ts <id> <amount>')
    return
  }

  const res = await fetch(`${api}/admin/transactions/${id}/recalc`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': adminKey
    },
    body: JSON.stringify({ amount })
  })
  const data = await res.json()
  console.log('Status:', res.status)
  console.log('Response:', data)
}

main().catch(console.error)
