'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { RefreshCw, DollarSign } from 'lucide-react'
import { useAdminAuth } from '@/stores/auth'
import { formatAmount } from '@/lib/utils'
import { toast } from 'sonner'
import { DatePickerWithRange } from '@/components/ui/date-picker-range'
import { DateRange } from 'react-day-picker'

type Settlement = {
  id: string
  amount: number
  transactionCount: number
  reason: string
  createdAt: string
}

interface MerchantExtraSettlementsProps {
  merchantId: string
}

export function MerchantExtraSettlements({ merchantId }: MerchantExtraSettlementsProps) {
  const { token: adminToken } = useAdminAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  })
  const [dateRange, setDateRange] = useState<DateRange | null>(null)

  const fetchSettlements = useCallback(async (page: number = 1) => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '50',
      })

      if (dateRange?.from) {
        params.append('startDate', dateRange.from.toISOString())
      }
      if (dateRange?.to) {
        params.append('endDate', dateRange.to.toISOString())
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/merchant/${merchantId}/extra-settlements?${params}`,
        {
          headers: {
            'x-admin-key': adminToken || '',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch settlements')
      }

      const data = await response.json()
      setSettlements(data.settlements)
      setPagination(data.pagination)
    } catch (error) {
      toast.error('Не удалось загрузить расчеты')
    } finally {
      setIsLoading(false)
    }
  }, [merchantId, adminToken, dateRange])

  useEffect(() => {
    fetchSettlements(1)
  }, [dateRange])

  const handlePageChange = (newPage: number) => {
    fetchSettlements(newPage)
  }

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case 'manual':
        return <Badge variant="default" className="dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700">Ручной</Badge>
      case 'auto':
        return <Badge variant="secondary" className="dark:bg-gray-700 dark:text-gray-300">Автоматический</Badge>
      default:
        return <Badge variant="outline" className="dark:border-gray-600 dark:text-gray-300">{reason}</Badge>
    }
  }

  const totalAmount = settlements.reduce((sum, s) => sum + s.amount, 0)

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg dark:text-white">Сводка по дополнительным расчетам</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Всего расчетов</p>
                  <p className="text-2xl font-bold dark:text-white">{pagination.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Общая сумма</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ${formatAmount(totalAmount)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-400" />
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Средняя сумма</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    ${settlements.length > 0 ? formatAmount(totalAmount / settlements.length) : '0'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg dark:text-white">История расчетов</CardTitle>
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchSettlements(pagination.page)}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="dark:text-gray-300">Период</Label>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
              />
            </div>
          </div>

          {isLoading && settlements.length === 0 ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Сумма</TableHead>
                      <TableHead>Кол-во транзакций</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Дата создания</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settlements.map((settlement) => (
                      <TableRow key={settlement.id}>
                        <TableCell className="font-mono text-sm">
                          {settlement.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-green-600 dark:text-green-400">
                            ${formatAmount(settlement.amount)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {settlement.transactionCount} транзакций
                          </Badge>
                        </TableCell>
                        <TableCell>{getReasonBadge(settlement.reason)}</TableCell>
                        <TableCell>
                          {new Date(settlement.createdAt).toLocaleString('ru-RU')}
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
                    Показано {settlements.length} из {pagination.total} записей
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