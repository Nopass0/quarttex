"use client"

import { useEffect } from "react"
import { useAggregatorAuth } from "@/stores/aggregator-auth"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useRouter } from "next/navigation"

export default function TestStorePage() {
  const router = useRouter()
  const store = useAggregatorAuth()
  
  // Тестируем прямое сохранение в store
  const testDirectSave = () => {
    console.log("Before setAuth:", store)
    
    store.setAuth(
      "test-session-123",
      "agg-id-123",
      "Test Aggregator",
      "test@test.com",
      "api-token-123",
      "https://api.test.com",
      1000,
      false
    )
    
    console.log("After setAuth:", store)
    
    // Проверяем через setTimeout что сохранилось
    setTimeout(() => {
      const newStore = useAggregatorAuth.getState()
      console.log("Store state after timeout:", newStore)
      
      // Проверяем localStorage
      const ls = localStorage.getItem('aggregator-auth')
      console.log("LocalStorage:", ls)
    }, 100)
  }
  
  const clearAndReload = () => {
    store.logout()
    window.location.reload()
  }
  
  const goToDashboard = () => {
    router.push('/aggregator')
  }
  
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Test Aggregator Store</h1>
      
      <Card className="p-4">
        <h2 className="font-semibold mb-2">Current Store State:</h2>
        <div className="space-y-2 text-sm">
          <div>sessionToken: <span className="font-mono">{store.sessionToken || 'null'}</span></div>
          <div>aggregatorId: <span className="font-mono">{store.aggregatorId || 'null'}</span></div>
          <div>aggregatorName: <span className="font-mono">{store.aggregatorName || 'null'}</span></div>
          <div>email: <span className="font-mono">{store.email || 'null'}</span></div>
          <div>apiToken: <span className="font-mono">{store.apiToken || 'null'}</span></div>
          <div>balanceUsdt: <span className="font-mono">{store.balanceUsdt}</span></div>
        </div>
      </Card>
      
      <div className="flex gap-4">
        <Button onClick={testDirectSave}>Test Direct Save</Button>
        <Button onClick={clearAndReload} variant="destructive">Clear & Reload</Button>
        <Button onClick={goToDashboard} variant="outline">Go to Dashboard</Button>
        <Button onClick={() => router.push('/aggregator/login')} variant="outline">Go to Login</Button>
      </div>
      
      <Card className="p-4">
        <h2 className="font-semibold mb-2">Instructions:</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Click "Test Direct Save" to save test data to store</li>
          <li>Check console for logs</li>
          <li>Click "Go to Dashboard" to test if protected route works</li>
          <li>If redirected to login, there's an issue with store persistence</li>
        </ol>
      </Card>
    </div>
  )
}
