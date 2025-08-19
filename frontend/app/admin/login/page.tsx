"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/ui/logo"
import { toast } from "sonner"
import { useAdminAuth } from "@/stores/auth"
import { adminApi } from "@/services/api"
import { Loader2, Key } from "lucide-react"
import { useHydrated } from "@/hooks/use-hydrated"
import { Loading } from "@/components/ui/loading"

export default function AdminLoginPage() {
  const router = useRouter()
  const token = useAdminAuth((state) => state.token)
  const setToken = useAdminAuth((state) => state.setToken)
  const hydrated = useHydrated()
  const [loading, setLoading] = useState(false)
  const [masterKey, setMasterKey] = useState("")
  
  useEffect(() => {
    if (hydrated && token) {
      router.push("/admin/traders")
    }
  }, [token, router, hydrated])
  
  if (!hydrated) {
    return <Loading fullScreen />
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!masterKey) {
      toast.error("Введите мастер-ключ")
      return
    }
    
    setLoading(true)
    
    try {
      const response = await adminApi.login(masterKey)
      
      if (response.success) {
        setToken(masterKey)
        toast.success("Вход выполнен успешно")
        router.push("/admin/traders")
      } else {
        toast.error("Неверный мастер-ключ")
      }
    } catch (error: any) {
      console.error("Admin login error:", error)
      if (error.response?.data?.error) {
        toast.error(error.response.data.error)
      } else {
        toast.error("Неверный мастер-ключ")
      }
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f0f] flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white dark:bg-[#29382f] shadow-lg border-gray-200 dark:border-[#29382f]">
        <div className="flex flex-col items-center mb-8">
          <Logo size="lg" />
          <h1 className="mt-6 text-2xl font-semibold text-gray-900 dark:text-[#eeeeee]">
            Вход в админ-панель
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Введите мастер-ключ для доступа к системе
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="masterKey" className="text-sm font-medium">
              Мастер-ключ
            </Label>
            <div className="mt-1 relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#006039] dark:text-[#2d6a42] h-4 w-4" />
              <Input
                id="masterKey"
                type="password"
                placeholder="••••••••••••••••"
                value={masterKey}
                onChange={(e) => setMasterKey(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>
          
          <Button
            type="submit"
            className="w-full bg-[#006039] hover:bg-[#004d2e] dark:bg-[#2d6a42] dark:hover:bg-[#236035]"
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
            Проблемы со входом?{" "}
            <a href="#" className="text-[#006039] dark:text-[#2d6a42] hover:text-[#004d2e] dark:hover:text-[#236035] font-medium">
              Обратитесь к разработчику
            </a>
          </p>
        </div>
      </Card>
    </div>
  )
}