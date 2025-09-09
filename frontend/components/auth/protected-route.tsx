"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loading } from "@/components/ui/loading"
import { traderApi, adminApi } from "@/services/api"
import { useTraderAuth, useAdminAuth } from "@/stores/auth"
import { useHydrated } from "@/hooks/use-hydrated"

interface ProtectedRouteProps {
  children: React.ReactNode
  variant: "trader" | "admin"
}

export function ProtectedRoute({ children, variant }: ProtectedRouteProps) {
  const router = useRouter()
  const [isValidating, setIsValidating] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const hydrated = useHydrated()
  
  const traderToken = useTraderAuth((state) => state.token)
  const adminToken = useAdminAuth((state) => state.token)
  const traderLogout = useTraderAuth((state) => state.logout)
  const adminLogout = useAdminAuth((state) => state.logout)
  
  const token = variant === "trader" ? traderToken : adminToken
  const logout = variant === "trader" ? traderLogout : adminLogout
  const loginPath = variant === "trader" ? "/trader/login" : "/admin/login"
  
  useEffect(() => {
    if (!hydrated) return
    
    const validateToken = async () => {
      if (!token) {
        router.push(loginPath)
        return
      }
      
      console.log(`Validating ${variant} token:`, token)
      
      try {
        const validateApi = variant === "trader" ? traderApi : adminApi
        const response = await validateApi.validateToken()
        
        if (response.success) {
          setIsValid(true)
        } else {
          console.error(`${variant} token validation failed:`, response)
          logout()
          router.push(loginPath)
        }
      } catch (error) {
        console.error(`${variant} token validation error:`, error)
        logout()
        router.push(loginPath)
      } finally {
        setIsValidating(false)
      }
    }
    
    validateToken()
  }, [token, variant, router, logout, loginPath, hydrated])
  
  if (!hydrated || isValidating) {
    return <Loading fullScreen />
  }
  
  if (!isValid) {
    return null
  }
  
  return <>{children}</>
}