'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { AuthLayout } from '@/components/layouts/auth-layout'
import { AppVersionsList } from '@/components/admin/app-versions-list'

export default function ApplicationsPage() {
  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <AppVersionsList />
      </AuthLayout>
    </ProtectedRoute>
  )
}