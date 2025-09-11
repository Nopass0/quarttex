"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DynamicLogo } from "@/components/DynamicLogo"
import { toast } from "sonner"
import { useMerchantAuth } from "@/stores/merchant-auth"
import { Loader2, Key } from "lucide-react"
import { merchantApi } from "@/services/api"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"

export default function MerchantLoginPage() {
  const router = useRouter()
  const setAuth = useMerchantAuth((state) => state.setAuth)
  const [loading, setLoading] = useState(false)
  const [apiToken, setApiToken] = useState("")
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [otp, setOtp] = useState("")
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!apiToken) {
      toast.error("Введите токен API")
      return
    }
    
    setLoading(true)
    
    try {
      const data = await merchantApi.login(apiToken)
      if (data.requiresTotp && data.challengeId) {
        setChallengeId(data.challengeId)
        toast.message("Введите код из приложения аутентификатора")
        return
      }
      setAuth(apiToken, data.sessionToken, data.merchant.id, data.merchant.name, data.role, data.rights)
      toast.success("Вход выполнен успешно")
      router.push("/merchant")
    } catch (error: any) {
      console.error("Merchant login error:", error)
      toast.error(error?.response?.data?.error || error.message || "Неверный токен API")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!challengeId || otp.length < 6) return
    setLoading(true)
    try {
      const data = await merchantApi.verifyTotp(challengeId, otp)
      setAuth(apiToken, data.sessionToken, data.merchant.id, data.merchant.name, data.role, data.rights)
      toast.success("Вход выполнен успешно")
      router.push("/merchant")
    } catch (error: any) {
      console.error("Verify TOTP error:", error)
      toast.error(error?.response?.data?.error || error.message || "Неверный код")
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f0f] flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white dark:bg-[#29382f] shadow-lg border-gray-200 dark:border-[#29382f]">
        <div className="flex flex-col items-center mb-8">
          <DynamicLogo size="lg" />
          <h1 className="mt-6 text-2xl font-semibold text-gray-900 dark:text-[#eeeeee]">
            Личный кабинет мерчанта
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {challengeId ? "Введите одноразовый код подтверждения" : "Введите ваш API токен для входа"}
          </p>
        </div>
        
        {!challengeId ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="apiToken" className="text-sm font-medium">
                API Токен
              </Label>
              <div className="mt-1 relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#006039] dark:text-[#2d6a42] h-4 w-4" />
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
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div>
              <Label className="text-sm font-medium">Код из приложения</Label>
              <div className="mt-2 flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <InputOTPSlot key={i} index={i} className="w-10 h-12" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-[#006039] hover:bg-[#004d2e] dark:bg-[#2d6a42] dark:hover:bg-[#236035]"
              disabled={loading || otp.length < 6}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                  Проверяем...
                </>
              ) : (
                "Подтвердить"
              )}
            </Button>
          </form>
        )}
        
        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            Нет доступа?{" "}
            <a href="#" className="text-[#006039] dark:text-[#2d6a42] hover:text-[#004d2e] dark:hover:text-[#236035] font-medium">
              Свяжитесь с администратором
            </a>
          </p>
        </div>
      </Card>
    </div>
  )
}