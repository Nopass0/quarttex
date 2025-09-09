'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { AuthLayout } from '@/components/layouts/auth-layout'
import { SystemSettingsList } from '@/components/admin/system-settings-list'

export default function AdminSystemSettingsPage() {
  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Системные настройки</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Управление системными параметрами и кошельком для пополнений
            </p>
          </div>
          <SystemSettingsList />
        </div>
      </AuthLayout>
    </ProtectedRoute>
  )
}