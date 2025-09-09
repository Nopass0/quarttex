"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { BtEntranceDeals } from "@/components/trader/bt-entrance-deals"

export default function BTEntrancePage() {
  return (
    <ProtectedRoute variant="trader">
      <AuthLayout variant="trader">
        <BtEntranceDeals />
      </AuthLayout>
    </ProtectedRoute>
  )
}