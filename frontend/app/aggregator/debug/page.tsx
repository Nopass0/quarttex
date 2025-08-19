"use client"

import { useEffect, useState } from "react"
import { useAggregatorAuth } from "@/stores/aggregator-auth"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function DebugPage() {
  const auth = useAggregatorAuth()
  const [localStorageData, setLocalStorageData] = useState<string>("")
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem('aggregator-auth')
      setLocalStorageData(data || 'null')
    }
  }, [])
  
  const setTestAuth = () => {
    auth.setAuth(
      "test-session-token",
      "test-aggregator-id",
      "Test Aggregator",
      "test@example.com",
      "test-api-token",
      "https://test.com",
      1000,
      false
    )
    window.location.reload()
  }
  
  const clearAuth = () => {
    auth.logout()
    localStorage.removeItem('aggregator-auth')
    window.location.reload()
  }
  
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Debug Aggregator Auth</h1>
      
      <Card className="p-4">
        <h2 className="font-semibold mb-2">Current Store State:</h2>
        <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
          {JSON.stringify(auth, null, 2)}
        </pre>
      </Card>
      
      <Card className="p-4">
        <h2 className="font-semibold mb-2">LocalStorage Data:</h2>
        <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
          {localStorageData}
        </pre>
      </Card>
      
      <Card className="p-4">
        <h2 className="font-semibold mb-2">Session Token:</h2>
        <p className={auth.sessionToken ? "text-green-600" : "text-red-600"}>
          {auth.sessionToken || "NOT SET"}
        </p>
      </Card>
      
      <div className="flex gap-4">
        <Button onClick={setTestAuth}>Set Test Auth</Button>
        <Button onClick={clearAuth} variant="destructive">Clear Auth</Button>
        <Button onClick={() => window.location.href = '/aggregator/login'} variant="outline">
          Go to Login
        </Button>
        <Button onClick={() => window.location.href = '/aggregator'} variant="outline">
          Go to Dashboard
        </Button>
      </div>
    </div>
  )
}
