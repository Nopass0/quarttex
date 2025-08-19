'use client'

import { useState, useEffect } from 'react'
import { useAdminAuth } from '@/stores/auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RefreshCw, Search, Calendar, DollarSign, Calculator, TrendingUp, TrendingDown } from 'lucide-react'
import { formatAmount } from '@/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'

type Transaction = {
  id: string
  numericId: number
  orderId: string
  amount: number
  rate: number | null
  merchantRate: number | null
  effectiveRate: number | null
  isRecalculated: boolean
  usdtAmount: number
  commission: number
  merchantBalance: number
  status: string
  method: {
    id: string
    code: string
    name: string
    commissionPayin: number
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
    recipientName: string
  } | null
  createdAt: string
  updatedAt: string
}

type BalanceFormula = {
  totalSuccessfulDealsUsdt: number
  platformCommissionDeals: number
  totalPayoutsUsdt: number
  platformCommissionPayouts: number
  currentBalance: number
  currentBalanceRub: number
}

interface MerchantTransactionsProps {
  merchantId: string
}

export function MerchantTransactions({ merchantId }: MerchantTransactionsProps) {
  const { token: adminToken } = useAdminAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [balanceFormula, setBalanceFormula] = useState<BalanceFormula | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    fetchTransactions()
  }, [merchantId, page, statusFilter, startDate, endDate])

  const fetchTransactions = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('pageSize', '50')
      if (statusFilter) params.append('status', statusFilter)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/merchant/${merchantId}/transactions?${params}`,
        {
          headers: {
            'x-admin-key': adminToken || '',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch transactions')
      }

      const data = await response.json()
      setTransactions(data.transactions)
      setBalanceFormula(data.balanceFormula)
      setTotalPages(data.pagination.totalPages)
    } catch (error) {
      toast.error('Не удалось загрузить транзакции')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string; className: string }> = {
      CREATED: { variant: 'secondary', label: 'Создана', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
      IN_PROGRESS: { variant: 'default', label: 'В процессе', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
      READY: { variant: 'default', label: 'Успешно', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
      MILK: { variant: 'destructive', label: 'Проблема', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
      CANCELED: { variant: 'secondary', label: 'Отменена', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
      EXPIRED: { variant: 'secondary', label: 'Истекла', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
    }
    const config = statusConfig[status] || { variant: 'outline', label: status, className: '' }
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    )
  }

  const filteredTransactions = transactions.filter(tx => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      tx.orderId.toLowerCase().includes(query) ||
      tx.numericId.toString().includes(query) ||
      tx.trader?.name.toLowerCase().includes(query) ||
      tx.trader?.email.toLowerCase().includes(query)
    )
  })

  return (
    <div className="space-y-6">
      {/* Balance Formula Card */}
      {balanceFormula && (
        <Card className="border-[#006039] dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5 text-[#006039] dark:text-green-400" />
              Формула расчета баланса
            </CardTitle>
            <CardDescription>Расчет USDT баланса на основе merchantRate</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    <TrendingUp className="inline h-3 w-3 mr-1 text-green-600" />
                    Сумма успешных сделок:
                  </span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    +{formatAmount(balanceFormula.totalSuccessfulDealsUsdt)} USDT
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    <TrendingDown className="inline h-3 w-3 mr-1 text-red-600" />
                    Комиссия платформы со сделок:
                  </span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    -{formatAmount(balanceFormula.platformCommissionDeals)} USDT
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    <TrendingDown className="inline h-3 w-3 mr-1 text-red-600" />
                    Сумма выплат:
                  </span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    -{formatAmount(balanceFormula.totalPayoutsUsdt)} USDT
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    <TrendingDown className="inline h-3 w-3 mr-1 text-red-600" />
                    Комиссия платформы с выплат:
                  </span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    -{formatAmount(balanceFormula.platformCommissionPayouts)} USDT
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="p-4 bg-[#006039]/10 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Итоговый баланс:
                    </span>
                    <span className="text-xl font-bold text-[#006039] dark:text-green-400">
                      {formatAmount(balanceFormula.currentBalance)} USDT
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Эквивалент в рублях:
                    </span>
                    <span className="font-medium">
                      {formatAmount(balanceFormula.currentBalanceRub)} ₽
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">История транзакций</CardTitle>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchTransactions}
              disabled={isLoading}
              className="hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Поиск по ID, трейдеру..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Все статусы</SelectItem>
                <SelectItem value="CREATED">Создана</SelectItem>
                <SelectItem value="IN_PROGRESS">В процессе</SelectItem>
                <SelectItem value="READY">Успешно</SelectItem>
                <SelectItem value="MILK">Проблема</SelectItem>
                <SelectItem value="CANCELED">Отменена</SelectItem>
                <SelectItem value="EXPIRED">Истекла</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Дата от"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="Дата до"
            />
          </div>

          {/* Transactions Table */}
          <div className="rounded-md border dark:border-gray-700">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Курс</TableHead>
                  <TableHead>USDT</TableHead>
                  <TableHead>Комиссия</TableHead>
                  <TableHead>Баланс</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Трейдер</TableHead>
                  <TableHead>Метод</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-mono text-xs">{tx.numericId}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{tx.orderId}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(tx.createdAt), 'dd.MM.yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatAmount(tx.amount)} ₽
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="text-sm">
                            {tx.effectiveRate ? tx.effectiveRate.toFixed(2) : '-'}
                          </span>
                          {tx.isRecalculated && (
                            <span className="text-xs text-orange-600 dark:text-orange-400" title="Курс пересчитан по формуле">
                              пересчитано
                            </span>
                          )}
                        </div>
                        {tx.merchantRate && tx.merchantRate !== tx.rate && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            M: {tx.merchantRate.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatAmount(tx.usdtAmount)} USDT
                    </TableCell>
                    <TableCell className="text-red-600 dark:text-red-400">
                      -{formatAmount(tx.commission)} USDT
                    </TableCell>
                    <TableCell className="font-medium text-[#006039] dark:text-green-400">
                      {formatAmount(tx.merchantBalance)} USDT
                    </TableCell>
                    <TableCell>{getStatusBadge(tx.status)}</TableCell>
                    <TableCell>
                      {tx.trader ? (
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{tx.trader.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{tx.trader.email}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {tx.method ? (
                        <div className="space-y-1">
                          <div className="text-sm">{tx.method.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {tx.method.commissionPayin}%
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Назад
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Страница {page} из {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                Вперед
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}