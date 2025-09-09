"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { TestToolsPanel } from "@/components/admin/test-tools-panel"

export default function TestToolsPage() {
  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <TestToolsPanel />
      </AuthLayout>
    </ProtectedRoute>
  )
}