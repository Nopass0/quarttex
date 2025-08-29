"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { 
  Copy,
  CheckCircle2,
  Info,
  Wallet,
  ArrowDownRight,
  QrCode,
  Shield,
  Clock,
  Loader2
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { traderApi } from "@/lib/api/trader"
import QRCode from "react-qr-code"

interface DepositDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  depositType?: 'BALANCE' | 'INSURANCE'
}

interface DepositSettings {
  address: string
  minAmount: number
  confirmationsRequired: number
  expiryMinutes: number
  network: string
}

export function DepositDialog({ open, onOpenChange, depositType = 'BALANCE' }: DepositDialogProps) {
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [amount, setAmount] = useState("")
  const [step, setStep] = useState(1)
  const [showQR, setShowQR] = useState(false)
  const [loading, setLoading] = useState(false)
  const [depositSettings, setDepositSettings] = useState<DepositSettings | null>(null)
  const [amountError, setAmountError] = useState("")
  const [txHash, setTxHash] = useState("")
  
  useEffect(() => {
    if (open) {
      fetchDepositSettings()
    }
  }, [open])
  
  const fetchDepositSettings = async () => {
    try {
      const response = await traderApi.getDepositSettings()
      setDepositSettings(response.data || response)
    } catch (error) {
      toast.error("Не удалось загрузить настройки депозита")
    }
  }
  
  const handleCopyAddress = () => {
    if (depositSettings) {
      navigator.clipboard.writeText(depositSettings.address)
      setCopiedAddress(true)
      toast.success("Адрес скопирован в буфер обмена")
      setTimeout(() => setCopiedAddress(false), 3000)
    }
  }
  
  const handleAmountChange = (value: string) => {
    setAmount(value)
    setAmountError("")
    
    if (value && depositSettings) {
      const parsedAmount = parseFloat(value)
      if (isNaN(parsedAmount)) {
        setAmountError("Введите корректную сумму")
      } else if (parsedAmount < depositSettings.minAmount) {
        setAmountError(`Минимальная сумма: ${depositSettings.minAmount} USDT`)
      }
    }
  }

  const handleNextStep = async () => {
    if (step === 1) {
      const parsedAmount = parseFloat(amount)
      if (!amount || isNaN(parsedAmount)) {
        toast.error("Введите корректную сумму")
        return
      }
      if (!depositSettings || parsedAmount < depositSettings.minAmount) {
        toast.error(`Минимальная сумма пополнения: ${depositSettings?.minAmount || 10} USDT`)
        return
      }
      setStep(2)
    } else if (step === 2) {
      if (!txHash) {
        toast.error("Введите хеш транзакции")
        return
      }
      setLoading(true)
      try {
        await traderApi.createDepositRequest({
          amountUSDT: parseFloat(amount),
          txHash: txHash,
          type: depositType
        })
        setStep(3)
        toast.success("Заявка на пополнение создана")
      } catch (error: any) {
        toast.error(error.response?.data?.error || "Не удалось создать заявку")
      } finally {
        setLoading(false)
      }
    }
  }

  const handleReset = () => {
    setStep(1)
    setAmount("")
    setAmountError("")
    setTxHash("")
    setShowQR(false)
  }

  useEffect(() => {
    if (!open) {
      setTimeout(() => handleReset(), 300)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownRight className="h-5 w-5" style={{ color: '#006039' }} />
            Пополнение {depositType === 'INSURANCE' ? 'депозитного' : ''} баланса
          </DialogTitle>
          <DialogDescription>
            Пополните баланс для участия в сделках
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  step >= stepNum
                    ? "bg-[#006039] text-white"
                    : "bg-gray-200 text-gray-600"
                )}>
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <div className={cn(
                    "w-16 h-0.5 mx-2",
                    step > stepNum ? "bg-[#006039]" : "bg-gray-200"
                  )} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Amount */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="deposit-amount">Сумма пополнения</Label>
                <div className="mt-2 relative">
                  <Input
                    id="deposit-amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className={cn("pr-16", amountError && "border-red-500 focus:border-red-500")}
                    min={depositSettings?.minAmount || 10}
                    step="0.01"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                    USDT
                  </span>
                </div>
                {amountError && (
                  <p className="text-sm text-red-500 mt-1">{amountError}</p>
                )}
              </div>

              <Card className="p-4 border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20">
                <div className="flex items-start gap-3">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-300">
                    <p>• Минимальная сумма: {depositSettings?.minAmount || 10} USDT</p>
                    <p>• Сеть: {depositSettings?.network || "TRC-20"}</p>
                    <p>• Требуется подтверждений: {depositSettings?.confirmationsRequired || 3}</p>
                    <p>• Время на отправку: {depositSettings?.expiryMinutes || 60} минут</p>
                  </div>
                </div>
              </Card>

              <Button 
                onClick={handleNextStep}
                disabled={!amount || !!amountError}
                className="w-full bg-[#006039] hover:bg-[#006039]/90 dark:bg-[#2d6a42] dark:hover:bg-[#2d6a42]/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Продолжить
              </Button>
            </div>
          )}

          {/* Step 2: Address */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#006039] mb-1">
                  {parseFloat(amount).toFixed(2)} USDT
                </div>
                <div className="text-sm text-gray-600">
                  к пополнению
                </div>
              </div>

              <div>
                <Label>Адрес для пополнения</Label>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 p-3 bg-gray-50 dark:bg-[#0f0f0f] rounded-lg font-mono text-sm break-all dark:text-[#eeeeee]">
                    {depositSettings?.address || "Loading..."}
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleCopyAddress}
                    className="shrink-0"
                  >
                    {copiedAddress ? (
                      <CheckCircle2 className="h-4 w-4" style={{ color: '#006039' }} />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="tx-hash">Хеш транзакции *</Label>
                <Input
                  id="tx-hash"
                  type="text"
                  placeholder="Введите хеш транзакции после отправки"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  className="mt-2 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  После отправки USDT на указанный адрес, введите хеш транзакции
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowQR(!showQR)}
                  className="flex-1"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  QR-код
                </Button>
                <Button
                  onClick={handleNextStep}
                  disabled={loading || !txHash}
                  className="flex-1 bg-[#006039] hover:bg-[#006039]/90 dark:bg-[#2d6a42] dark:hover:bg-[#2d6a42]/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Создание заявки...
                    </>
                  ) : (
                    "Создать заявку"
                  )}
                </Button>
              </div>

              {showQR && depositSettings && (
                <Card className="p-4 text-center">
                  <div className="bg-white p-4 rounded-lg mx-auto mb-2 inline-block">
                    <QRCode value={depositSettings.address} size={150} />
                  </div>
                  <div className="text-sm text-gray-600">
                    QR-код для удобного копирования адреса
                  </div>
                </Card>
              )}

              <Card className="p-4 border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-900/20">
                <div className="flex items-start gap-3">
                  <Shield className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-orange-800 dark:text-orange-300">
                    <p className="font-medium mb-1">Важно!</p>
                    <p>• Отправляйте только USDT по сети {depositSettings?.network || "TRC-20"}</p>
                    <p>• Средства с других сетей будут потеряны</p>
                    <p>• Проверьте адрес перед отправкой</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="space-y-4 text-center">
              <div className="p-6 rounded-lg" style={{ backgroundColor: 'rgba(0, 96, 57, 0.05)' }}>
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4" style={{ color: '#006039' }} />
                <h3 className="font-semibold text-lg mb-2">Заявка создана</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Ваша заявка на пополнение {parseFloat(amount).toFixed(2)} USDT принята
                </p>
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  Ожидает подтверждения
                </Badge>
              </div>

              <Card className="p-4 border-blue-200 bg-blue-50/50">
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p>• Время зачисления: 1-10 минут</p>
                    <p>• Статус можно отследить в разделе "Заявки на пополнение"</p>
                    <p>• При возникновении проблем обращайтесь в поддержку</p>
                  </div>
                </div>
              </Card>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Закрыть
                </Button>
                <Button
                  onClick={handleReset}
                  className="flex-1 bg-[#006039] hover:bg-[#006039]/90 dark:bg-[#2d6a42] dark:hover:bg-[#2d6a42]/90 text-white"
                >
                  Новое пополнение
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}