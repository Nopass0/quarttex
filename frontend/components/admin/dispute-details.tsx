'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { 
  ArrowLeft,
  Send,
  User,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  MessageSquare,
  Clock,
  CreditCard,
  Hash,
} from 'lucide-react'
import { toast } from 'sonner'
import { adminApi } from '@/services/api'
import { cn, formatAmount } from '@/lib/utils'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { DisputeMessagesRealtime } from '@/components/disputes/dispute-messages-realtime'
// import { io, Socket } from 'socket.io-client'

interface DisputeMessage {
  id: string
  message: string
  senderId: string
  senderType: string
  sender: {
    id: string
    name: string
    email: string
  } | null
  files: Array<{
    id: string
    fileName: string
    fileSize: number
    mimeType: string
    url: string
  }>
  createdAt: string
}

interface DisputeDetailsProps {
  type: 'deal' | 'withdrawal'
  disputeId: string
}

export function DisputeDetails({ type, disputeId }: DisputeDetailsProps) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dispute, setDispute] = useState<any>(null)
  const [showResolveDialog, setShowResolveDialog] = useState(false)
  const [resolveInFavorOf, setResolveInFavorOf] = useState<'MERCHANT' | 'TRADER'>('MERCHANT')
  const [resolution, setResolution] = useState('')
  const [isResolving, setIsResolving] = useState(false)
  
  // WebSocket
  // const [socket, setSocket] = useState<Socket | null>(null)
  // const [isConnected, setIsConnected] = useState(false)

  const fetchDispute = async () => {
    try {
      setIsLoading(true)
      const data = type === 'deal' 
        ? await adminApi.getDealDispute(disputeId)
        : await adminApi.getWithdrawalDispute(disputeId)
      setDispute(data)
    } catch (error) {
      toast.error('Не удалось загрузить информацию о споре')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDispute()
  }, [type, disputeId])

  // WebSocket connection
  /* useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'
    const newSocket = io(socketUrl, {
      transports: ['websocket'],
      auth: {
        token: localStorage.getItem('admin-auth-token') || '',
        userType: 'admin'
      }
    })

    newSocket.on('connect', () => {
      console.log('Admin connected to WebSocket')
      setIsConnected(true)
      // Join dispute room
      newSocket.emit('join-dispute', { disputeId })
    })

    newSocket.on('disconnect', () => {
      console.log('Admin disconnected from WebSocket')
      setIsConnected(false)
    })

    // Listen for new messages
    newSocket.on('dispute-message', (data: any) => {
      if (data.disputeId === disputeId && dispute) {
        setDispute((prev: any) => ({
          ...prev,
          messages: [...prev.messages, data.message]
        }))
      }
    })

    // Listen for dispute status updates
    newSocket.on('dispute-status-update', (data: any) => {
      if (data.disputeId === disputeId && dispute) {
        setDispute((prev: any) => ({
          ...prev,
          status: data.status,
          resolvedAt: data.resolvedAt,
          resolution: data.resolution
        }))
      }
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [disputeId, dispute]) */

  useEffect(() => {
    // Scroll to bottom when messages update
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [dispute?.messages])


  const resolveDispute = async () => {
    try {
      setIsResolving(true)
      const data = {
        inFavorOf: resolveInFavorOf,
        resolution: resolution.trim() || undefined
      }
      
      if (type === 'deal') {
        await adminApi.resolveDealDispute(disputeId, data)
      } else {
        await adminApi.resolveWithdrawalDispute(disputeId, data)
      }
      
      toast.success(`Спор разрешен в пользу ${resolveInFavorOf === 'MERCHANT' ? 'мерчанта' : 'трейдера'}`)
      setShowResolveDialog(false)
      fetchDispute() // Refresh data
    } catch (error) {
      toast.error('Не удалось разрешить спор')
      console.error(error)
    } finally {
      setIsResolving(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="default" className="bg-yellow-500">Открыт</Badge>
      case 'IN_PROGRESS':
        return <Badge variant="default" className="bg-blue-500">В процессе</Badge>
      case 'RESOLVED_SUCCESS':
        return <Badge variant="destructive" className="bg-red-500">Решен (мерчант)</Badge>
      case 'RESOLVED_FAIL':
        return <Badge variant="default" className="bg-green-500">Решен (трейдер)</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMM yyyy HH:mm', { locale: ru })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB'
    return Math.round(bytes / 1048576) + ' MB'
  }

  const getSenderInfo = (msg: DisputeMessage) => {
    if (msg.senderType === 'ADMIN') {
      return { name: 'Администратор', color: 'text-purple-600', bg: 'bg-purple-50' }
    } else if (msg.senderType === 'MERCHANT') {
      return { name: dispute?.merchant.name || 'Мерчант', color: 'text-blue-600', bg: 'bg-blue-50' }
    } else if (msg.senderType === 'TRADER') {
      return { name: dispute?.trader.name || 'Трейдер', color: 'text-green-600', bg: 'bg-green-50' }
    }
    return { name: 'Система', color: 'text-gray-600', bg: 'bg-gray-50' }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!dispute) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Спор не найден</p>
      </div>
    )
  }

  const transaction = type === 'deal' ? dispute.deal : dispute.payout

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/admin/disputes')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            Спор по {type === 'deal' ? 'сделке' : 'выплате'} #{transaction.numericId}
          </h1>
          <p className="text-gray-500 mt-1">ID: {disputeId}</p>
        </div>
        {dispute.status === 'OPEN' || dispute.status === 'IN_PROGRESS' ? (
          <Button onClick={() => setShowResolveDialog(true)}>
            Разрешить спор
          </Button>
        ) : (
          <div className="text-right">
            <p className="text-sm text-gray-500">Разрешен</p>
            <p className="text-sm font-medium">{formatDate(dispute.resolvedAt)}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chat */}
          <Card>
            <CardHeader>
              <CardTitle>Переписка</CardTitle>
              <CardDescription>
                {dispute.messages.length} сообщений
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[500px]">
                <DisputeMessagesRealtime
                  disputeId={disputeId}
                  messages={dispute.messages || []}
                  userType="admin"
                  userId="admin"
                  onMessageSent={(message) => {
                    setDispute((prev: any) => ({
                      ...prev,
                      messages: [...prev.messages, message]
                    }));
                  }}
                  socket={null}
                  isConnected={false}
                  api={adminApi}
                />
              </div>
            </CardContent>
          </Card>

          {/* Transaction Details */}
          <Card>
            <CardHeader>
              <CardTitle>Детали {type === 'deal' ? 'сделки' : 'выплаты'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">ID</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Hash className="h-4 w-4 text-gray-400" />
                    <p className="font-mono">{transaction.numericId}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Сумма</p>
                  <div className="flex items-center gap-2 mt-1">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <p className="font-medium">
                      {formatAmount(transaction.amount)} {type === 'withdrawal' ? transaction.currency : '₽'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Статус</p>
                  <div className="mt-1">
                    <Badge>{transaction.status}</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Создана</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <p className="text-sm">{formatDate(transaction.createdAt)}</p>
                  </div>
                </div>
              </div>

              {type === 'deal' && dispute.deal.method && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Метод оплаты</p>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">{dispute.deal.method.name}</p>
                    <p className="text-sm text-gray-500">{dispute.deal.method.type}</p>
                  </div>
                </div>
              )}

              {type === 'deal' && dispute.deal.requisites && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Реквизиты</p>
                  <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{dispute.deal.requisites.recipientName}</p>
                      <p className="font-mono text-sm">{dispute.deal.requisites.cardNumber}</p>
                      <p className="text-sm text-gray-500">{dispute.deal.requisites.bankType}</p>
                    </div>
                  </div>
                </div>
              )}

              {type === 'withdrawal' && dispute.payout.bankDetail && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Реквизиты для выплаты</p>
                  <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{dispute.payout.bankDetail.recipientName}</p>
                      <p className="font-mono text-sm">{dispute.payout.bankDetail.cardNumber}</p>
                      <p className="text-sm text-gray-500">{dispute.payout.bankDetail.bankType}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Статус спора</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-2">Текущий статус</p>
                {getStatusBadge(dispute.status)}
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Причина спора</p>
                <p className="text-sm">{dispute.reason}</p>
              </div>
              {dispute.resolution && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Решение</p>
                  <p className="text-sm">{dispute.resolution}</p>
                </div>
              )}
              {dispute.resolvedAt && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Дата решения</p>
                  <p className="text-sm">{formatDate(dispute.resolvedAt)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Participants */}
          <Card>
            <CardHeader>
              <CardTitle>Участники</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <User className="h-4 w-4" />
                  Трейдер
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">{dispute.trader.name}</p>
                  <p className="text-sm text-gray-500">{dispute.trader.email}</p>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Building2 className="h-4 w-4" />
                  Мерчант
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">{dispute.merchant.name}</p>
                  {dispute.merchant.companyName && (
                    <p className="text-sm text-gray-500">{dispute.merchant.companyName}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Разрешить спор</DialogTitle>
            <DialogDescription>
              Выберите, в чью пользу разрешить спор и укажите причину решения
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-3 block">В пользу кого разрешить спор?</Label>
              <RadioGroup value={resolveInFavorOf} onValueChange={(value: any) => setResolveInFavorOf(value)}>
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="MERCHANT" id="merchant" />
                  <Label htmlFor="merchant" className="flex items-center gap-2 cursor-pointer">
                    <Building2 className="h-4 w-4" />
                    Мерчант ({dispute.merchant.name})
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="TRADER" id="trader" />
                  <Label htmlFor="trader" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    Трейдер ({dispute.trader.name})
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label htmlFor="resolution" className="mb-2 block">
                Причина решения (необязательно)
              </Label>
              <Textarea
                id="resolution"
                placeholder="Опишите причину вашего решения..."
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
              Отмена
            </Button>
            <Button onClick={resolveDispute} disabled={isResolving}>
              {isResolving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Разрешение...
                </>
              ) : (
                'Разрешить спор'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}