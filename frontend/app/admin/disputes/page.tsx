'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { AuthLayout } from '@/components/layouts/auth-layout'
import { AdminDisputesList } from '@/components/admin/disputes-list'

export default function AdminDisputesPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AuthLayout variant="admin">
        <AdminDisputesList />
      </AuthLayout>
    </ProtectedRoute>
  )
}