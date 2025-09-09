"use client"

import { AuthLayout } from "@/components/layouts/auth-layout"

interface MerchantLayoutProps {
  children: React.ReactNode
}

export function MerchantLayout({ children }: MerchantLayoutProps) {
  return (
    <AuthLayout variant="merchant">
      {children}
    </AuthLayout>
  )
}