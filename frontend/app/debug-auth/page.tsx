"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTraderAuth, useAdminAuth } from "@/stores/auth"
import { clearAuthData, debugAuthState } from "@/utils/auth"
import { useRouter } from "next/navigation"

export default function DebugAuthPage() {
  const router = useRouter()
  const traderToken = useTraderAuth((state) => state.token)
  const adminToken = useAdminAuth((state) => state.token)
  const traderLogout = useTraderAuth((state) => state.logout)
  const adminLogout = useAdminAuth((state) => state.logout)
  
  const handleClearAll = () => {
    traderLogout()
    adminLogout()
    clearAuthData()
    alert("All auth data cleared!")
    router.push("/")
  }
  
  const handleDebug = () => {
    debugAuthState()
  }
  
  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Auth Debug Page</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Current State:</h3>
              <div className="space-y-1 text-sm">
                <p>Trader Token: {traderToken ? `${traderToken.slice(0, 20)}...` : 'None'}</p>
                <p>Admin Token: {adminToken ? `${adminToken.slice(0, 20)}...` : 'None'}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleDebug} variant="outline">
                Debug Auth State
              </Button>
              <Button onClick={handleClearAll} variant="destructive">
                Clear All Auth Data
              </Button>
            </div>
            
            <div className="mt-4 space-y-2">
              <Button 
                onClick={() => router.push("/trader/login")} 
                className="w-full"
                variant="outline"
              >
                Go to Trader Login
              </Button>
              <Button 
                onClick={() => router.push("/admin/login")} 
                className="w-full"
                variant="outline"
              >
                Go to Admin Login
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Test Credentials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <strong>Trader:</strong>
              <p>Email: trader@example.com</p>
              <p>Password: 4bc00bad3281c040</p>
            </div>
            <div>
              <strong>Admin:</strong>
              <p>Token: 3d3b2e3efa297cae2bc6b19f3f8448ed2b2c7fd43af823a2a3a0585edfbb67d1</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}