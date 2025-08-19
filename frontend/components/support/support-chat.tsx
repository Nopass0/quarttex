'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  MessageCircle, 
  Send, 
  X, 
  Paperclip, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Plus,
  ChevronLeft,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useTraderAuth } from '@/stores/auth'
import { useAgentAuth } from '@/stores/agent-auth'
import { useMerchantAuth } from '@/stores/merchant-auth'

type SupportTicket = {
  id: string
  subject: string
  status: string
  priority: string
  lastMessage: {
    message: string
    isFromSupport: boolean
    createdAt: string
  } | null
  unreadCount: number
  createdAt: string
  updatedAt: string
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
  messages: Message[]
  createdAt: string
  updatedAt: string
  closedAt: string | null
}

interface SupportChatProps {
  variant: 'trader' | 'agent' | 'merchant'
}

export function SupportChat({ variant }: SupportChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<TicketDetails | null>(null)
  const [isCreatingTicket, setIsCreatingTicket] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [replyMessage, setReplyMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const traderAuth = useTraderAuth()
  const agentAuth = useAgentAuth()
  const merchantAuth = useMerchantAuth()
  
  // Check if user is authenticated
  const isAuthenticated = useCallback(() => {
    if (variant === 'trader') return !!traderAuth.token
    if (variant === 'agent') return !!agentAuth.token
    if (variant === 'merchant') return !!merchantAuth.sessionToken
    return false
  }, [variant, traderAuth.token, agentAuth.token, merchantAuth.sessionToken])
  
  const getAuthHeaders = useCallback(() => {
    if (variant === 'trader' && traderAuth.token) {
      return { 'x-trader-token': traderAuth.token }
    } else if (variant === 'agent' && agentAuth.token) {
      return { 'x-agent-token': agentAuth.token }
    } else if (variant === 'merchant' && merchantAuth.sessionToken) {
      return { 'Authorization': `Bearer ${merchantAuth.sessionToken}` }
    }
    return {}
  }, [variant, traderAuth.token, agentAuth.token, merchantAuth.sessionToken])
  
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])
  
  const fetchTickets = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/support/tickets`, {
        headers: getAuthHeaders(),
      })
      
      if (!response.ok) throw new Error('Failed to fetch tickets')
      const data = await response.json()
      setTickets(data)
    } catch (error) {
      toast.error('Не удалось загрузить тикеты')
    } finally {
      setIsLoading(false)
    }
  }, [getAuthHeaders])
  
  const fetchTicketDetails = useCallback(async (ticketId: string, silent = false) => {
    try {
      if (!silent) setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/support/tickets/${ticketId}`, {
        headers: getAuthHeaders(),
      })
      
      if (!response.ok) throw new Error('Failed to fetch ticket details')
      const data = await response.json()
      setSelectedTicket(data)
    } catch (error) {
      if (!silent) toast.error('Не удалось загрузить детали тикета')
    } finally {
      if (!silent) setIsLoading(false)
    }
  }, [getAuthHeaders])
  
  const createTicket = useCallback(async () => {
    if (!newSubject.trim() || !newMessage.trim()) {
      toast.error('Заполните тему и сообщение')
      return
    }
    
    if (!isAuthenticated()) {
      toast.error('Необходимо войти в систему для создания тикета')
      return
    }
    
    try {
      setIsSending(true)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/support/tickets`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: newSubject,
          message: newMessage,
          priority: 'NORMAL',
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create ticket')
      }
      
      const data = await response.json()
      setNewSubject('')
      setNewMessage('')
      setIsCreatingTicket(false)
      await fetchTickets()
      await fetchTicketDetails(data.id)
      toast.success('Тикет создан')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось создать тикет')
    } finally {
      setIsSending(false)
    }
  }, [newSubject, newMessage, isAuthenticated, getAuthHeaders, fetchTickets, fetchTicketDetails])
  
  const sendMessage = useCallback(async () => {
    if (!replyMessage.trim() || !selectedTicket) return
    
    try {
      setIsSending(true)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/support/tickets/${selectedTicket.id}/messages`,
        {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: replyMessage,
          }),
        }
      )
      
      if (!response.ok) throw new Error('Failed to send message')
      
      setReplyMessage('')
      await fetchTicketDetails(selectedTicket.id)
    } catch (error) {
      toast.error('Не удалось отправить сообщение')
    } finally {
      setIsSending(false)
    }
  }, [replyMessage, selectedTicket, getAuthHeaders, fetchTicketDetails])
  
  // Effects should come after all function definitions
  useEffect(() => {
    if (isOpen && isAuthenticated()) {
      fetchTickets()
    }
  }, [isOpen, isAuthenticated, fetchTickets])

  useEffect(() => {
    if (selectedTicket) {
      const interval = setInterval(() => {
        fetchTicketDetails(selectedTicket.id, true)
      }, 5000) // Refresh every 5 seconds
      
      return () => clearInterval(interval)
    }
  }, [selectedTicket?.id, fetchTicketDetails])
  
  useEffect(() => {
    scrollToBottom()
  }, [selectedTicket?.messages, scrollToBottom])
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <AlertCircle className="h-4 w-4" />
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4" />
      case 'WAITING_REPLY':
        return <MessageCircle className="h-4 w-4" />
      case 'RESOLVED':
      case 'CLOSED':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
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
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'Открыт'
      case 'IN_PROGRESS':
        return 'В работе'
      case 'WAITING_REPLY':
        return 'Ожидает ответа'
      case 'RESOLVED':
        return 'Решен'
      case 'CLOSED':
        return 'Закрыт'
      default:
        return status
    }
  }
  
  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 h-12 w-12 md:h-14 md:w-14 rounded-full bg-[#006039] text-white shadow-lg hover:bg-[#005030] transition-all hover:scale-110 flex items-center justify-center z-30"
      >
        <MessageCircle className="h-6 w-6" />
        {tickets.some(t => t.unreadCount > 0) && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold">
            {tickets.reduce((sum, t) => sum + t.unreadCount, 0)}
          </span>
        )}
      </button>
      
      {/* Chat Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md h-[600px] p-0 flex flex-col">
          {!isAuthenticated() ? (
            // Not authenticated view
            <>
              <DialogHeader className="p-4 border-b">
                <DialogTitle>Техническая поддержка</DialogTitle>
                <DialogDescription>
                  Необходима авторизация
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <p className="text-gray-500 mb-4">
                    Для использования технической поддержки необходимо войти в систему
                  </p>
                  <Button onClick={() => setIsOpen(false)} variant="outline">
                    Закрыть
                  </Button>
                </div>
              </div>
            </>
          ) : !selectedTicket && !isCreatingTicket ? (
            // Tickets List
            <>
              <DialogHeader className="p-4 border-b">
                <DialogTitle>Техническая поддержка</DialogTitle>
                <DialogDescription>
                  Выберите существующий тикет или создайте новый
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-hidden">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-[#006039]" />
                  </div>
                ) : (
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-3">
                      <Button
                        onClick={() => setIsCreatingTicket(true)}
                        className="w-full bg-[#006039] hover:bg-[#005030]"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Создать новый тикет
                      </Button>
                      
                      {tickets.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          У вас пока нет тикетов
                        </div>
                      ) : (
                        tickets.map(ticket => (
                          <Card
                            key={ticket.id}
                            className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => fetchTicketDetails(ticket.id)}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium text-sm line-clamp-1">
                                {ticket.subject}
                              </h4>
                              {ticket.unreadCount > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {ticket.unreadCount}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={cn("text-xs", getStatusColor(ticket.status))}>
                                {getStatusIcon(ticket.status)}
                                <span className="ml-1">{getStatusLabel(ticket.status)}</span>
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {formatDateTime(ticket.updatedAt)}
                              </span>
                            </div>
                            
                            {ticket.lastMessage && (
                              <p className="text-xs text-gray-600 line-clamp-2">
                                {ticket.lastMessage.isFromSupport && (
                                  <span className="font-medium">Поддержка: </span>
                                )}
                                {ticket.lastMessage.message}
                              </p>
                            )}
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </>
          ) : isCreatingTicket ? (
            // Create Ticket Form
            <>
              <DialogHeader className="p-4 border-b">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCreatingTicket(false)}
                  >
                    <ChevronLeft className="h-4 w-4 text-[#006039]" />
                  </Button>
                  <DialogTitle>Новый тикет</DialogTitle>
                </div>
              </DialogHeader>
              
              <div className="flex-1 p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Тема
                  </label>
                  <Input
                    placeholder="Кратко опишите проблему"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Сообщение
                  </label>
                  <Textarea
                    placeholder="Подробно опишите вашу проблему..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={6}
                  />
                </div>
              </div>
              
              <div className="p-4 border-t">
                <Button
                  onClick={createTicket}
                  disabled={isSending || !newSubject.trim() || !newMessage.trim()}
                  className="w-full bg-[#006039] hover:bg-[#005030]"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Отправка...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Создать тикет
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            // Ticket Messages
            <>
              <DialogHeader className="p-4 border-b">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedTicket(null)
                      fetchTickets()
                    }}
                  >
                    <ChevronLeft className="h-4 w-4 text-[#006039]" />
                  </Button>
                  <div className="flex-1">
                    <DialogTitle className="text-sm line-clamp-1">
                      {selectedTicket.subject}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={cn("text-xs", getStatusColor(selectedTicket.status))}>
                        {getStatusIcon(selectedTicket.status)}
                        <span className="ml-1">{getStatusLabel(selectedTicket.status)}</span>
                      </Badge>
                    </div>
                  </div>
                </div>
              </DialogHeader>
              
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {selectedTicket.messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.isFromSupport ? "justify-start" : "justify-end"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg p-3",
                          message.isFromSupport
                            ? "bg-gray-100"
                            : "bg-[#006039] text-white"
                        )}
                      >
                        {message.isFromSupport && (
                          <div className="text-xs font-medium mb-1">
                            {message.authorName || 'Техподдержка'}
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                        <div
                          className={cn(
                            "text-xs mt-1",
                            message.isFromSupport ? "text-gray-500" : "text-white/70"
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
              
              {selectedTicket.status !== 'CLOSED' && (
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Введите сообщение..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={isSending || !replyMessage.trim()}
                      className="bg-[#006039] hover:bg-[#005030]"
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#006039]" />
                      ) : (
                        <Send className="h-4 w-4 text-white" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}