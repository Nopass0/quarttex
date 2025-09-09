"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { adminApi } from "@/services/api"
import { Loader2, Shield, Copy, Eye, EyeOff, AlertTriangle } from "lucide-react"
import Image from "next/image"

interface TwoFASetupProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function TwoFASetup({ isOpen, onClose, onSuccess }: TwoFASetupProps) {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup')
  const [qrCode, setQrCode] = useState<string>("")
  const [secret, setSecret] = useState<string>("")
  const [verificationCode, setVerificationCode] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [backupCodesCopied, setBackupCodesCopied] = useState(false)

  const handleSetup = async () => {
    setLoading(true)
    try {
      const response = await adminApi.setup2FA()
      if (response.success) {
        setQrCode(response.data.qrCode)
        setSecret(response.data.secret)
        setStep('verify')
        toast.success("QR-код сгенерирован")
      } else {
        toast.error(response.error || "Ошибка настройки 2FA")
      }
    } catch (error: any) {
      console.error("2FA setup error:", error)
      toast.error("Ошибка настройки 2FA")
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error("Введите 6-значный код")
      return
    }

    setLoading(true)
    try {
      const response = await adminApi.enable2FA(verificationCode)
      if (response.success) {
        setBackupCodes(response.data.backupCodes)
        setStep('backup')
        toast.success("2FA успешно включена!")
      } else {
        toast.error(response.error || "Неверный код")
      }
    } catch (error: any) {
      console.error("2FA verify error:", error)
      toast.error("Ошибка проверки кода")
    } finally {
      setLoading(false)
    }
  }

  const handleCopyBackupCodes = () => {
    const codesText = backupCodes.join('\n')
    navigator.clipboard.writeText(codesText)
    setBackupCodesCopied(true)
    toast.success("Резервные коды скопированы")
  }

  const handleFinish = () => {
    if (!backupCodesCopied) {
      toast.error("Пожалуйста, скопируйте резервные коды перед завершением")
      return
    }
    onSuccess?.()
    onClose()
    setStep('setup')
    setVerificationCode("")
    setBackupCodes([])
    setBackupCodesCopied(false)
  }

  const handleClose = () => {
    if (step === 'backup' && !backupCodesCopied) {
      toast.error("Пожалуйста, скопируйте резервные коды перед закрытием")
      return
    }
    onClose()
    setStep('setup')
    setVerificationCode("")
    setBackupCodes([])
    setBackupCodesCopied(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Настройка двухфакторной аутентификации
          </DialogTitle>
        </DialogHeader>

        {step === 'setup' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Двухфакторная аутентификация повышает безопасность вашей учетной записи.
              Вам понадобится приложение-аутентификатор, такое как Google Authenticator или Authy.
            </p>
            <Button 
              onClick={handleSetup} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Настройка...
                </>
              ) : (
                "Начать настройку"
              )}
            </Button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Отсканируйте этот QR-код в вашем приложении-аутентификаторе:
              </p>
              {qrCode && (
                <div className="flex justify-center mb-4">
                  <Image 
                    src={qrCode} 
                    alt="2FA QR Code" 
                    width={200} 
                    height={200}
                    className="border rounded"
                  />
                </div>
              )}
              <div className="text-xs text-muted-foreground mb-4">
                Или введите код вручную: 
                <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
                  {secret}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-6 w-6 p-0"
                  onClick={() => {
                    navigator.clipboard.writeText(secret)
                    toast.success("Код скопирован")
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verification-code">Код подтверждения</Label>
              <Input
                id="verification-code"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="text-center text-lg tracking-wider font-mono"
              />
            </div>

            <Button 
              onClick={handleVerify} 
              disabled={loading || verificationCode.length !== 6}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Проверка...
                </>
              ) : (
                "Подтвердить"
              )}
            </Button>
          </div>
        )}

        {step === 'backup' && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Важно!</p>
                <p>Сохраните эти резервные коды в безопасном месте. Каждый код можно использовать только один раз.</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Резервные коды</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBackupCodes(!showBackupCodes)}
                >
                  {showBackupCodes ? (
                    <>
                      <EyeOff className="mr-2 h-4 w-4" />
                      Скрыть
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      Показать
                    </>
                  )}
                </Button>
              </div>
              
              {showBackupCodes && (
                <Card>
                  <CardContent className="p-3">
                    <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                      {backupCodes.map((code, index) => (
                        <div key={index} className="bg-muted p-2 rounded text-center">
                          {code}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleCopyBackupCodes}
                variant="outline"
                className="flex-1"
              >
                <Copy className="mr-2 h-4 w-4" />
                Скопировать коды
              </Button>
              <Button 
                onClick={handleFinish}
                disabled={!backupCodesCopied}
                className="flex-1"
              >
                Завершить
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
