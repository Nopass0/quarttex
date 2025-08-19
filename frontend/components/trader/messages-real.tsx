'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { 
  MessageSquare, 
  Search, 
  Star,
  StarOff,
  Mail,
  MailOpen,
  Trash2,
  Filter,
  Calendar,
  AlertCircle,
  DollarSign,
  Shield,
  CreditCard,
  Wallet,
  Monitor,
  Megaphone,
  X,
  Loader2,
  ChevronDown
} from 'lucide-react'
import { toast } from 'sonner'
import { traderApi } from '@/lib/api/trader'
import { formatRelativeTime, cn } from '@/lib/utils'
import { getFileUrl } from '@/lib/file-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface Message {
  id: string
  subject: string
  content: string
  type: string
  priority: string
  isRead: boolean
  isStarred: boolean
  createdAt: string
  readAt: string | null
  attachments: Array<{
    id: string
    filename: string
    url: string
    size: number
    mimeType: string
  }>
  metadata?: any
  relatedEntityId?: string
  relatedEntity?: string
}

interface MessagesData {
  messages: Message[]
  unreadCount: number
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const messageTypeIcons: Record<string, React.ElementType> = {
  SYSTEM: AlertCircle,
  TRANSACTION: DollarSign,
  PAYOUT: CreditCard,
  ACCOUNT: Shield,
  SECURITY: Shield,
  DISPUTE: AlertCircle,
  DEPOSIT: Wallet,
  WITHDRAWAL: Wallet,
  DEVICE: Monitor,
  ANNOUNCEMENT: Megaphone
}

const messageTypeColors: Record<string, string> = {
  SYSTEM: 'bg-blue-100 text-blue-800 border-blue-200',
  TRANSACTION: 'bg-green-100 text-green-800 border-green-200',
  PAYOUT: 'bg-purple-100 text-purple-800 border-purple-200',
  ACCOUNT: 'bg-gray-100 text-gray-800 border-gray-200',
  SECURITY: 'bg-red-100 text-red-800 border-red-200',
  DISPUTE: 'bg-orange-100 text-orange-800 border-orange-200',
  DEPOSIT: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  WITHDRAWAL: 'bg-amber-100 text-amber-800 border-amber-200',
  DEVICE: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  ANNOUNCEMENT: 'bg-pink-100 text-pink-800 border-pink-200'
}

export function TraderMessagesReal() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread' | 'starred'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [unreadCount, setUnreadCount] = useState(0)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const fetchMessages = useCallback(async (pageNum: number, append = false) => {
    try {
      if (!append) {
        setLoading(true)
        setMessages([])
        setCurrentPage(1)
      } else {
        setLoadingMore(true)
      }

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '20',
        ...(searchQuery && { search: searchQuery }),
        ...(filter !== 'all' && { filter }),
        ...(typeFilter !== 'all' && { type: typeFilter }),
      })

      const response = await traderApi.get(`/trader-messages?${params}`)
      const data: MessagesData = response.data.data
      
      if (append) {
        setMessages(prev => [...prev, ...data.messages])
      } else {
        setMessages(data.messages)
      }
      
      setUnreadCount(data.unreadCount)
      setTotalPages(data.pagination.totalPages)
      setCurrentPage(pageNum)
      setHasMore(pageNum < data.pagination.totalPages)
    } catch (error) {
      toast.error('Не удалось загрузить сообщения')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [searchQuery, filter, typeFilter])

  const loadAllMessages = useCallback(async () => {
    if (currentPage >= totalPages) return
    
    setLoadingMore(true)
    try {
      const promises = []
      for (let page = currentPage + 1; page <= totalPages; page++) {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '20',
          ...(searchQuery && { search: searchQuery }),
          ...(filter !== 'all' && { filter }),
          ...(typeFilter !== 'all' && { type: typeFilter }),
        })
        promises.push(traderApi.get(`/trader-messages?${params}`))
      }
      
      const responses = await Promise.all(promises)
      const allNewMessages = responses.flatMap(r => r.data.data.messages)
      
      setMessages(prev => [...prev, ...allNewMessages])
      setCurrentPage(totalPages)
      setHasMore(false)
    } catch (error) {
      toast.error('Не удалось загрузить все сообщения')
    } finally {
      setLoadingMore(false)
    }
  }, [currentPage, totalPages, searchQuery, filter, typeFilter])

  useEffect(() => {
    setPage(1)
    fetchMessages(1)
  }, [fetchMessages])

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || loadingMore || !hasMore) return

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
    // Проверяем, достигли ли мы низа контейнера
    if (scrollHeight - scrollTop - clientHeight < 100) {
      const nextPage = currentPage + 1
      if (nextPage <= totalPages) {
        fetchMessages(nextPage, true)
      }
    }
  }, [currentPage, totalPages, loadingMore, hasMore, fetchMessages])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const markAsRead = async (messageId: string) => {
    try {
      await traderApi.post(`/trader-messages/${messageId}/read`)
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, isRead: true } : msg
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      toast.error('Не удалось отметить как прочитанное')
    }
  }

  const markAsUnread = async (messageId: string) => {
    try {
      await traderApi.post(`/trader-messages/${messageId}/unread`)
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, isRead: false } : msg
        )
      )
      setUnreadCount(prev => prev + 1)
    } catch (error) {
      toast.error('Не удалось отметить как непрочитанное')
    }
  }

  const toggleStar = async (messageId: string, isStarred: boolean) => {
    try {
      await traderApi.post(`/trader-messages/${messageId}/${isStarred ? 'unstar' : 'star'}`)
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, isStarred: !isStarred } : msg
        )
      )
    } catch (error) {
      toast.error('Не удалось изменить статус')
    }
  }

  const deleteMessage = async (messageId: string) => {
    try {
      await traderApi.delete(`/trader-messages/${messageId}`)
      setMessages(prev => prev.filter(msg => msg.id !== messageId))
      toast.success('Сообщение удалено')
    } catch (error) {
      toast.error('Не удалось удалить сообщение')
    }
  }

  const markAllAsRead = async () => {
    try {
      await traderApi.post('/trader-messages/mark-all-read')
      setMessages(prev =>
        prev.map(msg => ({ ...msg, isRead: true }))
      )
      setUnreadCount(0)
      toast.success('Все сообщения отмечены как прочитанные')
    } catch (error) {
      toast.error('Не удалось отметить все как прочитанные')
    }
  }

  const openMessage = async (message: Message) => {
    setSelectedMessage(message)
    if (!message.isRead) {
      await markAsRead(message.id)
    }
  }

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: Record<string, Message[]> = {}
    
    messages.forEach(message => {
      const date = new Date(message.createdAt)
      const dateKey = format(date, 'yyyy-MM-dd')
      
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(message)
    })
    
    return groups
  }

  const formatDateGroup = (dateKey: string) => {
    const date = new Date(dateKey)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return 'Сегодня'
    } else if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return 'Вчера'
    }
    
    return format(date, 'd MMMM yyyy', { locale: ru })
  }

  const groupedMessages = groupMessagesByDate(messages)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Сообщения</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} новых</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
          >
            Прочитать все
          </Button>
        )}
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Поиск по сообщениям..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setFilter('all')}>
                  Все сообщения
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('unread')}>
                  Непрочитанные
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('starred')}>
                  Избранные
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant={typeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('all')}
            >
              Все типы
            </Button>
            {Object.entries(messageTypeIcons).map(([type, Icon]) => (
              <Button
                key={type}
                variant={typeFilter === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter(type)}
              >
                <Icon className="h-3 w-3 mr-1" />
                {type}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Messages List */}
      <Card className="p-0">
        <div className="relative">
          {/* Progress indicator */}
          {messages.length > 0 && (
            <div className="sticky top-0 z-10 bg-white border-b px-4 py-2 flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Показано {messages.length} сообщений
              </span>
              {hasMore && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const nextPage = currentPage + 1
                      if (nextPage <= totalPages) {
                        fetchMessages(nextPage, true)
                      }
                    }}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        Загрузка...
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3 mr-2" />
                        Загрузить еще
                      </>
                    )}
                  </Button>
                  
                  {totalPages > 2 && currentPage < totalPages && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadAllMessages}
                      disabled={loadingMore}
                    >
                      Загрузить все ({(totalPages - currentPage) * 20} сообщений)
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
          
          <div
            ref={scrollContainerRef}
            className="max-h-[600px] overflow-y-auto"
          >
            {loading && !messages.length ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Mail className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Нет сообщений</p>
              </div>
            ) : (
              <>
                {Object.entries(groupedMessages).map(([dateKey, dateMessages]) => (
                <div key={dateKey}>
                  <div className="sticky top-0 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600 border-b">
                    {formatDateGroup(dateKey)}
                  </div>
                  {dateMessages.map((message) => {
                    const Icon = messageTypeIcons[message.type] || MessageSquare
                    const colorClass = messageTypeColors[message.type] || 'bg-gray-100 text-gray-800'
                    
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex items-start gap-4 p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors",
                          !message.isRead && "bg-blue-50/50"
                        )}
                        onClick={() => openMessage(message)}
                      >
                        <div className={cn("p-2 rounded-lg", colorClass.split(' ')[0])}>
                          <Icon className="h-4 w-4" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className={cn(
                                "font-medium truncate",
                                !message.isRead && "font-semibold"
                              )}>
                                {message.subject}
                              </h3>
                              <p className="text-sm text-gray-600 truncate">
                                {message.content}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleStar(message.id, message.isStarred)
                                }}
                              >
                                {message.isStarred ? (
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                ) : (
                                  <StarOff className="h-4 w-4" />
                                )}
                              </Button>
                              
                              <span className="text-sm text-gray-500">
                                {formatRelativeTime(message.createdAt)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              variant="outline"
                              className={cn("text-xs", colorClass)}
                            >
                              {message.type}
                            </Badge>
                            
                            {message.priority === 'URGENT' && (
                              <Badge variant="destructive" className="text-xs">
                                Срочно
                              </Badge>
                            )}
                            
                            {message.priority === 'HIGH' && (
                              <Badge variant="outline" className="text-xs border-orange-200 bg-orange-50 text-orange-700">
                                Важно
                              </Badge>
                            )}
                            
                            {message.attachments.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {message.attachments.length} файл(ов)
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
              
              {loadingMore && (
                <div className="flex items-center justify-center py-4 border-t">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="text-sm text-gray-500">Загрузка сообщений...</span>
                  </div>
                </div>
              )}
              
              {!hasMore && messages.length > 0 && (
                <div className="text-center py-4 border-t text-sm text-gray-500">
                  Все сообщения загружены ({messages.length} шт.)
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
        </div>
      </Card>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2">
                    {selectedMessage.subject}
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(selectedMessage.createdAt), 'dd.MM.yyyy HH:mm')}
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedMessage(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="prose prose-sm max-w-none mb-4">
                <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
              </div>
              
              {selectedMessage.attachments.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">Вложения</h3>
                  <div className="space-y-2">
                    {selectedMessage.attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={getFileUrl(attachment.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded hover:bg-gray-50"
                      >
                        <span className="text-sm">{attachment.filename}</span>
                        <span className="text-xs text-gray-500">
                          ({(attachment.size / 1024).toFixed(1)} KB)
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2 mt-6">
                <Button
                  variant={selectedMessage.isRead ? "outline" : "default"}
                  size="sm"
                  onClick={() => {
                    if (selectedMessage.isRead) {
                      markAsUnread(selectedMessage.id)
                    } else {
                      markAsRead(selectedMessage.id)
                    }
                    setSelectedMessage({
                      ...selectedMessage,
                      isRead: !selectedMessage.isRead
                    })
                  }}
                >
                  {selectedMessage.isRead ? (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Отметить как непрочитанное
                    </>
                  ) : (
                    <>
                      <MailOpen className="h-4 w-4 mr-2" />
                      Отметить как прочитанное
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    deleteMessage(selectedMessage.id)
                    setSelectedMessage(null)
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}