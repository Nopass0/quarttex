"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useMerchantAuth } from "@/stores/merchant-auth"
import { useHydrated } from "@/hooks/use-hydrated"
import { Loading } from "@/components/ui/loading"

interface MerchantProtectedRouteProps {
  children: React.ReactNode
}

export function MerchantProtectedRoute({ children }: MerchantProtectedRouteProps) {
  const router = useRouter()
  const sessionToken = useMerchantAuth((state) => state.sessionToken)
  const hydrated = useHydrated()

  useEffect(() => {
    if (hydrated && !sessionToken) {
      router.push("/merchant/login")
    }
  }, [sessionToken, router, hydrated])

  if (!hydrated) {
    return <Loading fullScreen />
  }

  if (!sessionToken) {
    return null
  }

  return <>{children}</>
}