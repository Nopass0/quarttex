'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { AuthLayout } from '@/components/layouts/auth-layout'
import { PaymentDetailsList } from '@/components/admin/payment-details-list'

export default function PaymentDetailsPage() {
  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold text-gray-900">Детали платежей</h1>
          <PaymentDetailsList />
        </div>
      </AuthLayout>
    </ProtectedRoute>
  )
}