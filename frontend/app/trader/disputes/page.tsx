"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { DisputesMain } from "@/components/disputes/disputes-main"

export default function TraderDisputesPage() {
  return (
    <ProtectedRoute variant="trader">
      <AuthLayout variant="trader">
        <DisputesMain />
      </AuthLayout>
    </ProtectedRoute>
  )
}