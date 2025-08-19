"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ClearStoragePage() {
  const router = useRouter()
  
  useEffect(() => {
    // Очищаем localStorage для aggregator-auth
    if (typeof window !== 'undefined') {
      localStorage.removeItem('aggregator-auth')
      console.log('Aggregator auth storage cleared')
      // Перенаправляем на страницу входа
      router.push('/aggregator/login')
    }
  }, [router])
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Очистка данных...</h1>
        <p className="text-gray-600">Перенаправление на страницу входа...</p>
      </div>
    </div>
  )
}
