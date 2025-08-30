"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { aggregatorApi } from "@/services/api"
import { formatAmount, formatDateTime } from "@/lib/utils"
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  FileText,
  Loader2,
  MessageSquare,
  Send,
  User,
} from "lucide-react"

interface DisputeMessage {
  id: string
  message: string
  senderId: string
  senderType: "MERCHANT" | "AGGREGATOR" | "ADMIN"
  createdAt: string
}

interface DisputeDetail {
  id: string
  transactionId: string
  status: string
  subject: string
  description?: string
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  transaction: {
    id: string
    numericId: number
    orderId: string
    amount: number
    status: string
    createdAt: string
    merchant: {
      name: string
    }
  }
  messages: DisputeMessage[]
}

export default function AggregatorDisputeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const disputeId = params.id as string
  
  const [dispute, setDispute] = useState<DisputeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)

  useEffect(() => {
    if (disputeId) {
      fetchDispute()
    }
  }, [disputeId])

  const fetchDispute = async () => {
    try {
      setLoading(true)
      const data = await aggregatorApi.getDispute(disputeId)
      setDispute(data)
    } catch (error) {
      console.error("Error fetching dispute:", error)
      toast.error("Ошибка загрузки спора")
      router.push("/aggregator/disputes")
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!message.trim()) {
      toast.error("Введите сообщение")
      return
    }

    setSendingMessage(true)
    try {
      await aggregatorApi.sendDisputeMessage(disputeId, message)
      toast.success("Сообщение отправлено")
      setMessage("")
      await fetchDispute() // Обновляем данные спора
    } catch (error) {
      console.error("Error sending message:", error)
      toast.error("Ошибка отправки сообщения")
    } finally {
      setSendingMessage(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "success" | "destructive" | "warning" }> = {
      OPEN: { label: "Открыт", variant: "default" },
      IN_PROGRESS: { label: "В процессе", variant: "warning" },
      RESOLVED_SUCCESS: { label: "Решен в пользу", variant: "success" },
      RESOLVED_FAIL: { label: "Решен против", variant: "destructive" },
      CANCELLED: { label: "Отменен", variant: "default" },
    }
    const config = statusMap[status] || { label: status, variant: "default" }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getSenderName = (senderType: string) => {
    switch (senderType) {
      case "MERCHANT":
        return "Мерчант"
      case "AGGREGATOR":
        return "Вы"
      case "ADMIN":
        return "Администратор"
      default:
        return senderType
    }
  }

  const getSenderBadgeColor = (senderType: string) => {
    switch (senderType) {
      case "MERCHANT":
        return "bg-blue-100 text-blue-800"
      case "AGGREGATOR":
        return "bg-green-100 text-green-800"
      case "ADMIN":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!dispute) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Спор не найден</p>
        <Button
          variant="outline"
          onClick={() => router.push("/aggregator/disputes")}
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Вернуться к спорам
        </Button>
      </div>
    )
  }

  const isDisputeClosed = ["RESOLVED_SUCCESS", "RESOLVED_FAIL", "CANCELLED"].includes(dispute.status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/aggregator/disputes")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Спор #{dispute.transaction.numericId}</h1>
            <p className="text-muted-foreground">{dispute.subject}</p>
          </div>
        </div>
        {getStatusBadge(dispute.status)}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Transaction Details */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Детали транзакции</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">ID транзакции</p>
              <p className="font-mono">#{dispute.transaction.numericId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Order ID</p>
              <p className="font-mono text-sm">{dispute.transaction.orderId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Мерчант</p>
              <p>{dispute.transaction.merchant.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Сумма</p>
              <p className="text-xl font-bold">{formatAmount(dispute.transaction.amount)} ₽</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Создан</p>
              <p>{formatDateTime(dispute.createdAt)}</p>
            </div>
            {dispute.resolvedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Решен</p>
                <p>{formatDateTime(dispute.resolvedAt)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Переписка
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Messages List */}
            <div className="space-y-4 max-h-[400px] overflow-y-auto mb-4">
              {dispute.messages.length > 0 ? (
                dispute.messages.map((msg) => (
                  <div key={msg.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <Badge className={getSenderBadgeColor(msg.senderType)}>
                          {getSenderName(msg.senderType)}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(msg.createdAt)}
                      </span>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                  <p>Нет сообщений</p>
                </div>
              )}
            </div>

            <Separator className="my-4" />

            {/* Send Message */}
            {!isDisputeClosed ? (
              <div className="space-y-4">
                <Textarea
                  placeholder="Введите ваше сообщение..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={sendMessage}
                  disabled={sendingMessage || !message.trim()}
                  className="w-full"
                >
                  {sendingMessage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Отправка...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Отправить сообщение
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>Спор закрыт, отправка сообщений недоступна</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Description if exists */}
      {dispute.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Описание спора
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{dispute.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
