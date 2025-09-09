"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { FoldersEnhanced } from "@/components/trader/folders-enhanced"

export default function TraderFoldersPage() {
  return (
    <ProtectedRoute variant="trader">
      <AuthLayout variant="trader">
        <FoldersEnhanced />
      </AuthLayout>
    </ProtectedRoute>
  )
}