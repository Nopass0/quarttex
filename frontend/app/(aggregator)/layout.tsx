"use client"

import { AggregatorProtectedRoute } from "@/components/auth/aggregator-protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { AggregatorDepositModal } from "@/components/aggregator/deposit-modal"

export default function AggregatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AggregatorProtectedRoute>
      <AuthLayout variant="aggregator">
        {children}
        <AggregatorDepositModal />
      </AuthLayout>
    </AggregatorProtectedRoute>
  )
}
