'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAdminAuth } from '@/stores/auth'
import { Loading } from '@/components/ui/loading'
import { adminApiInstance } from '@/services/api'

interface AdminGuardProps {
  children: React.ReactNode
  requireSuperAdmin?: boolean
}

export function AdminGuard({ children, requireSuperAdmin = false }: AdminGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { token, role, setRole, logout, hasHydrated } = useAdminAuth()
  const [isVerifying, setIsVerifying] = useState(true)

  useEffect(() => {
    const verifyToken = async () => {
      // Wait for store to hydrate
      if (!hasHydrated) {
        return
      }

      if (!token) {
        router.push('/admin/login')
        setIsVerifying(false)
        return
      }

      try {
        const response = await adminApiInstance.get('/admin/verify')
        if (response.data.success) {
          // Handle MASTER_KEY authentication (returns null admin)
          if (!response.data.admin) {
            setRole('SUPER_ADMIN')
          } else {
            setRole(response.data.admin.role)
            
            // Check if super admin is required
            if (requireSuperAdmin && response.data.admin.role !== 'SUPER_ADMIN') {
              router.push('/admin/traders')
              return
            }
          }
        } else {
          logout()
          router.push('/admin/login')
        }
      } catch (error) {
        logout()
        router.push('/admin/login')
      } finally {
        setIsVerifying(false)
      }
    }

    verifyToken()
  }, [token, pathname, hasHydrated, router, requireSuperAdmin, setRole, logout])

  if (!hasHydrated || isVerifying) {
    return <Loading />
  }

  if (!token) {
    return null
  }

  if (requireSuperAdmin && role !== 'SUPER_ADMIN') {
    return null
  }

  return <>{children}</>
}