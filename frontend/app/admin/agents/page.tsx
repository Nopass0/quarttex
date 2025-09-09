"use client"

import { AgentsList } from '@/components/admin/agents-list'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"

export default function AgentsPage() {
  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold text-gray-900">Агенты</h1>
          <AgentsList />
        </div>
      </AuthLayout>
    </ProtectedRoute>
  )
}