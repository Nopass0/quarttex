"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/ui/logo"
import { toast } from "sonner"
import { useMerchantAuth } from "@/stores/merchant-auth"
import { Loader2, Key } from "lucide-react"

export default function MerchantLoginPage() {
  const router = useRouter()
  const setAuth = useMerchantAuth((state) => state.setAuth)
  const [loading, setLoading] = useState(false)
  const [apiToken, setApiToken] = useState("")
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!apiToken) {
      toast.error("Введите токен API")
      return
    }
    
    setLoading(true)
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/merchant/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: apiToken }),
      })
      
      const responseText = await response.text()
      
      if (!response.ok) {
        let errorMessage = 'Ошибка авторизации'
        
        try {
          const error = JSON.parse(responseText)
          errorMessage = error.error || errorMessage
        } catch (e) {
          // If response is not JSON, use the text directly
          errorMessage = responseText || `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }
      
      try {
        const data = JSON.parse(responseText)
        setAuth(apiToken, data.sessionToken, data.merchant.id, data.merchant.name)
        toast.success("Вход выполнен успешно")
        router.push("/merchant")
      } catch (e) {
        throw new Error("Ошибка при обработке ответа сервера")
      }
    } catch (error: any) {
      console.error("Merchant login error:", error)
      toast.error(error.message || "Неверный токен API")
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f0f] flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white dark:bg-[#292133] shadow-lg border-gray-200 dark:border-[#292133]">
        <div className="flex flex-col items-center mb-8">
          <Logo size="lg" />
          <h1 className="mt-6 text-2xl font-semibold text-gray-900 dark:text-[#eeeeee]">
            Личный кабинет мерчанта
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Введите ваш API токен для входа
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="apiToken" className="text-sm font-medium">
              API Токен
            </Label>
            <div className="mt-1 relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#530FAD] dark:text-[#530FAD] h-4 w-4" />
              <Input
                id="apiToken"
                type="password"
                placeholder="Введите ваш API токен"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>
          
          <Button
            type="submit"
            className="w-full bg-[#530FAD] hover:bg-[#530FAD/90] dark:bg-[#530FAD] dark:hover:bg-[#530FAD/80]"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                Вход...
              </>
            ) : (
              "Войти"
            )}
          </Button>
        </form>
        
        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            Нет доступа?{" "}
            <a href="#" className="text-[#530FAD] dark:text-[#530FAD] hover:text-[#530FAD/90] dark:hover:text-[#530FAD/80] font-medium">
              Свяжитесь с администратором
            </a>
          </p>
        </div>
      </Card>
    </div>
  )
}