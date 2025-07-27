'use client'

import React, { useState, useEffect } from 'react'
import './transactions-list.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { 
  Search, 
  Edit, 
  RefreshCw, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Ban, 
  Hourglass, 
  Copy, 
  Phone, 
  CreditCard, 
  Calendar, 
  ArrowUpDown,
  ChevronDown,
  X,
  CircleX,
  CalendarIcon,
  Send,
  Scale
} from 'lucide-react'
import { useAdminAuth } from '@/stores/auth'
import { formatAmount, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { CustomCalendarPopover } from '@/components/ui/custom-calendar-popover'

type TransactionType = 'IN' | 'OUT'
type Status = 'CREATED' | 'IN_PROGRESS' | 'READY' | 'CANCELED' | 'EXPIRED' | 'DISPUTE' | 'MILK'
type SortField = 'createdAt' | 'amount' | 'status' | 'orderId'
type SortOrder = 'asc' | 'desc'

type Transaction = {
  id: string
  merchantId: string
  amount: number
  assetOrBank: string
  orderId: string
  methodId: string
  currency?: string
  userId: string
  userIp?: string
  callbackUri: string
  successUri: string
  failUri: string
  type: TransactionType
  expired_at: string
  commission: number
  clientName: string
  status: Status
  rate?: number
  isMock: boolean
  createdAt: string
  updatedAt: string
  isNew?: boolean
  merchant: {
    id: string
    name: string
    token: string
    createdAt: string
  }
  method: {
    id: string
    code: string
    name: string
    type: string
    currency: string
  }
  trader?: {
    id: string
    email: string
    name?: string
    banned: boolean
    createdAt: string
  }
  requisites?: {
    id: string
    bankType: string
    cardNumber: string
    phoneNumber?: string
    recipientName: string
  }
}

type Meta = {
  total: number
  page: number
  limit: number
  totalPages: number
}

const statusIcons: Record<Status, any> = {
  CREATED: Clock,
  IN_PROGRESS: Hourglass,
  READY: CheckCircle,
  CANCELED: XCircle,
  EXPIRED: Ban,
  DISPUTE: Scale,
  MILK: CircleX,
}

const statusColors: Record<Status, string> = {
  CREATED: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  READY: 'bg-purple-100 text-purple-700',
  CANCELED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-orange-100 text-orange-700',
  DISPUTE: 'bg-purple-100 text-purple-700',
  MILK: 'bg-pink-100 text-pink-700',
}

const statusLabels: Record<Status, string> = {
  CREATED: 'Создана',
  IN_PROGRESS: 'В процессе',
  READY: 'Готова',
  CANCELED: 'Отменена',
  EXPIRED: 'Истекла',
  DISPUTE: 'Спор',
  MILK: 'Ошибка',
}

const formatPhoneNumber = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11 && cleaned.startsWith('7')) {
    return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9, 11)}`
  }
  return phone
}

const formatCardNumber = (cardNumber: string) => {
  return cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ')
}

const getBankName = (cardNumber: string) => {
  const firstDigits = cardNumber.substring(0, 6)
  const bankMap: Record<string, string> = {
    '427683': 'Сбербанк',
    '427901': 'Сбербанк',
    '427644': 'Сбербанк',
    '554386': 'Тинькофф',
    '521324': 'Тинькофф',
    '437773': 'Тинькофф',
    '220220': 'Альфа-Банк',
    '415428': 'Альфа-Банк',
    '548673': 'Альфа-Банк',
  }
  
  for (const [prefix, bank] of Object.entries(bankMap)) {
    if (firstDigits.startsWith(prefix)) return bank
  }
  
  return 'Банк'
}

export function TransactionsList() {
  const [activeTab, setActiveTab] = useState<'all' | 'deals' | 'payouts'>('deals')
  const [searchQuery, setSearchQuery] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 20, totalPages: 0 })
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [detailsOpen, setDetailsOpen] = useState<string | null>(null)
  const [merchants, setMerchants] = useState<Array<{id: string, name: string}>>([])
  const [traders, setTraders] = useState<Array<{id: string, email: string, name?: string}>>([])
  const { token: adminToken } = useAdminAuth()
  
  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    merchantId: '',
    traderId: '',
    methodId: '',
    dateFrom: null as Date | null,
    dateTo: null as Date | null,
  })
  
  const [formData, setFormData] = useState({
    status: '' as Status,
    amount: 0,
    clientName: '',
    traderId: '',
  })

  useEffect(() => {
    fetchTransactions()
    fetchMerchants()
    fetchTraders()
    
    // Set up polling for real-time updates
    const interval = setInterval(() => {
      fetchTransactions()
    }, 3000) // Update every 3 seconds
    
    return () => clearInterval(interval)
  }, [activeTab, meta.page, filters, sortField, sortOrder])

  const fetchMerchants = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/merchant/list`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch merchants')
      const data = await response.json()
      
      // Ensure data exists and has the expected structure
      if (!data || typeof data !== 'object') {
        console.warn('Invalid merchants data structure:', data)
        setMerchants([])
        return
      }
      
      const merchantsList = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []
      setMerchants(merchantsList)
    } catch (error) {
      console.error('Failed to fetch merchants:', error)
      setMerchants([])
    }
  }

  const fetchTraders = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users?role=trader`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch traders')
      const data = await response.json()
      
      // Ensure data exists and has the expected structure
      if (!data || typeof data !== 'object') {
        console.warn('Invalid traders data structure:', data)
        setTraders([])
        return
      }
      
      const tradersList = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []
      const filteredTraders = tradersList.filter((user: any) => user && user.trader)
      setTraders(filteredTraders)
    } catch (error) {
      console.error('Failed to fetch traders:', error)
      setTraders([])
    }
  }

  const fetchTransactions = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: meta.page.toString(),
        limit: meta.limit.toString(),
        sortBy: sortField,
        sortOrder: sortOrder,
        ...(activeTab === 'deals' && { type: 'IN' }),
        ...(activeTab === 'payouts' && { type: 'OUT' }),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.merchantId && { merchantId: filters.merchantId }),
        ...(filters.traderId && filters.traderId !== 'unassigned' && { userId: filters.traderId }),
        ...(filters.traderId === 'unassigned' && { userId: 'null' }),
        ...(filters.methodId && { methodId: filters.methodId }),
        ...(filters.dateFrom && { createdFrom: filters.dateFrom.toISOString() }),
        ...(filters.dateTo && { createdTo: filters.dateTo.toISOString() }),
        ...(searchQuery && { search: searchQuery }),
      })

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/transactions/list?${params}`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch transactions')
      const data = await response.json()
      
      // Ensure data exists and has the expected structure
      if (!data || typeof data !== 'object') {
        console.warn('Invalid transactions data structure:', data)
        setTransactions([])
        setMeta({ total: 0, page: 1, limit: 20, totalPages: 0 })
        return
      }
      
      // Mark new transactions
      const transactionsList = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []
      const metaData = data.meta || { total: 0, page: 1, limit: 20, totalPages: 0 }
      
      setTransactions(currentTransactions => {
        // Ensure currentTransactions is an array
        const safeCurrentTransactions = Array.isArray(currentTransactions) ? currentTransactions : []
        const existingIds = new Set(safeCurrentTransactions.map(t => t.id))
        const newTransactions: Transaction[] = []
        
        // Ensure transactionsList is an array
        const safeTransactionsList = Array.isArray(transactionsList) ? transactionsList : []
        
        const updatedData = safeTransactionsList.map((tx: Transaction) => {
          if (!existingIds.has(tx.id) && !isLoading) {
            // New transaction - mark it and add to list
            newTransactions.push(tx)
            return { ...tx, isNew: true }
          }
          return { ...tx, isNew: false }
        })
        
        // Show toast for new transactions
        if (newTransactions.length > 0 && !isLoading) {
          newTransactions.forEach(tx => {
            toast.success(`Новая транзакция ${tx.orderId}`, {
              description: `${tx.amount.toLocaleString('ru-RU')} ₽ от ${tx.clientName}`
            })
          })
          
          // Remove "new" flag after animation
          setTimeout(() => {
            setTransactions(prev => {
              const safePrev = Array.isArray(prev) ? prev : []
              return safePrev.map(tx => ({ ...tx, isNew: false }))
            })
          }, 500)
        }
        
        return updatedData
      })
      
      setMeta(metaData)
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
      toast.error('Не удалось загрузить список транзакций')
      setTransactions([])
      setMeta({ total: 0, page: 1, limit: 20, totalPages: 0 })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text)
    toast.success(message)
  }

  const sendCallback = async (url: string, transaction: Transaction) => {
    if (!url || url === '') {
      toast.error('URL для колбэка не указан')
      return
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: transaction.id,
          orderId: transaction.orderId,
          status: transaction.status,
          amount: transaction.amount,
          currency: transaction.currency || 'RUB',
          timestamp: new Date().toISOString()
        })
      })

      if (response.ok) {
        toast.success('Колбэк успешно отправлен')
      } else {
        toast.error(`Ошибка отправки колбэка: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      toast.error('Не удалось отправить колбэк: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'))
    }
  }

  const handleUpdateTransaction = async () => {
    if (!selectedTransaction) return
    
    try {
      setIsLoading(true)
      // Prepare the update data
      const updateData: any = {
        status: formData.status,
        amount: formData.amount,
        clientName: formData.clientName,
      }
      
      // Only include traderId if it has changed or is not empty
      if (formData.traderId) {
        updateData.traderId = formData.traderId
      } else if (formData.traderId === '' && selectedTransaction.trader) {
        // If traderId is empty and transaction had a trader, explicitly set to null to remove
        updateData.traderId = null
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/transactions/${selectedTransaction.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify(updateData),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || 'Failed to update transaction')
      }
      
      setIsEditDialogOpen(false)
      setSelectedTransaction(null)
      await fetchTransactions()
      toast.success('Транзакция обновлена')
    } catch (error: any) {
      toast.error(error.message || 'Не удалось обновить транзакцию')
    } finally {
      setIsLoading(false)
    }
  }

  const openEditDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setFormData({
      status: transaction.status,
      amount: transaction.amount,
      clientName: transaction.clientName,
      traderId: transaction.trader?.id || '',
    })
    setIsEditDialogOpen(true)
  }

  const openTransactionDetailsDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsDetailsDialogOpen(true)
  }

  const renderRequisites = (requisites: Transaction['requisites']) => {
    if (!requisites) return <span className="text-gray-400">-</span>

    if (requisites.phoneNumber) {
      return (
        <div className="flex items-center gap-2">
          <Phone className="h-3 w-3 text-[#530FAD]" />
          <button
            onClick={() => copyToClipboard(requisites.phoneNumber!, 'Номер телефона скопирован')}
            className="text-sm hover:text-[#530FAD] transition-colors"
          >
            {formatPhoneNumber(requisites.phoneNumber)}
          </button>
        </div>
      )
    }

    if (requisites.cardNumber) {
      const bankName = getBankName(requisites.cardNumber)
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="bg-gray-100 rounded px-2 py-1 flex items-center gap-2">
              <CreditCard className="h-3 w-3 text-[#530FAD]" />
              <div>
                <button
                  onClick={() => copyToClipboard(requisites.cardNumber, 'Номер карты скопирован')}
                  className="text-xs font-mono hover:text-[#530FAD] transition-colors"
                >
                  {formatCardNumber(requisites.cardNumber)}
                </button>
                <div className="text-[10px] text-gray-500">{bankName}</div>
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500">{requisites.recipientName}</div>
        </div>
      )
    }

    return <span className="text-gray-400">-</span>
  }

  const renderTransactionCard = (transaction: Transaction) => {
    const StatusIcon = statusIcons[transaction.status]

    return (
      <div
        key={transaction.id}
        className={cn(
          "bg-white rounded-lg p-4 cursor-pointer hover:shadow-md transition-all duration-300 border border-gray-100",
          transaction.isNew && "flash-once"
        )}
        onClick={() => openTransactionDetailsDialog(transaction)}
      >
        <div className="flex items-start gap-4">
          {/* Status Icon */}
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", statusColors[transaction.status])}>
            <StatusIcon className="h-5 w-5" />
          </div>
          
          {/* Merchant Info */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-base">{transaction.merchant.name}</div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                copyToClipboard(transaction.merchant.id, 'Мерчант ID скопирован')
              }}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              {transaction.merchant.id.slice(0, 8)}...
            </button>
          </div>
          
          {/* Client Info */}
          <div className="min-w-0">
            <div className="font-medium">{transaction.clientName}</div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                copyToClipboard(transaction.userIp || '', 'IP адрес скопирован')
              }}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              {transaction.userIp || 'Нет IP'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                copyToClipboard(transaction.orderId, 'Order ID скопирован')
              }}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors block"
            >
              {transaction.orderId.slice(0, 8)}...
            </button>
          </div>
          
          {/* Amount */}
          <div className="text-right">
            <div className="font-semibold text-lg">{formatAmount(transaction.amount)}</div>
            <div className="text-xs text-gray-500">{transaction.assetOrBank}</div>
            <div className="text-xs text-gray-500">{transaction.method.name}</div>
          </div>
          
          {/* Trader Info */}
          <div className="min-w-[200px]">
            {transaction.trader ? (
              <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-md">
                <div className="text-sm font-medium">{transaction.trader.email}</div>
                <div className="text-xs">ID: {transaction.trader.id}</div>
                {transaction.requisites && (
                  <>
                    <div className="text-xs mt-1">{transaction.requisites.recipientName}</div>
                    {transaction.requisites.cardNumber && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          copyToClipboard(transaction.requisites.cardNumber, 'Номер карты скопирован')
                        }}
                        className="text-xs font-mono hover:text-blue-900 transition-colors"
                      >
                        {formatCardNumber(transaction.requisites.cardNumber)}
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="bg-gray-100 text-gray-500 px-3 py-2 rounded-md">
                <div className="text-sm">Не назначено</div>
              </div>
            )}
          </div>
          
          {/* Dates */}
          <div className="text-right text-xs text-gray-500">
            <div>Создано: {formatDateTime(transaction.createdAt)}</div>
            <div>Истекает: {formatDateTime(transaction.expired_at)}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative w-[500px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#530FAD]" />
            <Input
              placeholder="Поиск по ID, OrderID, клиенту..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2 text-[#530FAD]" />
                Фильтры
                {Object.values(filters).some(v => v && v !== 'all') && (
                  <span className="ml-2 bg-[#530FAD] text-white rounded-full px-2 py-0.5 text-xs">
                    {Object.values(filters).filter(v => v && v !== 'all').length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[600px] p-6" align="start">
              <div className="space-y-4">
                <h3 className="font-medium text-lg mb-4">Фильтры</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Статус</Label>
                    <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Все статусы" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все статусы</SelectItem>
                        <SelectItem value="CREATED">Создана</SelectItem>
                        <SelectItem value="IN_PROGRESS">В процессе</SelectItem>
                        <SelectItem value="READY">Готова</SelectItem>
                        <SelectItem value="CANCELED">Отменена</SelectItem>
                        <SelectItem value="EXPIRED">Истекла</SelectItem>
                        <SelectItem value="DISPUTE">Спор</SelectItem>
                        <SelectItem value="MILK">Ошибка</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Тип</Label>
                    <Select 
                      value={activeTab === 'all' ? 'all' : activeTab === 'deals' ? 'IN' : 'OUT'} 
                      onValueChange={(value) => {
                        if (value === 'all') setActiveTab('all')
                        else if (value === 'IN') setActiveTab('deals')
                        else if (value === 'OUT') setActiveTab('payouts')
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все</SelectItem>
                        <SelectItem value="IN">Сделки (IN)</SelectItem>
                        <SelectItem value="OUT">Выплаты (OUT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Мерчант</Label>
                    <Select value={filters.merchantId} onValueChange={(value) => setFilters({ ...filters, merchantId: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Все мерчанты" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все мерчанты</SelectItem>
                        {merchants.map(merchant => (
                          <SelectItem key={merchant.id} value={merchant.id}>
                            {merchant.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Трейдер</Label>
                    <Select value={filters.traderId} onValueChange={(value) => setFilters({ ...filters, traderId: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Все трейдеры" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все трейдеры</SelectItem>
                        <SelectItem value="unassigned">Не назначен</SelectItem>
                        {traders.map(trader => (
                          <SelectItem key={trader.id} value={trader.id}>
                            {trader.name || trader.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Дата от</Label>
                    <CustomCalendarPopover
                      value={filters.dateFrom || undefined}
                      onChange={(date) => setFilters({ ...filters, dateFrom: date || null })}
                      placeholder="Выберите дату"
                    />
                  </div>
                  
                  <div>
                    <Label>Дата до</Label>
                    <CustomCalendarPopover
                      value={filters.dateTo || undefined}
                      onChange={(date) => setFilters({ ...filters, dateTo: date || null })}
                      placeholder="Выберите дату"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setFilters({
                      status: 'all',
                      merchantId: '',
                      traderId: '',
                      methodId: '',
                      dateFrom: null,
                      dateTo: null,
                    })}
                  >
                    <X className="h-4 w-4 mr-2 text-[#530FAD]" />
                    Сбросить фильтры
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchTransactions}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 text-[#530FAD] ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-2 max-w-xs mb-4">
          <TabsTrigger value="deals">Сделки</TabsTrigger>
          <TabsTrigger value="payouts">Выплаты</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-4">
          {isLoading && transactions.length === 0 ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-[#530FAD]" />
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {transactions.map(renderTransactionCard)}
              </div>
              
              {transactions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Транзакции не найдены
                </div>
              )}

              {meta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Страница {meta.page} из {meta.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMeta({ ...meta, page: meta.page - 1 })}
                      disabled={meta.page === 1 || isLoading}
                    >
                      <ChevronLeft className="h-4 w-4 text-[#530FAD]" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMeta({ ...meta, page: meta.page + 1 })}
                      disabled={meta.page === meta.totalPages || isLoading}
                    >
                      <ChevronRight className="h-4 w-4 text-[#530FAD]" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Детали транзакции</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-500">ID транзакции</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{selectedTransaction.id}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(selectedTransaction.id, 'ID скопирован')}
                    >
                      <Copy className="h-3 w-3 text-[#530FAD]" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-500">Order ID</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{selectedTransaction.orderId}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(selectedTransaction.orderId, 'Order ID скопирован')}
                    >
                      <Copy className="h-3 w-3 text-[#530FAD]" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-500">Статус</Label>
                  <div className="mt-1">
                    <Badge className={statusColors[selectedTransaction.status]}>
                      {statusLabels[selectedTransaction.status]}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Мерчант</Label>
                  <div className="mt-1">{selectedTransaction.merchant.name}</div>
                </div>
                <div>
                  <Label className="text-gray-500">Метод оплаты</Label>
                  <div className="mt-1">{selectedTransaction.method.name}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-500">Клиент</Label>
                  <div className="mt-1">{selectedTransaction.clientName}</div>
                </div>
                <div>
                  <Label className="text-gray-500">IP адрес</Label>
                  <div className="mt-1">
                    <button
                      onClick={() => copyToClipboard(selectedTransaction.userIp || '', 'IP адрес скопирован')}
                      className="hover:text-[#530FAD] transition-colors"
                    >
                      {selectedTransaction.userIp || 'Не указан'}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-500">Тип операции</Label>
                  <div className="mt-1">{selectedTransaction.type === 'IN' ? 'Входящая' : 'Исходящая'}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-500">Сумма</Label>
                  <div className="mt-1 text-lg font-medium">{formatAmount(selectedTransaction.amount)} {selectedTransaction.assetOrBank}</div>
                </div>
                <div>
                  <Label className="text-gray-500">Курс</Label>
                  <div className="mt-1">{selectedTransaction.rate || 'Не установлен'}</div>
                </div>
                <div>
                  <Label className="text-gray-500">Комиссия</Label>
                  <div className="mt-1">{selectedTransaction.commission}%</div>
                </div>
              </div>
              
              <div>
                <Label className="text-gray-500">Трейдер</Label>
                {selectedTransaction.trader ? (
                  <div className="mt-1 bg-blue-50 p-3 rounded-md">
                    <div className="font-medium">{selectedTransaction.trader.name || selectedTransaction.trader.email}</div>
                    <div className="text-sm text-gray-600">{selectedTransaction.trader.email}</div>
                    {selectedTransaction.requisites && (
                      <div className="mt-2">
                        <div className="text-sm">{selectedTransaction.requisites.recipientName}</div>
                        {selectedTransaction.requisites.cardNumber && (
                          <button
                            onClick={() => copyToClipboard(selectedTransaction.requisites!.cardNumber, 'Номер карты скопирован')}
                            className="text-sm font-mono hover:text-blue-700 transition-colors"
                          >
                            {formatCardNumber(selectedTransaction.requisites.cardNumber)}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-1 bg-gray-100 p-3 rounded-md text-gray-500">
                    Не назначен
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-500">Создано</Label>
                  <div className="mt-1">{formatDateTime(selectedTransaction.createdAt)}</div>
                </div>
                <div>
                  <Label className="text-gray-500">Обновлено</Label>
                  <div className="mt-1">{formatDateTime(selectedTransaction.updatedAt)}</div>
                </div>
                <div>
                  <Label className="text-gray-500">Истекает</Label>
                  <div className="mt-1">{formatDateTime(selectedTransaction.expired_at)}</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label className="text-gray-500">Callback URLs</Label>
                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium">Callback URI</div>
                        <div className="text-xs text-gray-600 break-all mt-1">{selectedTransaction.callbackUri || 'Не указан'}</div>
                      </div>
                      {selectedTransaction.callbackUri && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendCallback(selectedTransaction.callbackUri, selectedTransaction)}
                        >
                          <Send className="h-3 w-3 mr-1 text-[#530FAD]" />
                          Отправить
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium">Success URI</div>
                        <div className="text-xs text-gray-600 break-all mt-1">{selectedTransaction.successUri || 'Не указан'}</div>
                      </div>
                      {selectedTransaction.successUri && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendCallback(selectedTransaction.successUri, selectedTransaction)}
                        >
                          <Send className="h-3 w-3 mr-1 text-[#530FAD]" />
                          Отправить
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium">Fail URI</div>
                        <div className="text-xs text-gray-600 break-all mt-1">{selectedTransaction.failUri || 'Не указан'}</div>
                      </div>
                      {selectedTransaction.failUri && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendCallback(selectedTransaction.failUri, selectedTransaction)}
                        >
                          <Send className="h-3 w-3 mr-1 text-[#530FAD]" />
                          Отправить
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDetailsDialogOpen(false)
                openEditDialog(selectedTransaction!)
              }}
            >
              <Edit className="h-4 w-4 mr-2 text-[#530FAD]" />
              Редактировать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактировать транзакцию</DialogTitle>
            <DialogDescription>
              Измените данные транзакции
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ID транзакции</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{selectedTransaction.id}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(selectedTransaction.id, 'ID скопирован')}
                    >
                      <Copy className="h-3 w-3 text-[#530FAD]" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Order ID</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{selectedTransaction.orderId}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(selectedTransaction.orderId, 'Order ID скопирован')}
                    >
                      <Copy className="h-3 w-3 text-[#530FAD]" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Статус
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as Status })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CREATED">Создана</SelectItem>
                    <SelectItem value="IN_PROGRESS">В процессе</SelectItem>
                    <SelectItem value="READY">Готова</SelectItem>
                    <SelectItem value="CANCELED">Отменена</SelectItem>
                    <SelectItem value="EXPIRED">Истекла</SelectItem>
                    <SelectItem value="DISPUTE">Спор</SelectItem>
                    <SelectItem value="MILK">Ошибка</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  Сумма
                </Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="clientName" className="text-right">
                  Имя клиента
                </Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="traderId" className="text-right">
                  ID трейдера
                </Label>
                <Input
                  id="traderId"
                  value={formData.traderId}
                  onChange={(e) => setFormData({ ...formData, traderId: e.target.value })}
                  className="col-span-3"
                  placeholder="Оставьте пустым для отмены назначения"
                />
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Дополнительная информация</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Мерчант: {selectedTransaction.merchant.name}</div>
                  <div>Метод: {selectedTransaction.method.name}</div>
                  <div>Валюта: {selectedTransaction.currency || selectedTransaction.assetOrBank}</div>
                  <div>Курс: {selectedTransaction.rate || 'Не установлен'}</div>
                  <div>Комиссия: {selectedTransaction.commission}%</div>
                  <div>IP: {selectedTransaction.userIp || 'Нет'}</div>
                  <div>Тип: {selectedTransaction.type === 'IN' ? 'Входящая' : 'Исходящая'}</div>
                  <div>Истекает: {formatDateTime(selectedTransaction.expired_at)}</div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={handleUpdateTransaction}
              className="bg-[#530FAD] hover:bg-[#3f0a82]"
              disabled={isLoading}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}