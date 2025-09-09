"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { BtEntryList } from "@/components/bt-entry/bt-entry-list"

export default function TraderBtEntryPage() {
  return (
    <ProtectedRoute variant="trader">
      <AuthLayout variant="trader">
        <BtEntryList />
      </AuthLayout>
    </ProtectedRoute>
  )
}