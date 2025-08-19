"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { traderApi } from "@/services/api"
import { formatAmount } from "@/lib/utils"
import { useTraderAuth } from "@/stores/auth"
import { DisputeChatEnhanced } from "@/components/disputes/dispute-chat-enhanced"
import { 
  Loader2, 
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Search,
  RefreshCw,
  Building2,
  Eye,
  ChevronLeft,
  ChevronRight,
  User
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Dispute {
  id: string
  uuid: string
  transactionId: string
  transactionNumericId: number
  amount: number
  currency: string
  status: string
  reason: string
  description: string
  createdAt: string
  updatedAt: string
  traderName?: string
  merchantName?: string
  methodName?: string
  orderId?: string
  messages?: DisputeMessage[]
  files?: DisputeFile[]
}

interface DisputeMessage {
  id: string
  senderId: string
  senderType: "TRADER" | "MERCHANT" | "ADMIN"
  senderName: string
  message: string
  createdAt: string
  attachments?: DisputeFile[]
}

interface DisputeFile {
  id: string
  filename: string
  url: string
  size: number
  mimeType: string
  uploadedBy: string
  uploadedAt: string
}

const disputeStatusConfig = {
  OPEN: {
    label: "Открыт",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: AlertCircle
  },
  IN_PROGRESS: {
    label: "На рассмотрении",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: Clock
  },
  RESOLVED_SUCCESS: {
    label: "Решен в вашу пользу",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle
  },
  RESOLVED_FAIL: {
    label: "Решен не в вашу пользу",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: XCircle
  },
  CANCELLED: {
    label: "Отменен",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: XCircle
  }
}

interface DisputesListEnhancedProps {
  userType: "trader" | "merchant"
}

export function DisputesListEnhanced({ userType }: DisputesListEnhancedProps) {
  const { user, token } = useTraderAuth()
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("newest")
  const [filterStatus, setFilterStatus] = useState("all")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const pageSize = 20

  // Messaging state
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)
  const [showMessagesDialog, setShowMessagesDialog] = useState(false)
  const [messages, setMessages] = useState<DisputeMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  useEffect(() => {
    fetchDisputes()
  }, [page, activeTab, sortBy])

  const fetchDisputes = async () => {
    try {
      setLoading(true)
      
      const params: any = {
        page,
        limit: pageSize,
      }
      
      if (filterStatus !== "all") {
        params.status = filterStatus
      }
      
      const response = await traderApi.getDealDisputes(params)
      
      if (response.data) {
        const mappedDisputes: Dispute[] = response.data.map((dispute: any) => ({
          id: dispute.id,
          uuid: dispute.id,
          transactionId: dispute.dealId,
          transactionNumericId: dispute.deal?.numericId || 0,
          amount: dispute.deal?.amount || 0,
          currency: "RUB",
          status: dispute.status,
          reason: dispute.reason || "unknown",
          description: dispute.messages?.[0]?.message || "Спор создан",
          createdAt: dispute.createdAt,
          updatedAt: dispute.updatedAt,
          traderName: dispute.deal?.trader?.user?.name || "—",
          merchantName: dispute.merchant?.name || "—",
          methodName: dispute.deal?.method?.name || "—",
          orderId: dispute.deal?.orderId || undefined,
          messages: dispute.messages || []
        }))
        
        setDisputes(mappedDisputes)
        setHasMore(mappedDisputes.length === pageSize)
      }
    } catch (error) {
      console.error("Error fetching disputes:", error)
      toast.error("Не удалось загрузить споры")
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (disputeId: string) => {
    try {
      setLoadingMessages(true)
      
      const response = await traderApi.getDealDispute(disputeId)
      
      if (response.data && response.data.messages) {
        const mappedMessages: DisputeMessage[] = response.data.messages.map((msg: any) => ({
          id: msg.id,
          senderId: msg.senderId,
          senderType: msg.senderType,
          senderName: msg.sender?.name || msg.senderType,
          message: msg.message,
          createdAt: msg.createdAt,
          attachments: msg.attachments?.map((att: any) => ({
            id: att.id,
            filename: att.filename,
            url: att.url,
            size: att.size,
            mimeType: att.mimeType,
            uploadedBy: att.uploadedBy,
            uploadedAt: att.createdAt
          })) || []
        }))
        
        setMessages(mappedMessages)
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
      toast.error("Не удалось загрузить сообщения")
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleOpenMessages = async (dispute: Dispute) => {
    setSelectedDispute(dispute)
    setShowMessagesDialog(true)
    await fetchMessages(dispute.id)
  }


  const filteredDisputes = disputes.filter(dispute => {
    // Tab filtering
    if (activeTab !== "all") {
      if (activeTab === "open" && dispute.status !== "OPEN") return false
      if (activeTab === "in_progress" && dispute.status !== "IN_PROGRESS") return false
      if (activeTab === "resolved" && !["RESOLVED_SUCCESS", "RESOLVED_FAIL"].includes(dispute.status)) return false
      if (activeTab === "cancelled" && dispute.status !== "CANCELLED") return false
    }

    // Search filtering
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        dispute.transactionNumericId.toString().includes(query) ||
        dispute.traderName?.toLowerCase().includes(query) ||
        dispute.merchantName?.toLowerCase().includes(query) ||
        dispute.orderId?.toLowerCase().includes(query)
      )
    }

    return true
  })

  const sortedDisputes = [...filteredDisputes].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case "amount_desc":
        return b.amount - a.amount
      case "amount_asc":
        return a.amount - b.amount
      default:
        return 0
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-[#006039]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Споры</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDisputes}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Поиск по номеру, участникам или ID заказа..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Сортировка" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Сначала новые</SelectItem>
            <SelectItem value="oldest">Сначала старые</SelectItem>
            <SelectItem value="amount_desc">По сумме ↓</SelectItem>
            <SelectItem value="amount_asc">По сумме ↑</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            Все споры
            <Badge variant="secondary" className="ml-2">
              {disputes.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="open">
            Открытые
            <Badge variant="secondary" className="ml-2">
              {disputes.filter(d => d.status === "OPEN").length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            На рассмотрении
            <Badge variant="secondary" className="ml-2">
              {disputes.filter(d => d.status === "IN_PROGRESS").length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Решенные
            <Badge variant="secondary" className="ml-2">
              {disputes.filter(d => ["RESOLVED_SUCCESS", "RESOLVED_FAIL"].includes(d.status)).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Отмененные
            <Badge variant="secondary" className="ml-2">
              {disputes.filter(d => d.status === "CANCELLED").length}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Disputes List */}
      <div className="space-y-4">
        {sortedDisputes.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            Нет споров в данной категории
          </Card>
        ) : (
          sortedDisputes.map((dispute) => {
            const statusConfig = disputeStatusConfig[dispute.status as keyof typeof disputeStatusConfig]
            const StatusIcon = statusConfig?.icon || AlertCircle

            return (
              <Card key={dispute.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">Спор {dispute.transactionNumericId}</h3>
                      <Badge className={cn("border", statusConfig?.color)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig?.label}
                      </Badge>
                      {(dispute.status === "OPEN" || dispute.status === "IN_PROGRESS") && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Активен
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-gray-600">Сумма</p>
                        <p className="font-medium">{formatAmount(dispute.amount)} ₽</p>
                      </div>
                      <div>
                        <p className="text-gray-600">{userType === "trader" ? "Мерчант" : "Трейдер"}</p>
                        <p className="font-medium flex items-center gap-1">
                          {userType === "trader" ? (
                            <>
                              <Building2 className="h-3 w-3" />
                              {dispute.merchantName || "—"}
                            </>
                          ) : (
                            <>
                              <User className="h-3 w-3" />
                              {dispute.traderName || "—"}
                            </>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Метод</p>
                        <p className="font-medium">{dispute.methodName || "—"}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Дата создания</p>
                        <p className="font-medium">{format(new Date(dispute.createdAt), "d MMM yyyy", { locale: ru })}</p>
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-gray-700">
                      <p className="line-clamp-2">{dispute.description}</p>
                    </div>

                    <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                      <span>ID заказа: {dispute.orderId || "—"}</span>
                      <span>•</span>
                      <span>Обновлен: {format(new Date(dispute.updatedAt), "d MMM 'в' HH:mm", { locale: ru })}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/trader/transactions/${dispute.transactionId}`, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Сделка
                    </Button>
                    <Button
                      onClick={() => handleOpenMessages(dispute)}
                      className="bg-[#006039] hover:bg-[#006039]/90"
                      size="sm"
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Чат
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Показано {sortedDisputes.length} споров
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
            Назад
          </Button>
          <span className="text-sm">Страница {page}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={!hasMore || loading}
          >
            Вперед
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Dialog */}
      <Dialog open={showMessagesDialog} onOpenChange={setShowMessagesDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Переписка по спору</DialogTitle>
          </DialogHeader>
          <div className="h-[90vh]">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : selectedDispute ? (
              <DisputeChatEnhanced
                disputeId={selectedDispute.id}
                messages={messages}
                userType={userType}
                userId={user?.id || ""}
                token={token}
                onSendMessage={async (message, files) => {
                  const formData = new FormData();
                  formData.append("message", message);
                  files.forEach(file => formData.append("files", file));
                  
                  const response = await traderApi.sendDealDisputeMessage(selectedDispute.id, formData);
                  
                  if (response.data) {
                    const newMsg: DisputeMessage = {
                      id: response.data.id,
                      senderId: response.data.senderId,
                      senderType: response.data.senderType,
                      senderName: "Вы",
                      message: response.data.message,
                      createdAt: response.data.createdAt,
                      attachments: response.data.attachments?.map((att: any) => ({
                        id: att.id,
                        filename: att.filename,
                        url: att.url,
                        size: att.size,
                        mimeType: att.mimeType,
                        uploadedBy: att.uploadedBy,
                        uploadedAt: att.createdAt
                      })) || []
                    };
                    
                    setMessages([...messages, newMsg]);
                    toast.success("Сообщение отправлено");
                  }
                }}
                onNewMessage={(message) => {
                  // Add new message received via WebSocket
                  setMessages(prevMessages => {
                    // Check if message already exists
                    const exists = prevMessages.some(m => m.id === message.id);
                    if (!exists) {
                      return [...prevMessages, message];
                    }
                    return prevMessages;
                  });
                }}
                isActive={["OPEN", "IN_PROGRESS"].includes(selectedDispute.status)}
                disputeInfo={{
                  transactionId: selectedDispute.transactionNumericId.toString(),
                  amount: selectedDispute.amount,
                  status: selectedDispute.status,
                  merchantName: selectedDispute.merchantName,
                  traderName: selectedDispute.traderName
                }}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}