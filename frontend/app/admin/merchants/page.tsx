'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { AuthLayout } from '@/components/layouts/auth-layout'
import { MerchantsList } from '@/components/admin/merchants-list'

export default function AdminMerchantsPage() {
  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold text-gray-900">Мерчанты</h1>
          <MerchantsList />
        </div>
      </AuthLayout>
    </ProtectedRoute>
  )
}