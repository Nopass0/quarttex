'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { AuthLayout } from '@/components/layouts/auth-layout'
import { MethodsList } from '@/components/admin/methods-list'

export default function AdminMethodsPage() {
  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold text-gray-900">Методы платежей</h1>
          <MethodsList />
        </div>
      </AuthLayout>
    </ProtectedRoute>
  )
}