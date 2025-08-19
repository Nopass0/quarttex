'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatAmount, formatDateTime } from '@/lib/utils'
import { RefreshCw, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import { useMerchantAuth } from '@/stores/merchant-auth'
import { toast } from 'sonner'
import { merchantApiInstance } from '@/services/api'

type Payout = {
  id: string
  numericId: number
  status: string
  amount: number
  amountUsdt?: number
  rate: number
  total: number
  wallet: string
  bank: string
  isCard: boolean
  feePercent?: number
  payoutsCommission?: number
  direction: string
  externalReference?: string
  method?: {
    id: string
    code: string
    name: string
    type: string
    currency: string
  }
  createdAt: string
  acceptedAt?: string
  confirmedAt?: string
  cancelledAt?: string
  trader?: {
    numericId: number
    email: string
  }
}

interface PayoutsListProps {
  filters: {
    status: string
    dateFrom: string
    dateTo: string
    amountFrom: string
    amountTo: string
    search: string
    sortBy: string
    sortOrder: 'asc' | 'desc'
  }
}

export function PayoutsList({ filters }: PayoutsListProps) {
  const router = useRouter()
  const { sessionToken, token } = useMerchantAuth()
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  const fetchPayouts = useCallback(async () => {
    if (!sessionToken) return

    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      })

      // Add filters
      if (filters.status && filters.status !== 'ALL') {
        params.append('status', filters.status)
      }
      if (filters.search) {
        params.append('search', filters.search)
      }
      if (filters.dateFrom) {
        params.append('dateFrom', filters.dateFrom)
      }
      if (filters.dateTo) {
        params.append('dateTo', filters.dateTo)  
      }
      if (filters.amountFrom) {
        params.append('amountFrom', filters.amountFrom)
      }
      if (filters.amountTo) {
        params.append('amountTo', filters.amountTo)
      }

      const response = await merchantApiInstance.get(
        `/merchant/payouts?${params}`
      )

      const data = response.data
      setPayouts(data.data || [])
      setPagination(prev => ({
        ...prev,
        total: data.meta?.total || 0,
        totalPages: data.meta?.totalPages || 0
      }))
    } catch (error) {
      console.error('Error fetching payouts:', error)
      toast.error('Не удалось загрузить выплаты')
      setPayouts([])
    } finally {
      setLoading(false)
    }
  }, [sessionToken, pagination.page, pagination.limit, filters])

  useEffect(() => {
    fetchPayouts()
  }, [fetchPayouts])

  const getStatusBadge = (status: string) => {
    const statusMap = {
      CREATED: { label: 'Создано', variant: 'secondary' as const },
      ACTIVE: { label: 'Активно', variant: 'default' as const },
      CHECKING: { label: 'Проверка', variant: 'outline' as const },
      COMPLETED: { label: 'Завершено', variant: 'default' as const },
      CANCELLED: { label: 'Отменено', variant: 'destructive' as const },
      EXPIRED: { label: 'Истекло', variant: 'secondary' as const },
      DISPUTED: { label: 'Спор', variant: 'destructive' as const },
    }
    
    const config = statusMap[status as keyof typeof statusMap] || { 
      label: status, 
      variant: 'outline' as const 
    }
    
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const nextPage = () => {
    if (pagination.page < pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }))
    }
  }

  const prevPage = () => {
    if (pagination.page > 1) {
      setPagination(prev => ({ ...prev, page: prev.page - 1 }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (payouts.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold">Выплат не найдено</h3>
        <p className="text-muted-foreground">
          Попробуйте изменить параметры поиска или создать новую выплату
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableCaption>
            Показано {payouts.length} из {pagination.total} выплат
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Сумма</TableHead>
              <TableHead>Комиссия</TableHead>
              <TableHead>Метод</TableHead>
              <TableHead>Банк/Кошелек</TableHead>
              <TableHead>Трейдер</TableHead>
              <TableHead>Создано</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payouts.map((payout) => (
              <TableRow key={payout.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell className="font-mono text-xs">
                  #{payout.numericId}
                </TableCell>
                <TableCell>
                  {getStatusBadge(payout.status)}
                </TableCell>
                <TableCell className="font-medium">
                  {formatAmount(payout.amount)} ₽
                  {payout.amountUsdt && (
                    <div className="text-xs text-muted-foreground">
                      ${formatAmount(payout.amountUsdt)} USDT
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-red-600">
                  {typeof payout.payoutsCommission === 'number'
                    ? `-${formatAmount(payout.payoutsCommission)} ₽`
                    : '—'}
                </TableCell>
                <TableCell>
                  {payout.method ? (
                    <div>
                      <div className="font-medium">{payout.method.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {payout.method.code}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="max-w-[150px]">
                    <div className="font-medium truncate">
                      {payout.isCard ? payout.bank : payout.wallet}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {payout.isCard ? 'Карта' : 'Кошелек'}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {payout.trader ? (
                    <div className="text-sm">
                      <div>#{payout.trader.numericId}</div>
                      <div className="text-xs text-muted-foreground">{payout.trader.email}</div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {formatDateTime(payout.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Страница {pagination.page} из {pagination.totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevPage}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Назад
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={nextPage}
              disabled={pagination.page >= pagination.totalPages}
            >
              Вперед
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}