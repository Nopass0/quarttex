'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { AuthLayout } from '@/components/layouts/auth-layout'
import { SupportTicketsList } from '@/components/admin/support-tickets-list'

export default function SupportPage() {
  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <SupportTicketsList />
      </AuthLayout>
    </ProtectedRoute>
  )
}