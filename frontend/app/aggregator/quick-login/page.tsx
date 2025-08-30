"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { aggregatorApi } from "@/services/api"
import { useAggregatorAuth } from "@/stores/aggregator-auth"
import { Loader2 } from "lucide-react"

export default function QuickLoginPage() {
  const router = useRouter()
  const setAuth = useAggregatorAuth((state) => state.setAuth)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("test@aggregator.com")
  const [password, setPassword] = useState("Test123!")
  
  const handleLogin = async () => {
    setLoading(true)
    try {
      console.log("Attempting login with:", { email, password })
      const data = await aggregatorApi.login(email, password)
      console.log("Login response:", data)
      
      if (data.requiresTwoFactor) {
        toast.error("2FA required - not implemented in quick login")
        return
      }
      
      const aggregator = data.aggregator
      console.log("Setting auth with sessionToken:", data.sessionToken)
      
      setAuth(
        data.sessionToken,
        aggregator.id,
        aggregator.name,
        aggregator.email,
        aggregator.apiToken || "",
        aggregator.apiBaseUrl,
        aggregator.balanceUsdt,
        aggregator.twoFactorEnabled || false
      )
      
      toast.success("Вход выполнен успешно")
      
      // Проверяем что сохранилось
      setTimeout(() => {
        const state = useAggregatorAuth.getState()
        console.log("Store state after login:", state)
        
        if (state.sessionToken) {
          router.push("/aggregator")
        } else {
          toast.error("Session token not saved!")
        }
      }, 100)
      
    } catch (error: any) {
      console.error("Login error:", error)
      toast.error(error?.response?.data?.error || error.message || "Ошибка входа")
    } finally {
      setLoading(false)
    }
  }
  
  const testStoreDirectly = () => {
    console.log("Testing direct store save...")
    const store = useAggregatorAuth.getState()
    
    store.setAuth(
      "direct-test-token-123",
      "test-id",
      "Direct Test",
      "direct@test.com",
      "api-123",
      null,
      5000,
      false
    )
    
    setTimeout(() => {
      const newState = useAggregatorAuth.getState()
      console.log("Store after direct save:", newState)
      
      const ls = localStorage.getItem('aggregator-auth')
      console.log("LocalStorage:", ls)
      
      if (newState.sessionToken === "direct-test-token-123") {
        toast.success("Direct store save works!")
      } else {
        toast.error("Direct store save failed!")
      }
    }, 100)
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold mb-6">Quick Aggregator Login</h1>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@aggregator.com"
            />
          </div>
          
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Test123!"
            />
          </div>
          
          <Button 
            onClick={handleLogin} 
            disabled={loading}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Login
          </Button>
          
          <Button 
            onClick={testStoreDirectly}
            variant="outline"
            className="w-full"
          >
            Test Direct Store Save
          </Button>
          
          <div className="text-sm text-gray-600">
            <p>Default credentials:</p>
            <p>Email: test@aggregator.com</p>
            <p>Password: Test123!</p>
          </div>
          
          <div className="text-xs text-gray-500">
            <p>Open browser console (F12) to see detailed logs</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
