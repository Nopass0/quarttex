"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { TradersList } from "@/components/admin/traders-list"

export default function AdminTradersPage() {
  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold text-gray-900">Трейдеры</h1>
          <TradersList />
        </div>
      </AuthLayout>
    </ProtectedRoute>
  )
}