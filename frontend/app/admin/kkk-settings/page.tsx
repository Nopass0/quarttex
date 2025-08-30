'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { AuthLayout } from '@/components/layouts/auth-layout'
import { KkkSettings } from '@/components/admin/kkk-settings'

export default function AdminKkkSettingsPage() {
  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold text-gray-900">Настройки системы</h1>
          <KkkSettings />
        </div>
      </AuthLayout>
    </ProtectedRoute>
  )
}
