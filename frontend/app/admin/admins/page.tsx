'use client'

import { AdminGuard } from '@/components/auth/admin-guard'
import { AdminsList } from '@/components/admin/admins-list'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"

export default function AdminsPage() {
  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <AdminGuard requireSuperAdmin>
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold text-gray-900">Администраторы</h1>
            <AdminsList />
          </div>
        </AdminGuard>
      </AuthLayout>
    </ProtectedRoute>
  )
}