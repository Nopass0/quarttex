'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { AuthLayout } from '@/components/layouts/auth-layout'
import { RateSettingsList } from '@/components/admin/rate-settings-list'

export default function AdminRateSettingsPage() {
  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Настройки ККК</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Управление коэффициентом корректировки курса для RUB методов
            </p>
          </div>
          <RateSettingsList />
        </div>
      </AuthLayout>
    </ProtectedRoute>
  )
}