"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Eye,
  X,
  Send,
  Loader2
} from "lucide-react"
import { formatAmount, formatDateTime } from "@/lib/utils"
import { toast } from "sonner"
import { traderApiInstance } from "@/services/api"
import { CancelPayoutDialog } from "./cancel-payout-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface Payout {
  id: number
  uuid: string
  amount: number
  amountUsdt: number
  total: number
  totalUsdt: number
  rate: number
  wallet: string
  bank: string
  isCard: boolean
  status: string
  expireAt: string
  createdAt: string
  acceptedAt?: string
  confirmedAt?: string
  cancelledAt?: string
  merchantName: string
}

interface PayoutListEnhancedProps {
  payouts: Payout[]
  onRefresh: () => void
}

const statusConfig = {
  CREATED: {
    label: "Новая",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: Clock,
    actions: ["accept"]
  },
  ACTIVE: {
    label: "Принята",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: Clock,
    actions: ["confirm", "cancel"]
  },
  CHECKING: {
    label: "На проверке",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: Eye,
    actions: ["cancel"]
  },
  COMPLETED: {
    label: "Завершена",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle,
    actions: []
  },
  CANCELLED: {
    label: "Отменена",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: XCircle,
    actions: []
  },
  EXPIRED: {
    label: "Истекла",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: AlertCircle,
    actions: []
  },
  DISPUTED: {
    label: "Спор",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: AlertCircle,
    actions: ["cancel"]
  }
}

export function PayoutListEnhanced({ payouts, onRefresh }: PayoutListEnhancedProps) {
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const handleAccept = async (payout: Payout) => {
    setProcessingId(payout.uuid)
    try {
      await traderApiInstance.post(`/trader/payouts/${payout.uuid}/accept`)
      toast.success("Выплата принята")
      onRefresh()
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Не удалось принять выплату")
    } finally {
      setProcessingId(null)
    }
  }

  const handleConfirm = async (payout: Payout) => {
    // In a real app, this would open a dialog to upload proof files
    toast.info("Откройте диалог для загрузки подтверждающих документов")
  }

  const handleCancel = (payout: Payout) => {
    setSelectedPayout(payout)
    setShowCancelDialog(true)
  }

  const handleViewDetails = (payout: Payout) => {
    setSelectedPayout(payout)
    setShowDetailsDialog(true)
  }

  const getTimeRemaining = (expireAt: string) => {
    const now = new Date().getTime()
    const expire = new Date(expireAt).getTime()
    const diff = expire - now

    if (diff <= 0) return "Истекло"

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}ч ${minutes % 60}м`
    }
    return `${minutes}м`
  }

  return (
    <>
      <div className="space-y-4">
        {payouts.map((payout) => {
          const config = statusConfig[payout.status as keyof typeof statusConfig]
          const Icon = config?.icon || Clock
          const isProcessing = processingId === payout.uuid

          return (
            <Card key={payout.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold">Выплата ${payout.id}</h3>
                    <Badge className={config?.color}>
                      <Icon className="h-3 w-3 mr-1" />
                      {config?.label}
                    </Badge>
                    {(payout.status === "CREATED" || payout.status === "ACTIVE") && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {getTimeRemaining(payout.expireAt)}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600">Сумма</p>
                      <p className="font-medium">{formatAmount(payout.amount)} RUB</p>
                      <p className="text-xs text-gray-500">{payout.amountUsdt.toFixed(2)} USDT</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Комиссия</p>
                      <p className="font-medium">{formatAmount(payout.total)} RUB</p>
                      <p className="text-xs text-gray-500">{payout.totalUsdt.toFixed(2)} USDT</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Курс</p>
                      <p className="font-medium">{payout.rate.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Банк</p>
                      <p className="font-medium">{payout.bank}</p>
                      <p className="text-xs text-gray-500">{payout.isCard ? "Карта" : "Счет"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                    <span>Мерчант: {payout.merchantName}</span>
                    <span>•</span>
                    <span>{formatDateTime(payout.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {config?.actions.includes("accept") && (
                    <Button
                      size="sm"
                      onClick={() => handleAccept(payout)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Принять
                        </>
                      )}
                    </Button>
                  )}

                  {config?.actions.includes("confirm") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleConfirm(payout)}
                      className="text-green-600 border-green-200 hover:bg-green-50"
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Подтвердить
                    </Button>
                  )}

                  {config?.actions.includes("cancel") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCancel(payout)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Отменить
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleViewDetails(payout)}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Cancel Dialog */}
      {selectedPayout && (
        <CancelPayoutDialog
          open={showCancelDialog}
          onOpenChange={setShowCancelDialog}
          payoutId={selectedPayout.uuid}
          onSuccess={onRefresh}
        />
      )}

      {/* Details Dialog */}
      {selectedPayout && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Детали выплаты ${selectedPayout.id}</DialogTitle>
              <DialogDescription>
                Полная информация о выплате
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Основная информация</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Статус:</span>
                      <Badge className={statusConfig[selectedPayout.status as keyof typeof statusConfig]?.color}>
                        {statusConfig[selectedPayout.status as keyof typeof statusConfig]?.label}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Сумма:</span>
                      <span>{formatAmount(selectedPayout.amount)} RUB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">В USDT:</span>
                      <span>{selectedPayout.amountUsdt.toFixed(2)} USDT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Курс:</span>
                      <span>{selectedPayout.rate.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Реквизиты</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Кошелек:</span>
                      <span className="font-mono text-xs">{selectedPayout.wallet}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Банк:</span>
                      <span>{selectedPayout.bank}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Тип:</span>
                      <span>{selectedPayout.isCard ? "Карта" : "Счет"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Временные метки</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Создана:</span>
                    <span>{formatDateTime(selectedPayout.createdAt)}</span>
                  </div>
                  {selectedPayout.acceptedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Принята:</span>
                      <span>{formatDateTime(selectedPayout.acceptedAt)}</span>
                    </div>
                  )}
                  {selectedPayout.confirmedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Подтверждена:</span>
                      <span>{formatDateTime(selectedPayout.confirmedAt)}</span>
                    </div>
                  )}
                  {selectedPayout.cancelledAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Отменена:</span>
                      <span>{formatDateTime(selectedPayout.cancelledAt)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Истекает:</span>
                    <span>{formatDateTime(selectedPayout.expireAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}