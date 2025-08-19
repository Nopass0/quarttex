'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { traderApi } from '@/services/api'
import { 
  Copy, 
  Loader2, 
  QrCode, 
  Clock, 
  AlertCircle,
  CheckCircle2 
} from 'lucide-react'
import QRCode from 'react-qr-code'

interface DepositDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface DepositSettings {
  address: string
  minAmount: number
  confirmationsRequired: number
  expiryMinutes: number
  network: string
}

export function DepositDialog({ open, onOpenChange, onSuccess }: DepositDialogProps) {
  const [amount, setAmount] = useState('')
  const [settings, setSettings] = useState<DepositSettings | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingSettings, setIsFetchingSettings] = useState(true)
  const [depositRequest, setDepositRequest] = useState<any>(null)
  const [showQrCode, setShowQrCode] = useState(false)

  useEffect(() => {
    if (open) {
      fetchDepositSettings()
    }
  }, [open])

  const fetchDepositSettings = async () => {
    try {
      setIsFetchingSettings(true)
      const response = await traderApi.getDepositSettings()
      setSettings(response.data)
    } catch (error) {
      toast.error('Не удалось загрузить настройки депозита')
      onOpenChange(false)
    } finally {
      setIsFetchingSettings(false)
    }
  }

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Введите корректную сумму')
      return
    }

    if (settings && parseFloat(amount) < settings.minAmount) {
      toast.error(`Минимальная сумма пополнения: ${settings.minAmount} USDT`)
      return
    }

    try {
      setIsLoading(true)
      const response = await traderApi.createDepositRequest({
        amountUSDT: parseFloat(amount)
      })
      
      setDepositRequest(response.data)
      toast.success('Заявка на пополнение создана')
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Не удалось создать заявку')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} скопирован`)
    }).catch(() => {
      toast.error('Не удалось скопировать')
    })
  }

  const handleClose = () => {
    setAmount('')
    setDepositRequest(null)
    setShowQrCode(false)
    onOpenChange(false)
  }

  if (isFetchingSettings) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-[#006039]" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!settings) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {depositRequest ? 'Инструкция по пополнению' : 'Пополнение баланса'}
          </DialogTitle>
          <DialogDescription>
            {depositRequest 
              ? 'Переведите USDT на указанный адрес' 
              : 'Пополните ваш ТРАСТ баланс через USDT TRC-20'
            }
          </DialogDescription>
        </DialogHeader>

        {!depositRequest ? (
          // Step 1: Enter amount
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Сумма пополнения (USDT)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={settings.minAmount}
                step="0.01"
              />
              <p className="text-sm text-gray-500">
                Минимальная сумма: {settings.minAmount} USDT
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Используйте только сеть {settings.network}</li>
                  <li>Требуется {settings.confirmationsRequired} подтверждений</li>
                  <li>Заявка действительна {settings.expiryMinutes} минут</li>
                  <li>Средства будут зачислены на ТРАСТ баланс</li>
                </ul>
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Отмена
              </Button>
              <Button
                className="bg-[#006039] hover:bg-[#006039]/90"
                onClick={handleSubmit}
                disabled={isLoading || !amount || parseFloat(amount) < settings.minAmount}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Создание заявки...
                  </>
                ) : (
                  'Продолжить'
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // Step 2: Show deposit details
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Сумма к оплате</p>
                <p className="text-2xl font-semibold">{depositRequest.amountUSDT} USDT</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Сеть</span>
                  <Badge variant="secondary">{settings.network}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Статус</span>
                  <Badge variant="default">Ожидает оплаты</Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Адрес для перевода</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={depositRequest.address}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(depositRequest.address, 'Адрес')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQrCode(!showQrCode)}
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  {showQrCode ? 'Скрыть QR-код' : 'Показать QR-код'}
                </Button>
              </div>

              {showQrCode && (
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <QRCode
                    value={depositRequest.address}
                    size={200}
                    level="H"
                  />
                </div>
              )}

              <Alert className="bg-yellow-50 border-yellow-200">
                <Clock className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  После отправки средств они будут зачислены автоматически после {settings.confirmationsRequired} подтверждений в сети.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Закрыть
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}