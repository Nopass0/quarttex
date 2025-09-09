"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { DevicesManagement } from '@/components/admin/devices'

export default function DevicesPage() {
  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <DevicesManagement />
      </AuthLayout>
    </ProtectedRoute>
  )
}