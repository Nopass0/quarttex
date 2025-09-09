"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { DealDisputesList } from "@/components/trader/disputes/deal-disputes-list"

export default function TraderDisputesDealsPage() {
  return (
    <ProtectedRoute variant="trader">
      <AuthLayout variant="trader">
        <DealDisputesList />
      </AuthLayout>
    </ProtectedRoute>
  )
}