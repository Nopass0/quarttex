"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { DeviceEmulatorDetail } from '@/components/admin/device-emulator-detail'

export default function DeviceEmulatorPage() {
  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <DeviceEmulatorDetail />
      </AuthLayout>
    </ProtectedRoute>
  )
}