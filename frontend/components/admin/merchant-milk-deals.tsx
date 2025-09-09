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
import { RefreshCw, Search, Filter, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { useAdminAuth } from '@/stores/auth'
import { formatAmount } from '@/lib/utils'
import { toast } from 'sonner'
import { DatePickerWithRange } from '@/components/ui/date-picker-range'
import { DateRange } from 'react-day-picker'

type MilkDeal = {
  id: string
  numericId: number
  orderId: string
  amount: number
  currency: string
  status: string
  reason: string
  clientName: string
  userIp: string | null
  method: {
    id: string
    code: string
    name: string
  } | null
  trader: {
    id: string
    name: string
    email: string
  } | null
  requisites: {
    id: string
    cardNumber: string
    bankType: string
  } | null
  createdAt: string
  expiredAt: string
}

type Statistics = {
  failProvider: number
  failAggregator: number
  success: number
  total: number
}

interface MerchantMilkDealsProps {
  merchantId: string
}

export function MerchantMilkDeals({ merchantId }: MerchantMilkDealsProps) {
  const { token: adminToken } = useAdminAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [statistics, setStatistics] = useState<Statistics>({
    failProvider: 0,
    failAggregator: 0,
    success: 0,
    total: 0,
  })
  const [deals, setDeals] = useState<MilkDeal[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  })
  const [activeTab, setActiveTab] = useState<'provider' | 'aggregator' | 'success'>('provider')
  const [filters, setFilters] = useState({
    dateRange: null as DateRange | null,
    amountMin: '',
    amountMax: '',
    currency: '',
    txId: '',
  })
  const [searchTxId, setSearchTxId] = useState('')

  const fetchMilkDeals = useCallback(async (reason: string, page: number = 1) => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        reason,
        page: page.toString(),
        pageSize: '50',
      })

      if (filters.dateRange?.from) {
        params.append('startDate', filters.dateRange.from.toISOString())
      }
      if (filters.dateRange?.to) {
        params.append('endDate', filters.dateRange.to.toISOString())
      }
      if (filters.amountMin) {
        params.append('amountMin', filters.amountMin)
      }
      if (filters.amountMax) {
        params.append('amountMax', filters.amountMax)
      }
      if (filters.currency && filters.currency !== 'ALL') {
        params.append('currency', filters.currency)
      }
      if (searchTxId) {
        params.append('txId', searchTxId)
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/merchant/${merchantId}/milk-deals?${params}`,
        {
          headers: {
            'x-admin-key': adminToken || '',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch milk deals')
      }

      const data = await response.json()
      setStatistics(data.statistics)
      setDeals(data.deals)
      setPagination(data.pagination)
    } catch (error) {
      toast.error('Не удалось загрузить milk deals')
    } finally {
      setIsLoading(false)
    }
  }, [merchantId, adminToken, filters, searchTxId])

  useEffect(() => {
    fetchMilkDeals(activeTab, 1)
  }, [activeTab, filters, searchTxId])

  const handlePageChange = (newPage: number) => {
    fetchMilkDeals(activeTab, newPage)
  }

  const applyFilters = () => {
    fetchMilkDeals(activeTab, 1)
  }

  const clearFilters = () => {
    setFilters({
      dateRange: null,
      amountMin: '',
      amountMax: '',
      currency: '',
      txId: '',
    })
    setSearchTxId('')
  }

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case 'FAIL_PROVIDER':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Провайдер
          </Badge>
        )
      case 'FAIL_AGGREGATOR':
        return (
          <Badge variant="secondary" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Агрегатор
          </Badge>
        )
      case 'SUCCESS':
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Успешно
          </Badge>
        )
      default:
        return <Badge variant="outline">{reason}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium dark:text-white">Всего проблемных</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold dark:text-white">{statistics.total}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-900 dark:bg-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-red-600 dark:text-red-400">Ошибка провайдера</CardTitle>
            <CardDescription className="text-xs dark:text-gray-400">Клиент не оплатил</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{statistics.failProvider}</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 dark:border-orange-900 dark:bg-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-orange-600 dark:text-orange-400">Ошибка агрегатора</CardTitle>
            <CardDescription className="text-xs dark:text-gray-400">Реквизиты выданы, не оплачены</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{statistics.failAggregator}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 dark:border-green-900 dark:bg-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-green-600 dark:text-green-400">Прочие</CardTitle>
            <CardDescription className="text-xs dark:text-gray-400">Другие проблемные платежи</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{statistics.success}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg dark:text-white">Фильтры</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по ID транзакции..."
                value={searchTxId}
                onChange={(e) => setSearchTxId(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={applyFilters} disabled={isLoading}>
              <Filter className="h-4 w-4 mr-2" />
              Применить
            </Button>
            <Button variant="outline" onClick={clearFilters} disabled={isLoading}>
              Очистить
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs with tables */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="provider" className="gap-2">
            <XCircle className="h-4 w-4" />
            Fail Provider ({statistics.failProvider})
          </TabsTrigger>
          <TabsTrigger value="aggregator" className="gap-2">
            <AlertCircle className="h-4 w-4" />
            Fail Aggregator ({statistics.failAggregator})
          </TabsTrigger>
          <TabsTrigger value="success" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Success ({statistics.success})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {activeTab === 'provider' && 'Fail Provider - Клиент не оплатил'}
                  {activeTab === 'aggregator' && 'Fail Aggregator - Реквизиты выданы, но не оплачены'}
                  {activeTab === 'success' && 'Success - Другие milk deals'}
                </CardTitle>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fetchMilkDeals(activeTab, pagination.page)}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading && deals.length === 0 ? (
                <div className="flex justify-center items-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID транзакции</TableHead>
                          <TableHead>Сумма</TableHead>
                          <TableHead>Клиент</TableHead>
                          <TableHead>Трейдер</TableHead>
                          <TableHead>Метод</TableHead>
                          <TableHead>Реквизиты</TableHead>
                          <TableHead>Статус</TableHead>
                          <TableHead>Создано</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deals.map((deal) => (
                          <TableRow key={deal.id}>
                            <TableCell>
                              <div>
                                <div className="font-mono text-sm">{deal.orderId}</div>
                                <div className="text-xs text-gray-500">${deal.numericId}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">
                                {formatAmount(deal.amount)} {deal.currency}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="text-sm">{deal.clientName}</div>
                                {deal.userIp && (
                                  <div className="text-xs text-gray-500">{deal.userIp}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {deal.trader ? (
                                <div>
                                  <div className="text-sm">{deal.trader.name}</div>
                                  <div className="text-xs text-gray-500">{deal.trader.email}</div>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {deal.method ? (
                                <div>
                                  <div className="text-sm">{deal.method.name}</div>
                                  <div className="text-xs text-gray-500">{deal.method.code}</div>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {deal.requisites ? (
                                <div>
                                  <div className="text-sm font-mono">{deal.requisites.cardNumber}</div>
                                  <div className="text-xs text-gray-500">{deal.requisites.bankType}</div>
                                </div>
                              ) : (
                                <span className="text-gray-400">Не выданы</span>
                              )}
                            </TableCell>
                            <TableCell>{getReasonBadge(deal.reason)}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {new Date(deal.createdAt).toLocaleString('ru-RU')}
                              </div>
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
                        Показано {deals.length} из {pagination.total} записей
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
        </TabsContent>
      </Tabs>
    </div>
  )
}