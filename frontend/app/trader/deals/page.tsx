"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { DealsList } from "@/components/deals/deals-list"

export default function TraderDealsPage() {
  return (
    <ProtectedRoute variant="trader">
      <AuthLayout variant="trader">
        <DealsList />
      </AuthLayout>
    </ProtectedRoute>
  )
}
