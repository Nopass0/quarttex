'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Search, 
  Filter, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  User,
  Building2,
  Users,
  Send,
  Loader2,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  X
} from 'lucide-react'
import { useAdminAuth } from '@/stores/auth'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type SupportTicket = {
  id: string
  subject: string
  status: string
  priority: string
  userType: string
  user: { id: string; email: string; name: string } | null
  agent: { id: string; email: string; name: string } | null
  merchant: { id: string; name: string } | null
  lastMessage: any
  messageCount: number
  createdAt: string
  updatedAt: string
  closedAt: string | null
}

type Message = {
  id: string
  message: string
  isFromSupport: boolean
  authorName: string | null
  attachments: string[]
  createdAt: string
  readAt: string | null
}

type TicketDetails = {
  id: string
  subject: string
  status: string
  priority: string
  userType: string
  userDetails: any
  messages: Message[]
  createdAt: string
  updatedAt: string
  closedAt: string | null
}

type SupportStats = {
  openCount: number
  inProgressCount: number
  waitingReplyCount: number
  resolvedCount: number
  todayCount: number
  avgResponseTime: number
  totalActive: number
}

export function SupportTicketsList() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<TicketDetails | null>(null)
  const [stats, setStats] = useState<SupportStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [userTypeFilter, setUserTypeFilter] = useState('all')
  const [replyMessage, setReplyMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { token: adminToken } = useAdminAuth()

  useEffect(() => {
    fetchTickets()
    fetchStats()
    
    const interval = setInterval(() => {
      fetchTickets()
      fetchStats()
    }, 10000) // Refresh every 10 seconds
    
    return () => clearInterval(interval)
  }, [statusFilter, priorityFilter, userTypeFilter, searchQuery])
  
  useEffect(() => {
    if (selectedTicket) {
      const interval = setInterval(() => {
        fetchTicketDetails(selectedTicket.id, true)
      }, 3000) // Refresh every 3 seconds
      
      return () => clearInterval(interval)
    }
  }, [selectedTicket?.id])
  
  useEffect(() => {
    scrollToBottom()
  }, [selectedTicket?.messages])
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchTickets = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
      if (priorityFilter && priorityFilter !== 'all') params.append('priority', priorityFilter)
      if (userTypeFilter && userTypeFilter !== 'all') params.append('userType', userTypeFilter)
      if (searchQuery) params.append('search', searchQuery)
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/support?${params}`,
        {
          headers: {
            'x-admin-key': adminToken || '',
          },
        }
      )
      
      if (!response.ok) throw new Error('Failed to fetch tickets')
      const data = await response.json()
      setTickets(data)
    } catch (error) {
      toast.error('Не удалось загрузить тикеты')
    } finally {
      setIsLoading(false)
    }
  }
  
  const fetchStats = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/support/stats`,
        {
          headers: {
            'x-admin-key': adminToken || '',
          },
        }
      )
      
      if (!response.ok) throw new Error('Failed to fetch stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats')
    }
  }
  
  const fetchTicketDetails = async (ticketId: string, silent = false) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/support/${ticketId}`,
        {
          headers: {
            'x-admin-key': adminToken || '',
          },
        }
      )
      
      if (!response.ok) throw new Error('Failed to fetch ticket details')
      const data = await response.json()
      setSelectedTicket(data)
    } catch (error) {
      if (!silent) toast.error('Не удалось загрузить детали тикета')
    }
  }
  
  const sendReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return
    
    try {
      setIsSending(true)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/support/${selectedTicket.id}/messages`,
        {
          method: 'POST',
          headers: {
            'x-admin-key': adminToken || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: replyMessage,
            authorName: 'Техподдержка',
          }),
        }
      )
      
      if (!response.ok) throw new Error('Failed to send message')
      
      setReplyMessage('')
      await fetchTicketDetails(selectedTicket.id)
      await fetchTickets()
    } catch (error) {
      toast.error('Не удалось отправить сообщение')
    } finally {
      setIsSending(false)
    }
  }
  
  const updateTicketStatus = async (status: string) => {
    if (!selectedTicket) return
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/support/${selectedTicket.id}/status`,
        {
          method: 'PATCH',
          headers: {
            'x-admin-key': adminToken || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        }
      )
      
      if (!response.ok) throw new Error('Failed to update status')
      
      await fetchTicketDetails(selectedTicket.id)
      await fetchTickets()
      toast.success('Статус обновлен')
    } catch (error) {
      toast.error('Не удалось обновить статус')
    }
  }
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <AlertCircle className="h-4 w-4 text-[#006039]" />
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4 text-[#006039]" />
      case 'WAITING_REPLY':
        return <MessageSquare className="h-4 w-4 text-[#006039]" />
      case 'RESOLVED':
      case 'CLOSED':
        return <CheckCircle className="h-4 w-4 text-[#006039]" />
      default:
        return <Clock className="h-4 w-4 text-[#006039]" />
    }
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-yellow-100 text-yellow-700'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-700'
      case 'WAITING_REPLY':
        return 'bg-purple-100 text-purple-700'
      case 'RESOLVED':
        return 'bg-green-100 text-green-700'
      case 'CLOSED':
        return 'bg-gray-100 text-gray-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return 'bg-gray-100 text-gray-700'
      case 'NORMAL':
        return 'bg-blue-100 text-blue-700'
      case 'HIGH':
        return 'bg-orange-100 text-orange-700'
      case 'URGENT':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }
  
  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case 'TRADER':
        return <User className="h-4 w-4 text-[#006039]" />
      case 'AGENT':
        return <Users className="h-4 w-4 text-[#006039]" />
      case 'MERCHANT':
        return <Building2 className="h-4 w-4 text-[#006039]" />
      default:
        return <User className="h-4 w-4 text-[#006039]" />
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#006039]" />
      </div>
    )
  }
  
  return (
    <div className="container mx-auto max-w-7xl p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Техническая поддержка</h1>
        <p className="text-sm text-gray-600 mt-1">
          Управление тикетами и общение с пользователями
        </p>
      </div>
      
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Активные</p>
                <p className="text-2xl font-bold">{stats.totalActive}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-[#006039]" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Сегодня</p>
                <p className="text-2xl font-bold">{stats.todayCount}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-[#006039]" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">В работе</p>
                <p className="text-2xl font-bold">{stats.inProgressCount}</p>
              </div>
              <Clock className="h-8 w-8 text-[#006039]" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ожидают</p>
                <p className="text-2xl font-bold">{stats.waitingReplyCount}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-[#006039]" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ср. время</p>
                <p className="text-2xl font-bold">{stats.avgResponseTime}ч</p>
              </div>
              <CheckCircle className="h-8 w-8 text-[#006039]" />
            </div>
          </Card>
        </div>
      )}
      
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#006039] h-4 w-4" />
              <Input
                placeholder="Поиск по теме или сообщению..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Все статусы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="OPEN">Открытые</SelectItem>
              <SelectItem value="IN_PROGRESS">В работе</SelectItem>
              <SelectItem value="WAITING_REPLY">Ожидают ответа</SelectItem>
              <SelectItem value="RESOLVED">Решенные</SelectItem>
              <SelectItem value="CLOSED">Закрытые</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Приоритет" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все приоритеты</SelectItem>
              <SelectItem value="LOW">Низкий</SelectItem>
              <SelectItem value="NORMAL">Обычный</SelectItem>
              <SelectItem value="HIGH">Высокий</SelectItem>
              <SelectItem value="URGENT">Срочный</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Тип пользователя" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              <SelectItem value="TRADER">Трейдеры</SelectItem>
              <SelectItem value="AGENT">Агенты</SelectItem>
              <SelectItem value="MERCHANT">Мерчанты</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="icon"
            onClick={fetchTickets}
          >
            <RefreshCw className="h-4 w-4 text-[#006039]" />
          </Button>
        </div>
      </Card>
      
      {/* Tickets Table */}
      <Card>
        <Table>
          <TableCaption>
            Всего тикетов: {tickets.length}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Статус</TableHead>
              <TableHead>Тема</TableHead>
              <TableHead>Пользователь</TableHead>
              <TableHead>Приоритет</TableHead>
              <TableHead>Сообщений</TableHead>
              <TableHead>Обновлен</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell>
                  <Badge className={cn("text-xs", getStatusColor(ticket.status))}>
                    {getStatusIcon(ticket.status)}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-xs">
                  <div>
                    <p className="font-medium text-sm line-clamp-1">
                      {ticket.subject}
                    </p>
                    {ticket.lastMessage && (
                      <p className="text-xs text-gray-500 line-clamp-1 mt-1">
                        {ticket.lastMessage.message}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getUserTypeIcon(ticket.userType)}
                    <div>
                      <p className="text-sm">
                        {ticket.user?.name || ticket.agent?.name || ticket.merchant?.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {ticket.user?.email || ticket.agent?.email || ticket.userType}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={cn("text-xs", getPriorityColor(ticket.priority))}>
                    {ticket.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-[#006039]" />
                    <span className="text-sm">{ticket.messageCount}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{formatDateTime(ticket.updatedAt)}</div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      fetchTicketDetails(ticket.id)
                      setIsDetailsOpen(true)
                    }}
                  >
                    Открыть
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      
      {/* Ticket Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl h-[80vh] p-0 flex flex-col">
          {selectedTicket && (
            <>
              <DialogHeader className="p-6 border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle>{selectedTicket.subject}</DialogTitle>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge className={cn("text-xs", getStatusColor(selectedTicket.status))}>
                        {getStatusIcon(selectedTicket.status)}
                        <span className="ml-1">{selectedTicket.status}</span>
                      </Badge>
                      <Badge className={cn("text-xs", getPriorityColor(selectedTicket.priority))}>
                        {selectedTicket.priority}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        Создан: {formatDateTime(selectedTicket.createdAt)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsDetailsOpen(false)}
                  >
                    <X className="h-4 w-4 text-[#006039]" />
                  </Button>
                </div>
              </DialogHeader>
              
              <div className="flex flex-1 overflow-hidden">
                {/* Messages */}
                <div className="flex-1 flex flex-col">
                  <ScrollArea className="flex-1 p-6">
                    <div className="space-y-4">
                      {selectedTicket.messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            "flex",
                            message.isFromSupport ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[70%] rounded-lg p-4",
                              message.isFromSupport
                                ? "bg-[#006039] text-white"
                                : "bg-gray-100"
                            )}
                          >
                            <div className="text-xs font-medium mb-1">
                              {message.authorName || 'Пользователь'}
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                            <div
                              className={cn(
                                "text-xs mt-2",
                                message.isFromSupport ? "text-white/70" : "text-gray-500"
                              )}
                            >
                              {formatDateTime(message.createdAt)}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                  
                  {/* Reply Input */}
                  <div className="border-t p-4">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Введите ответ..."
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        className="min-h-[80px]"
                      />
                      <Button
                        onClick={sendReply}
                        disabled={isSending || !replyMessage.trim()}
                        className="bg-[#006039] hover:bg-[#005030]"
                      >
                        {isSending ? (
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                        ) : (
                          <Send className="h-4 w-4 text-white" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* User Info Sidebar */}
                <div className="w-80 border-l p-6 overflow-y-auto bg-gray-50">
                  <h3 className="font-medium mb-4">Информация о пользователе</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500">Тип</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getUserTypeIcon(selectedTicket.userType)}
                        <span className="font-medium">{selectedTicket.userType}</span>
                      </div>
                    </div>
                    
                    {selectedTicket.userDetails && (
                      <>
                        <div>
                          <p className="text-sm text-gray-500">Имя</p>
                          <p className="font-medium">
                            {selectedTicket.userDetails.name || 'Не указано'}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="font-medium">
                            {selectedTicket.userDetails.email || 'Не указано'}
                          </p>
                        </div>
                        
                        {selectedTicket.userType === 'TRADER' && (
                          <>
                            <div>
                              <p className="text-sm text-gray-500">Баланс</p>
                              <p className="font-medium">
                                {selectedTicket.userDetails.trustBalance?.toFixed(2) || 0} USDT
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-sm text-gray-500">Активных реквизитов</p>
                              <p className="font-medium">
                                {selectedTicket.userDetails.bankDetails?.length || 0}
                              </p>
                            </div>
                          </>
                        )}
                      </>
                    )}
                    
                    <div className="pt-4 space-y-2">
                      <p className="text-sm text-gray-500 mb-2">Изменить статус</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => updateTicketStatus('IN_PROGRESS')}
                      >
                        В работе
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => updateTicketStatus('RESOLVED')}
                      >
                        Решен
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => updateTicketStatus('CLOSED')}
                      >
                        Закрыть
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}