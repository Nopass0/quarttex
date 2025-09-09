"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { ServicesList } from '@/components/admin/services-list'

export default function ServicesPage() {
  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold text-gray-900">Сервисы</h1>
          <ServicesList />
        </div>
      </AuthLayout>
    </ProtectedRoute>
  )
}