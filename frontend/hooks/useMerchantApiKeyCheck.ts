import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { merchantApi } from '@/services/api'
import { useMerchantAuth } from '@/stores/merchant-auth'

export const useMerchantApiKeyCheck = () => {
  const router = useRouter()
  const { logout, sessionToken, role } = useMerchantAuth()
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {

    // Skip API key validation when using session-based auth
    if (sessionToken) {

      return
    }

    const checkApiKey = async () => {
      try {
        const response = await merchantApi.checkApiKey()
        
        if (!response.valid) {
          console.log(`API key validation failed: ${response.reason}`)
          // Clear auth and redirect to login
          logout()
          router.push('/merchant/login')
        }
      } catch (error: any) {
        console.error('Failed to check API key:', error)
        // If it's a 401, 403, or 500 error, log out
        if (error.response?.status === 401 || error.response?.status === 403 || error.response?.status === 500) {
          logout()
          router.push('/merchant/login')
        }
        // On other errors (network, etc), don't log out - just skip this check
      }
    }

    // Check immediately on mount
    checkApiKey()

    // Then check every 30 seconds
    checkIntervalRef.current = setInterval(checkApiKey, 30000)

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [sessionToken, role, logout, router])
}