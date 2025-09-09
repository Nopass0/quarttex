"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { FinancesMain } from "@/components/finances/finances-main"

export default function TraderFinancesPage() {
  return (
    <ProtectedRoute variant="trader">
      <AuthLayout variant="trader">
        <FinancesMain />
      </AuthLayout>
    </ProtectedRoute>
  )
}