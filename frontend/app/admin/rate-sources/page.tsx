'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { AuthLayout } from '@/components/layouts/auth-layout'
import { RateSources } from '@/components/admin/rate-sources'

export default function AdminRateSourcesPage() {
  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold text-gray-900">Настройка курса</h1>
          <RateSources />
        </div>
      </AuthLayout>
    </ProtectedRoute>
  )
}
