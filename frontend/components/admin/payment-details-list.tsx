'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  RefreshCw, 
  Search, 
  Filter, 
  Download, 
  DollarSign, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  ExternalLink,
  Settings,
} from 'lucide-react'
import { useAdminAuth } from '@/stores/auth'
import { formatAmount, cn } from '@/lib/utils'
import { toast } from 'sonner'
import { DatePickerWithRange } from '@/components/ui/date-picker-range'
import { DateRange } from 'react-day-picker'
import { useDebounce } from '@/hooks/use-debounce'

type PaymentDetail = {
  id: string
  numericId: number
  orderId: string
  amount: number
  currency: string
  rate: number | null
  status: string
  clientName: string
  userIp: string | null
  trader: {
    id: string
    name: string
    email: string
  } | null
  merchant: {
    id: string
    name: string
  } | null
  method: {
    id: string
    code: string
    name: string
    type: string
    currency: string
  } | null
  requisites: {
    id: string
    cardNumber: string
    bankType: string
    cardholderName: string | null
  } | null
  bankReceipt: string | null
  createdAt: string
  updatedAt: string
}

type Statistics = {
  total: { count: number; amount: number }
  success: { count: number; amount: number }
  processing: { count: number; amount: number }
  failed: { count: number; amount: number }
}

const statusOptions = [
  { value: '', label: 'Все статусы' },
  { value: 'READY', label: 'Успешно' },
  { value: 'AWAITING_TRANSFER', label: 'Ожидает перевод' },
  { value: 'TRANSFER_IN_PROCESS', label: 'Перевод в процессе' },
  { value: 'CANCELLED', label: 'Отменен' },
  { value: 'MISTAKE', label: 'Ошибка' },
  { value: 'REFUND', label: 'Возврат' },
]

export function PaymentDetailsList() {
  const { token: adminToken } = useAdminAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [statistics, setStatistics] = useState<Statistics>({
    total: { count: 0, amount: 0 },
    success: { count: 0, amount: 0 },
    processing: { count: 0, amount: 0 },
    failed: { count: 0, amount: 0 },
  })
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetail[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  })
  
  // Filters
  const [filters, setFilters] = useState({
    status: '',
    traderId: '',
    merchantId: '',
    methodId: '',
    dateRange: null as DateRange | null,
    amountMin: '',
    amountMax: '',
    currency: '',
    clientName: '',
    requisitesCard: '',
    txId: '',
  })
  
  const [searchTxId, setSearchTxId] = useState('')
  const [searchClientName, setSearchClientName] = useState('')
  const [searchCard, setSearchCard] = useState('')
  
  const debouncedSearchTxId = useDebounce(searchTxId, 500)
  const debouncedSearchClientName = useDebounce(searchClientName, 500)
  const debouncedSearchCard = useDebounce(searchCard, 500)
  
  const [showFilters, setShowFilters] = useState(false)
  const [selectedColumns, setSelectedColumns] = useState([
    'id', 'date', 'status', 'amount', 'client', 'trader', 'merchant', 'method', 'requisites'
  ])

  const fetchPaymentDetails = useCallback(async (page: number = 1) => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '50',
      })

      // Apply all filters
      if (filters.status) params.append('status', filters.status)
      if (filters.traderId) params.append('traderId', filters.traderId)
      if (filters.merchantId) params.append('merchantId', filters.merchantId)
      if (filters.methodId) params.append('methodId', filters.methodId)
      if (filters.dateRange?.from) params.append('startDate', filters.dateRange.from.toISOString())
      if (filters.dateRange?.to) params.append('endDate', filters.dateRange.to.toISOString())
      if (filters.amountMin) params.append('amountMin', filters.amountMin)
      if (filters.amountMax) params.append('amountMax', filters.amountMax)
      if (filters.currency && filters.currency !== 'ALL') params.append('currency', filters.currency)
      if (debouncedSearchClientName) params.append('clientName', debouncedSearchClientName)
      if (debouncedSearchCard) params.append('requisitesCard', debouncedSearchCard)
      if (debouncedSearchTxId) params.append('txId', debouncedSearchTxId)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/payment-details?${params}`,
        {
          headers: {
            'x-admin-key': adminToken || '',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch payment details')
      }

      const data = await response.json()
      setStatistics(data.statistics)
      setPaymentDetails(data.paymentDetails)
      setPagination(data.pagination)
    } catch (error) {
      toast.error('Не удалось загрузить детали платежей')
    } finally {
      setIsLoading(false)
    }
  }, [adminToken, filters, debouncedSearchTxId, debouncedSearchClientName, debouncedSearchCard])

  useEffect(() => {
    fetchPaymentDetails(1)
  }, [filters, debouncedSearchTxId, debouncedSearchClientName, debouncedSearchCard])

  const handlePageChange = (newPage: number) => {
    fetchPaymentDetails(newPage)
  }

  const applyFilters = () => {
    fetchPaymentDetails(1)
  }

  const clearFilters = () => {
    setFilters({
      status: '',
      traderId: '',
      merchantId: '',
      methodId: '',
      dateRange: null,
      amountMin: '',
      amountMax: '',
      currency: '',
      clientName: '',
      requisitesCard: '',
      txId: '',
    })
    setSearchTxId('')
    setSearchClientName('')
    setSearchCard('')
  }

  const exportToCsv = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.traderId) params.append('traderId', filters.traderId)
      if (filters.merchantId) params.append('merchantId', filters.merchantId)
      if (filters.dateRange?.from) params.append('startDate', filters.dateRange.from.toISOString())
      if (filters.dateRange?.to) params.append('endDate', filters.dateRange.to.toISOString())

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/payment-details/export?${params}`,
        {
          headers: {
            'x-admin-key': adminToken || '',
          },
        }
      )

      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payment-details-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('Экспорт успешно выполнен')
    } catch (error) {
      toast.error('Ошибка при экспорте')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      READY: { label: 'Успешно', variant: 'default' as const, icon: CheckCircle },
      AWAITING_TRANSFER: { label: 'Ожидает', variant: 'secondary' as const, icon: Clock },
      TRANSFER_IN_PROCESS: { label: 'В процессе', variant: 'secondary' as const, icon: Clock },
      CANCELLED: { label: 'Отменен', variant: 'destructive' as const, icon: XCircle },
      MISTAKE: { label: 'Ошибка', variant: 'destructive' as const, icon: AlertCircle },
      REFUND: { label: 'Возврат', variant: 'outline' as const, icon: AlertCircle },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      variant: 'outline' as const,
      icon: AlertCircle,
    }

    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Скопировано')
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Всего платежей</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{statistics.total.count}</p>
            <p className="text-sm text-gray-600">
              {formatAmount(statistics.total.amount)} руб
            </p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-green-600">Успешных</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{statistics.success.count}</p>
            <p className="text-sm text-gray-600">
              {formatAmount(statistics.success.amount)} руб
            </p>
          </CardContent>
        </Card>
        <Card className="border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-orange-600">В процессе</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{statistics.processing.count}</p>
            <p className="text-sm text-gray-600">
              {formatAmount(statistics.processing.amount)} руб
            </p>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-red-600">Неудачных</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{statistics.failed.count}</p>
            <p className="text-sm text-gray-600">
              {formatAmount(statistics.failed.amount)} руб
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Поиск и фильтры</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                {showFilters ? 'Скрыть' : 'Показать'} фильтры
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCsv}
                disabled={isLoading}
              >
                <Download className="h-4 w-4 mr-2" />
                Экспорт CSV
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchPaymentDetails(pagination.page)}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick search */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по ID транзакции..."
                value={searchTxId}
                onChange={(e) => setSearchTxId(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени клиента..."
                value={searchClientName}
                onChange={(e) => setSearchClientName(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по карте..."
                value={searchCard}
                onChange={(e) => setSearchCard(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Advanced filters */}
          {showFilters && (
            <div className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Статус</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters({ ...filters, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Период</Label>
                  <DatePickerWithRange
                    date={filters.dateRange}
                    onDateChange={(range) => setFilters({ ...filters, dateRange: range })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Сумма от</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.amountMin}
                    onChange={(e) => setFilters({ ...filters, amountMin: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Сумма до</Label>
                  <Input
                    type="number"
                    placeholder="100000"
                    value={filters.amountMax}
                    onChange={(e) => setFilters({ ...filters, amountMax: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Валюта</Label>
                  <Select
                    value={filters.currency}
                    onValueChange={(value) => setFilters({ ...filters, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Все валюты" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Все валюты</SelectItem>
                      <SelectItem value="RUB">RUB</SelectItem>
                      <SelectItem value="USDT">USDT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={applyFilters} disabled={isLoading}>
                  Применить фильтры
                </Button>
                <Button variant="outline" onClick={clearFilters} disabled={isLoading}>
                  Очистить
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>История платежей</CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Настройка колонок
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-60">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Отображаемые колонки</h4>
                  {[
                    { id: 'id', label: 'ID' },
                    { id: 'date', label: 'Дата' },
                    { id: 'status', label: 'Статус' },
                    { id: 'amount', label: 'Сумма' },
                    { id: 'client', label: 'Клиент' },
                    { id: 'trader', label: 'Трейдер' },
                    { id: 'merchant', label: 'Мерчант' },
                    { id: 'method', label: 'Метод' },
                    { id: 'requisites', label: 'Реквизиты' },
                  ].map((column) => (
                    <div key={column.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={column.id}
                        checked={selectedColumns.includes(column.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedColumns([...selectedColumns, column.id])
                          } else {
                            setSelectedColumns(selectedColumns.filter(c => c !== column.id))
                          }
                        }}
                      />
                      <label
                        htmlFor={column.id}
                        className="text-sm cursor-pointer"
                      >
                        {column.label}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && paymentDetails.length === 0 ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {selectedColumns.includes('id') && <TableHead>ID</TableHead>}
                      {selectedColumns.includes('date') && <TableHead>Дата</TableHead>}
                      {selectedColumns.includes('status') && <TableHead>Статус</TableHead>}
                      {selectedColumns.includes('amount') && <TableHead>Сумма</TableHead>}
                      {selectedColumns.includes('client') && <TableHead>Клиент</TableHead>}
                      {selectedColumns.includes('trader') && <TableHead>Трейдер</TableHead>}
                      {selectedColumns.includes('merchant') && <TableHead>Мерчант</TableHead>}
                      {selectedColumns.includes('method') && <TableHead>Метод</TableHead>}
                      {selectedColumns.includes('requisites') && <TableHead>Реквизиты</TableHead>}
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentDetails.map((payment) => (
                      <TableRow key={payment.id}>
                        {selectedColumns.includes('id') && (
                          <TableCell>
                            <div>
                              <div className="font-mono text-sm">{payment.orderId}</div>
                              <div className="text-xs text-gray-500">${payment.numericId}</div>
                            </div>
                          </TableCell>
                        )}
                        {selectedColumns.includes('date') && (
                          <TableCell>
                            <div className="text-sm">
                              {new Date(payment.createdAt).toLocaleString('ru-RU')}
                            </div>
                          </TableCell>
                        )}
                        {selectedColumns.includes('status') && (
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        )}
                        {selectedColumns.includes('amount') && (
                          <TableCell>
                            <div className="font-medium">
                              {formatAmount(payment.amount)} {payment.currency}
                            </div>
                            {payment.rate && (
                              <div className="text-xs text-gray-500">
                                Курс: {payment.rate}
                              </div>
                            )}
                          </TableCell>
                        )}
                        {selectedColumns.includes('client') && (
                          <TableCell>
                            <div>
                              <div className="text-sm">{payment.clientName}</div>
                              {payment.userIp && (
                                <div className="text-xs text-gray-500">{payment.userIp}</div>
                              )}
                            </div>
                          </TableCell>
                        )}
                        {selectedColumns.includes('trader') && (
                          <TableCell>
                            {payment.trader ? (
                              <div>
                                <div className="text-sm">{payment.trader.name}</div>
                                <div className="text-xs text-gray-500">{payment.trader.email}</div>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                        )}
                        {selectedColumns.includes('merchant') && (
                          <TableCell>
                            {payment.merchant ? (
                              <div className="text-sm">{payment.merchant.name}</div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                        )}
                        {selectedColumns.includes('method') && (
                          <TableCell>
                            {payment.method ? (
                              <div>
                                <div className="text-sm">{payment.method.name}</div>
                                <div className="text-xs text-gray-500">{payment.method.code}</div>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                        )}
                        {selectedColumns.includes('requisites') && (
                          <TableCell>
                            {payment.requisites ? (
                              <div>
                                <div className="text-sm font-mono">
                                  {payment.requisites.cardNumber}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 ml-1"
                                    onClick={() => copyToClipboard(payment.requisites!.cardNumber)}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {payment.requisites.bankType}
                                  {payment.requisites.cardholderName && ` • ${payment.requisites.cardholderName}`}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          {payment.bankReceipt && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(payment.bankReceipt!, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Показано {paymentDetails.length} из {pagination.total} записей
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1 || isLoading}
                    >
                      Назад
                    </Button>
                    <span className="text-sm">
                      Страница {pagination.page} из {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages || isLoading}
                    >
                      Вперед
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}