'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  MessageSquare, 
  Hash,
  Search, 
  Filter,
  Calendar,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  RefreshCw,
  Smartphone,
  User,
  Building
} from 'lucide-react'
import { toast } from 'sonner'
import { traderApiInstance } from '@/services/api'
import { formatDateTime, cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { TraderHeader } from '@/components/trader/trader-header'

interface Message {
  id: string
  type: 'notification' | 'sms'
  deviceId: string
  device: {
    id: string
    name: string
    model: string
  }
  packageName?: string
  appName?: string
  phoneNumber?: string
  sender?: string
  content: string
  timestamp: string
  createdAt: string
  isProcessed: boolean
  matchedTransactionId?: string
  transaction?: {
    id: string
    amount: number
    status: string
  }
}

export function TraderMessages() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterDevice, setFilterDevice] = useState('all')
  const [filterProcessed, setFilterProcessed] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [devices, setDevices] = useState<Array<{ id: string, name: string }>>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchMessages()
    fetchDevices()
  }, [page, filterType, filterDevice, filterProcessed])

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(searchQuery && { search: searchQuery }),
        ...(filterType !== 'all' && { type: filterType }),
        ...(filterDevice !== 'all' && { deviceId: filterDevice }),
        ...(filterProcessed !== 'all' && { isProcessed: filterProcessed }),
      })

      const response = await traderApiInstance.get(`/trader/messages?${params}`)
      setMessages(response.data.data || [])
      setTotalPages(response.data.meta?.totalPages || 1)
    } catch (error) {
      toast.error('Не удалось загрузить сообщения')
    } finally {
      setLoading(false)
    }
  }

  const fetchDevices = async () => {
    try {
      const response = await traderApiInstance.get('/trader/devices')
      setDevices(response.data || [])
    } catch (error) {
      console.error('Failed to fetch devices:', error)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchMessages()
  }

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content)
    toast.success('Сообщение скопировано')
  }

  const getMessageIcon = (type: string) => {
    return type === 'notification' ? MessageSquare : Hash
  }

  const getMessageBadge = (message: Message) => {
    if (message.matchedTransactionId) {
      return (
        <Badge className="bg-green-100 text-green-700">
          Сопоставлено
        </Badge>
      )
    }
    if (message.isProcessed) {
      return (
        <Badge variant="secondary">
          Обработано
        </Badge>
      )
    }
    return (
      <Badge variant="outline">
        Новое
      </Badge>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Сообщения</h1>
          <p className="text-gray-600">
            Все уведомления и SMS с ваших устройств
          </p>
        </div>
        <TraderHeader />
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Поиск по содержимому..."
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch}>
                Найти
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Фильтры
                {showFilters ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
              </Button>
              <Button
                variant="outline"
                onClick={fetchMessages}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Тип</label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все типы</SelectItem>
                    <SelectItem value="notification">Уведомления</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Устройство</label>
                <Select value={filterDevice} onValueChange={setFilterDevice}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все устройства</SelectItem>
                    {devices.map((device) => (
                      <SelectItem key={device.id} value={device.id}>
                        {device.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Статус</label>
                <Select value={filterProcessed} onValueChange={setFilterProcessed}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="false">Новые</SelectItem>
                    <SelectItem value="true">Обработанные</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : messages.length > 0 ? (
            <div className="divide-y">
              {messages.map((message) => {
                const Icon = getMessageIcon(message.type)
                return (
                  <div key={message.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-4">
                      {/* Message Icon */}
                      <div className={cn(
                        "p-2 rounded-lg",
                        message.type === 'notification' ? "bg-blue-100" : "bg-green-100"
                      )}>
                        <Icon className={cn(
                          "w-5 h-5",
                          message.type === 'notification' ? "text-blue-600" : "text-green-600"
                        )} />
                      </div>

                      {/* Message Content */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              {message.type === 'notification' ? (
                                <span className="font-medium">{message.appName || message.packageName}</span>
                              ) : (
                                <span className="font-medium">{message.phoneNumber}</span>
                              )}
                              {getMessageBadge(message)}
                            </div>
                            <p className="text-gray-700">{message.content}</p>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopyContent(message.content)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            {message.matchedTransactionId && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => router.push(`/trader/deals`)}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Message Meta */}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Smartphone className="w-3 h-3" />
                            {message.device.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDateTime(message.timestamp)}
                          </span>
                          {message.transaction && (
                            <span className="flex items-center gap-1 text-green-600">
                              <Building className="w-3 h-3" />
                              {message.transaction.amount.toLocaleString('ru-RU')} ₽
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Нет сообщений</p>
              <p className="text-sm text-gray-500 mt-2">
                Сообщения с ваших устройств появятся здесь
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Страница {page} из {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Назад
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              Вперед
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}