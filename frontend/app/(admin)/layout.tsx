'use client'

import { AuthLayout } from '@/components/layouts/auth-layout'
import { AdminGuard } from '@/components/auth/admin-guard'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminGuard>
      <AuthLayout variant="admin">
        {children}
      </AuthLayout>
    </AdminGuard>
  )
}