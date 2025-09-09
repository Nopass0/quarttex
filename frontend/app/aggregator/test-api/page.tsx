"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { aggregatorApi } from "@/services/api"
import { useAggregatorAuth } from "@/stores/aggregator-auth"

export default function TestApiPage() {
  const auth = useAggregatorAuth()
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  const addResult = (name: string, success: boolean, data: any) => {
    setResults(prev => [...prev, { name, success, data, timestamp: new Date().toISOString() }])
  }
  
  const testLogin = async () => {
    setLoading(true)
    try {
      // Используем созданного тестового агрегатора
      const result = await aggregatorApi.login("test@aggregator.com", "Test123!")
      addResult("Login", true, result)
      
      if (result.sessionToken) {
        // Сохраняем в store
        auth.setAuth(
          result.sessionToken,
          result.aggregator.id,
          result.aggregator.name,
          result.aggregator.email,
          result.aggregator.apiToken,
          result.aggregator.apiBaseUrl,
          result.aggregator.balanceUsdt,
          result.aggregator.twoFactorEnabled
        )
        addResult("Store Updated", true, { sessionToken: result.sessionToken.substring(0, 10) + "..." })
      }
    } catch (error: any) {
      addResult("Login", false, error.response?.data || error.message)
    } finally {
      setLoading(false)
    }
  }
  
  const testGetMe = async () => {
    setLoading(true)
    try {
      const result = await aggregatorApi.getMe()
      addResult("Get Me", true, result)
    } catch (error: any) {
      addResult("Get Me", false, error.response?.data || error.message)
    } finally {
      setLoading(false)
    }
  }
  
  const testGetOverview = async () => {
    setLoading(true)
    try {
      const result = await aggregatorApi.getOverview()
      addResult("Get Overview", true, result)
    } catch (error: any) {
      addResult("Get Overview", false, error.response?.data || error.message)
    } finally {
      setLoading(false)
    }
  }
  
  const clearResults = () => {
    setResults([])
  }
  
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Test Aggregator API</h1>
      
      <Card className="p-4">
        <h2 className="font-semibold mb-2">Current Auth State:</h2>
        <div className="space-y-1 text-sm">
          <div>Session Token: <span className="font-mono">{auth.sessionToken ? auth.sessionToken.substring(0, 20) + "..." : "null"}</span></div>
          <div>Aggregator ID: <span className="font-mono">{auth.aggregatorId || "null"}</span></div>
          <div>Email: <span className="font-mono">{auth.email || "null"}</span></div>
        </div>
      </Card>
      
      <div className="flex gap-2 flex-wrap">
        <Button onClick={testLogin} disabled={loading}>Test Login</Button>
        <Button onClick={testGetMe} disabled={loading}>Test Get Me</Button>
        <Button onClick={testGetOverview} disabled={loading}>Test Get Overview</Button>
        <Button onClick={clearResults} variant="outline">Clear Results</Button>
      </div>
      
      <div className="space-y-2">
        {results.map((result, index) => (
          <Card key={index} className={`p-3 ${result.success ? 'border-green-500' : 'border-red-500'}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">{result.name}</div>
                <div className="text-xs text-gray-500">{result.timestamp}</div>
              </div>
              <div className={`text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                {result.success ? 'SUCCESS' : 'FAILED'}
              </div>
            </div>
            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </Card>
        ))}
      </div>
      
      <Card className="p-4">
        <h2 className="font-semibold mb-2">Instructions:</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Open browser console (F12) to see detailed logs</li>
          <li>Click "Test Login" first (update email/password in code if needed)</li>
          <li>Check if session token is saved in store</li>
          <li>Then test "Get Me" and "Get Overview" to check if auth works</li>
          <li>Check console for interceptor logs</li>
        </ol>
      </Card>
    </div>
  )
}
