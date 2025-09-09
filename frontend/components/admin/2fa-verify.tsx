"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { adminApi } from "@/services/api"
import { Loader2, Shield, Key } from "lucide-react"

interface TwoFAVerifyProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function TwoFAVerify({ isOpen, onClose, onSuccess }: TwoFAVerifyProps) {
  const [loading, setLoading] = useState(false)
  const [verificationCode, setVerificationCode] = useState("")
  const [backupCode, setBackupCode] = useState("")
  const [useBackupCode, setUseBackupCode] = useState(false)

  const handleVerify = async () => {
    if (useBackupCode) {
      if (!backupCode.trim()) {
        toast.error("Введите резервный код")
        return
      }
    } else {
      if (!verificationCode || verificationCode.length !== 6) {
        toast.error("Введите 6-значный код")
        return
      }
    }

    setLoading(true)
    try {
      const response = await adminApi.verify2FA(
        useBackupCode ? undefined : verificationCode,
        useBackupCode ? backupCode : undefined
      )
      
      if (response.success) {
        toast.success("2FA проверка пройдена")
        onSuccess()
        onClose()
        setVerificationCode("")
        setBackupCode("")
        setUseBackupCode(false)
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

  const handleClose = () => {
    onClose()
    setVerificationCode("")
    setBackupCode("")
    setUseBackupCode(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Двухфакторная аутентификация
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Введите код из вашего приложения-аутентификатора
          </p>

          {!useBackupCode ? (
            <div className="space-y-2">
              <Label htmlFor="verification-code">Код подтверждения</Label>
              <Input
                id="verification-code"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="text-center text-lg tracking-wider font-mono"
                autoFocus
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="backup-code">Резервный код</Label>
              <Input
                id="backup-code"
                placeholder="Введите резервный код"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                className="text-center text-sm tracking-wider font-mono"
                autoFocus
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={handleVerify} 
              disabled={loading || (!useBackupCode && verificationCode.length !== 6) || (useBackupCode && !backupCode.trim())}
              className="flex-1"
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

          <div className="text-center">
            <Button
              variant="link"
              size="sm"
              onClick={() => setUseBackupCode(!useBackupCode)}
              className="text-xs"
            >
              <Key className="mr-1 h-3 w-3" />
              {useBackupCode ? "Использовать код из приложения" : "Использовать резервный код"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
