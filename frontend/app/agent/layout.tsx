'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAgentAuth } from '@/stores/agent-auth'
import { AuthLayout } from '@/components/layouts/auth-layout'
import { Loading } from '@/components/ui/loading'

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, verify } = useAgentAuth()
  const [isVerifying, setIsVerifying] = useState(true)
  
  const isLoginPage = pathname === '/agent/login'

  useEffect(() => {
    const checkAuth = async () => {
      if (isLoginPage) {
        setIsVerifying(false)
        return
      }

      const isValid = await verify()
      if (!isValid) {
        router.push('/agent/login')
      }
      setIsVerifying(false)
    }

    checkAuth()
  }, [pathname])

  if (isVerifying) {
    return <Loading />
  }

  if (isLoginPage) {
    return <>{children}</>
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <AuthLayout variant="agent">
      {children}
    </AuthLayout>
  )
}