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
  ArrowUpRight,
  Info,
  Wallet,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  Calculator
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { traderApi } from "@/services/api"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface WithdrawalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultBalanceType?: string
}

interface WithdrawalSettings {
  minAmount: number
  feePercent: number
  feeFixed: number
  feeEnabled: boolean
  processingHours: number
}

interface BalanceData {
  TRUST: number
  COMPENSATION: number
  PROFIT_DEALS: number
  PROFIT_PAYOUTS: number
  REFERRAL: number
  WORKING: number
}

const balanceTypeNames = {
  TRUST: "Баланс",
  COMPENSATION: "Компенсация выплат",
  PROFIT_DEALS: "Прибыль с приема",
  PROFIT_PAYOUTS: "Прибыль с выплат",
  REFERRAL: "Реферальный баланс",
  BALANCE: "Баланс"  // Map BALANCE to TRUST for backend
}

export function WithdrawalDialog({ open, onOpenChange, defaultBalanceType }: WithdrawalDialogProps) {
  const [amount, setAmount] = useState("")
  const [walletAddress, setWalletAddress] = useState("")
  const [balanceType, setBalanceType] = useState(defaultBalanceType || "TRUST")
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<WithdrawalSettings | null>(null)
  const [balances, setBalances] = useState<BalanceData | null>(null)
  const [calculatedFee, setCalculatedFee] = useState(0)
  const [amountAfterFees, setAmountAfterFees] = useState(0)
  
  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open])
  
  useEffect(() => {
    if (defaultBalanceType && open) {
      setBalanceType(defaultBalanceType)
    }
  }, [defaultBalanceType, open])
  
  useEffect(() => {
    if (amount && settings) {
      const amountNum = parseFloat(amount)
      if (!isNaN(amountNum)) {
        const fee = settings.feeEnabled ? (amountNum * settings.feePercent / 100) + settings.feeFixed : 0
        setCalculatedFee(fee)
        setAmountAfterFees(amountNum - fee)
      }
    } else {
      setCalculatedFee(0)
      setAmountAfterFees(0)
    }
  }, [amount, settings])
  
  const fetchData = async () => {
    try {
      const [settingsRes, balancesRes] = await Promise.all([
        traderApi.getWithdrawalSettings(),
        traderApi.getWithdrawalBalances()
      ])
      setSettings(settingsRes.data || settingsRes)
      setBalances(balancesRes.data || balancesRes)
    } catch (error) {
      toast.error("Не удалось загрузить данные")
    }
  }

  const handleSubmit = async () => {
    if (!amount || !walletAddress || !settings || !balances) return
    
    const amountNum = parseFloat(amount)
    if (amountNum < settings.minAmount) {
      toast.error(`Минимальная сумма вывода: ${settings.minAmount} USDT`)
      return
    }
    
    const availableBalance = balances[balanceType as keyof BalanceData]
    if (amountNum > availableBalance) {
      toast.error("Недостаточно средств на балансе")
      return
    }
    
    setLoading(true)
    try {
      // Map BALANCE to TRUST for backend compatibility
      const requestBalanceType = balanceType === 'BALANCE' ? 'TRUST' : balanceType
      
      await traderApi.createWithdrawal({
        amountUSDT: amountNum,
        balanceType: requestBalanceType,
        walletAddress
      })
      setStep(2)
      toast.success("Заявка на вывод создана")
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Ошибка создания заявки")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setStep(1)
    setAmount("")
    setWalletAddress("")
    setBalanceType(defaultBalanceType || "TRUST")
  }
  
  useEffect(() => {
    if (!open) {
      setTimeout(() => handleReset(), 300)
    }
  }, [open])
  
  const selectedBalance = balances?.[balanceType as keyof BalanceData] || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-red-600" />
            Вывод средств
          </DialogTitle>
          <DialogDescription>
            Выведите средства на внешний кошелек
          </DialogDescription>
          {balances && (
            <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-sm text-green-800 dark:text-green-300">
                <div className="font-medium mb-1">Доступная прибыль для вывода:</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Прибыль с приема:</span>
                    <span className="font-semibold">{balances.PROFIT_DEALS.toFixed(2)} USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Прибыль с выплат:</span>
                    <span className="font-semibold">{balances.PROFIT_PAYOUTS.toFixed(2)} USDT</span>
                  </div>
                  <div className="border-t pt-1 mt-1 flex justify-between">
                    <span className="font-medium">Общая прибыль:</span>
                    <span className="font-bold text-[#006039] dark:text-[#2d6a42]">
                      {(balances.PROFIT_DEALS + balances.PROFIT_PAYOUTS).toFixed(2)} USDT
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6">
            {/* Balance Type Selection */}
            <div>
              <Label>Выберите баланс для вывода</Label>
              <RadioGroup value={balanceType} onValueChange={setBalanceType} className="mt-3">
                {Object.entries(balanceTypeNames).map(([type, name]) => {
                  const balance = balances?.[type as keyof BalanceData] || 0
                  const disabled = balance <= 0
                  
                  return (
                    <div
                      key={type}
                      className={cn(
                        "flex items-center space-x-3 p-3 rounded-lg border",
                        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50"
                      )}
                    >
                      <RadioGroupItem value={type} disabled={disabled} />
                      <Label 
                        htmlFor={type} 
                        className={cn("flex-1 cursor-pointer", disabled && "cursor-not-allowed")}
                      >
                        <div className="flex justify-between items-center">
                          <span>{name}</span>
                          <span className={cn("font-medium", balance > 0 ? "text-[#006039]" : "text-gray-400")}>
                            {balance.toFixed(2)} USDT
                          </span>
                        </div>
                      </Label>
                    </div>
                  )
                })}
              </RadioGroup>
            </div>

            {/* Amount Input */}
            <div>
              <Label htmlFor="withdrawal-amount">Сумма вывода</Label>
              <div className="mt-2 relative">
                <Input
                  id="withdrawal-amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pr-16"
                  min={settings?.minAmount || 50}
                  max={selectedBalance}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                  USDT
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Доступно: {selectedBalance.toFixed(2)} USDT
              </p>
            </div>

            {/* Wallet Address */}
            <div>
              <Label htmlFor="wallet-address">Адрес кошелька (TRC-20)</Label>
              <Input
                id="wallet-address"
                type="text"
                placeholder="TXXXxxxxxxxxxxxxxxxxxxx"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="mt-2 font-mono"
                minLength={34}
                maxLength={42}
              />
              {walletAddress && walletAddress.length < 34 && (
                <p className="text-xs text-red-500 mt-1">
                  Адрес должен содержать минимум 34 символа
                </p>
              )}
            </div>

            {/* Fee Calculation - Show only if fees are enabled */}
            {amount && parseFloat(amount) > 0 && settings?.feeEnabled && (
              <Card className="p-4 border-blue-200 bg-blue-50/50">
                <div className="flex items-start gap-3">
                  <Calculator className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 space-y-1">
                    <div className="flex justify-between">
                      <span>Сумма вывода:</span>
                      <span className="font-medium">{parseFloat(amount).toFixed(2)} USDT</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Комиссия ({settings?.feePercent}% + {settings?.feeFixed} USDT):</span>
                      <span className="font-medium">-{calculatedFee.toFixed(2)} USDT</span>
                    </div>
                    <div className="border-t pt-1 flex justify-between font-medium">
                      <span>К получению:</span>
                      <span className="text-[#006039]">{amountAfterFees.toFixed(2)} USDT</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Info */}
            <Card className="p-4 border-orange-200 bg-orange-50/50">
              <div className="flex items-start gap-3">
                <Info className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                <div className="text-sm text-orange-800">
                  <p>• Минимальная сумма: {settings?.minAmount || 50} USDT</p>
                  <p>• Время обработки: до {settings?.processingHours || 24} часов</p>
                  <p>• Сеть: TRC-20 (TRON)</p>
                  <p>• Проверьте правильность адреса перед отправкой</p>
                </div>
              </div>
            </Card>

            <Button 
              onClick={handleSubmit}
              disabled={loading || !amount || !walletAddress || parseFloat(amount) <= 0 || walletAddress.length < 34}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Создание заявки...
                </>
              ) : (
                "Создать заявку на вывод"
              )}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 text-center">
            <div className="p-6 rounded-lg bg-green-50">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-[#006039]" />
              <h3 className="font-semibold text-lg mb-2">Заявка создана</h3>
              <p className="text-sm text-gray-600 mb-4">
                Ваша заявка на вывод {parseFloat(amount).toFixed(2)} USDT успешно создана
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">К получению:</span>
                  <span className="font-medium">{amountAfterFees.toFixed(2)} USDT</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Адрес:</span>
                  <span className="font-mono text-xs">{walletAddress.slice(0, 10)}...{walletAddress.slice(-10)}</span>
                </div>
              </div>
              <Badge className="mt-3 bg-yellow-100 text-yellow-800 border-yellow-200">
                Ожидает модерации
              </Badge>
            </div>

            <Card className="p-4 border-blue-200 bg-blue-50/50">
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p>• Время обработки: до {settings?.processingHours || 24} часов</p>
                  <p>• Статус можно отследить в истории операций</p>
                  <p>• При возникновении вопросов обращайтесь в поддержку</p>
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
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                Новая заявка
              </Button>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  )
}