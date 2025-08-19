"use client"

import { useEffect, useState } from "react"
import { MerchantProtectedRoute as ProtectedRoute } from "@/components/auth/merchant-protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import QRCode from "qrcode"
import { toast } from "sonner"
import { merchantApi } from "@/services/api"
import { Input } from "@/components/ui/input"
import { Copy } from "lucide-react"

export default function MerchantSecurityPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [setupId, setSetupId] = useState<string | null>(null)
  const [otpAuth, setOtpAuth] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadState()
  }, [])

  const loadState = async () => {
    try {
      const me = await merchantApi.getMe()
      setEnabled(!!me.merchant?.totpEnabled)
    } catch {}
  }

  const startSetup = async () => {
    setLoading(true)
    try {
      const { setupId, otpauth } = await merchantApi.init2FA()
      setSetupId(setupId)
      setOtpAuth(otpauth)
      const dataUrl = await QRCode.toDataURL(otpauth)
      setQrDataUrl(dataUrl)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Не удалось начать настройку")
    } finally {
      setLoading(false)
    }
  }

  const confirmSetup = async () => {
    if (!setupId || code.length < 6) return
    setLoading(true)
    try {
      await merchantApi.confirm2FA(setupId, code)
      toast.success("2FA включена")
      setEnabled(true)
      setSetupId(null)
      setQrDataUrl(null)
      setOtpAuth(null)
      setCode("")
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Неверный код")
    } finally {
      setLoading(false)
    }
  }

  const disable = async () => {
    setLoading(true)
    try {
      await merchantApi.disable2FA()
      toast.success("2FA отключена")
      setEnabled(false)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Не удалось отключить")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute>

        <div className="space-y-6">
          <h1 className="text-2xl font-semibold">Безопасность</h1>
          <Card>
            <CardHeader>
              <CardTitle>Двухфакторная аутентификация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {enabled === null ? (
                <div>Загрузка...</div>
              ) : enabled && !setupId ? (
                <div className="space-y-4">
                  <p>2FA включена. При входе потребуется одноразовый код.</p>
                  <Button variant="destructive" onClick={disable} disabled={loading}>Отключить</Button>
                </div>
              ) : !setupId ? (
                <div className="space-y-4">
                  <p>Включите 2FA, чтобы защитить вход в кабинет.</p>
                  <Button onClick={startSetup} disabled={loading}>Включить 2FA</Button>
                </div>
              ) : (
                <div className="space-y-4 w-full flex flex-col items-center">
                  <p>Сканируйте QR-код в Google Authenticator, затем введите код ниже.</p>
                  {qrDataUrl && (
                    <img src={qrDataUrl} alt="QR Code" className="mx-auto w-56 h-56" />
                  )}
                  <p className="text-center text-sm text-gray-500">Или скопируйте и вставьте секретный ключ:</p>
                  <div className="flex w-[500px] justify-center items-center">
                    <Input className="w-full" value={otpAuth.replace(/^otpauth:\/\/totp\//, '').split('secret=')[1].split('&')[0]} readOnly className="font-mono text-sm" />
                    <Button variant="outline" className="w-10 h-10 ml-2" onClick={() => navigator.clipboard.writeText(otpAuth.replace(/^otpauth:\/\/totp\//, '').split('secret=')[1].split('&')[0])}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex justify-center">
                    <InputOTP value={code} onChange={setCode} maxLength={6}>
                      <InputOTPGroup>
                        {Array.from({ length: 6 }).map((_, i) => (
                          <InputOTPSlot key={i} index={i} className="w-10 h-12" />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <Button onClick={confirmSetup} disabled={loading || code.length < 6}>Подтвердить</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

    </ProtectedRoute>
  )
}

