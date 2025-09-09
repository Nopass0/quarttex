'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { AuthLayout } from '@/components/layouts/auth-layout'
import { TransactionsList } from '@/components/admin/transactions-list'

export default function AdminTransactionsPage() {
  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold text-gray-900">Транзакции</h1>
          <TransactionsList />
        </div>
      </AuthLayout>
    </ProtectedRoute>
  )
}