"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { DisputedPayoutsList } from "@/components/disputes/disputed-payouts-list"

export default function TraderDisputedPayoutsPage() {
  return (
    <ProtectedRoute variant="trader">
      <AuthLayout variant="trader">
        <DisputedPayoutsList />
      </AuthLayout>
    </ProtectedRoute>
  )
}