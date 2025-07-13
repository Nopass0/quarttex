'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MerchantPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/merchant/transactions')
  }, [router])

  return null
}