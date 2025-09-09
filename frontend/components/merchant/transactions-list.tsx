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
import { CreateDisputeDialog } from '@/components/merchant/create-dispute-dialog'

type Transaction = {
  id: string
  numericId: number
  type: 'IN' | 'OUT'
  status: string
  amount: number
  commission: number
  merchantRate: number | null
  effectiveRate: number | null
  isRecalculated: boolean
  rate: number | null
  method: {
    id: string
    code: string
    name: string
    type: string
    currency: string
    commissionPayin: number
    commissionPayout: number
  }
  createdAt: string
  updatedAt: string
  orderId: string
  trader?: {
    id: string
    name: string
  }
}

interface TransactionsListProps {
  filters: {
    type: string
    status: string
    dateFrom: string
    dateTo: string
    amountFrom: string
    amountTo: string
    search: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }
}

const statusColors: Record<string, string> = {
  CREATED: 'secondary',
  IN_PROGRESS: 'default',
  READY: 'success',
  EXPIRED: 'destructive',
  CANCELED: 'destructive',
  DISPUTE: 'warning',
}

const statusLabels: Record<string, string> = {
  CREATED: 'Создана',
  IN_PROGRESS: 'В процессе',
  READY: 'Завершена',
  EXPIRED: 'Истекла',
  CANCELED: 'Отменена',
  DISPUTE: 'Спор',
}

export function TransactionsList({ filters }: TransactionsListProps) {
  const router = useRouter()
  const { sessionToken } = useMerchantAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [merchantInfo, setMerchantInfo] = useState<{ countInRubEquivalent: boolean } | null>(null)
  const [merchantLoading, setMerchantLoading] = useState(true)
  const pageSize = 50
  
  // Dispute dialog state
  const [showDisputeDialog, setShowDisputeDialog] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)

  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      })

      // Add filters
      if (filters.type && filters.type !== 'ALL') params.append('type', filters.type)
      if (filters.status && filters.status !== 'ALL') params.append('status', filters.status)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)
      if (filters.amountFrom) params.append('amountFrom', filters.amountFrom)
      if (filters.amountTo) params.append('amountTo', filters.amountTo)
      if (filters.search) params.append('search', filters.search)
      if (filters.sortBy) params.append('sortBy', filters.sortBy)
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/merchant/dashboard/transactions?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
        }
      )

      if (!response.ok) throw new Error('Failed to fetch transactions')

      const data = await response.json()
      setTransactions(data.data || [])
      setHasMore(data.pagination ? data.pagination.page < data.pagination.pages : false)
    } catch (error) {
      toast.error('Не удалось загрузить транзакции')
    } finally {
      setIsLoading(false)
    }
  }, [sessionToken, page, filters])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  // Fetch merchant info on mount
  useEffect(() => {
    const fetchMerchantInfo = async () => {
      try {
        setMerchantLoading(true)
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/merchant/auth/me`,
          {
            headers: {
              'Authorization': `Bearer ${sessionToken}`,
            },
          }
        )
        if (response.ok) {
          const data = await response.json()
          console.log('Full merchant data:', data)
          console.log('Merchant countInRubEquivalent:', data.merchant?.countInRubEquivalent)
          console.log('Type of countInRubEquivalent:', typeof data.merchant?.countInRubEquivalent)
          
          // Explicitly set the boolean value
          const countInRub = Boolean(data.merchant?.countInRubEquivalent)
          setMerchantInfo({ countInRubEquivalent: countInRub })
          console.log('Set merchantInfo with countInRubEquivalent:', countInRub)
          console.log('Raw value was:', data.merchant?.countInRubEquivalent, 'type:', typeof data.merchant?.countInRubEquivalent)
        }
      } catch (error) {
        console.error('Failed to fetch merchant info:', error)
      } finally {
        setMerchantLoading(false)
      }
    }
    
    if (sessionToken) {
      fetchMerchantInfo()
    }
  }, [sessionToken])

  const handleOpenDispute = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setShowDisputeDialog(true)
  }
  
  const handleDisputeSuccess = () => {
    setShowDisputeDialog(false)
    setSelectedTransaction(null)
    fetchTransactions() // Refresh transactions
    router.push('/merchant/disputes') // Navigate to disputes page
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">
          История транзакций 
          {merchantLoading ? ' (загрузка...)' : 
           merchantInfo?.countInRubEquivalent ? ' (расчеты в рублях)' : ' (расчеты в USDT)'}
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchTransactions}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 text-[#006039] ${isLoading ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Внутренний / Внешний ID</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Метод</TableHead>
              <TableHead className="text-right">Сумма</TableHead>
              <TableHead className="text-right">Комиссия</TableHead>
              {!merchantLoading && !merchantInfo?.countInRubEquivalent && (
                <>
                  <TableHead className="text-right">Курс</TableHead>
                  <TableHead className="text-right">USDT</TableHead>
                </>
              )}
              <TableHead>Дата создания</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={!merchantLoading && merchantInfo?.countInRubEquivalent ? 9 : 11} className="text-center text-gray-500 py-8">
                  Транзакции не найдены
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction) => {
                // Рассчитываем USDT с учетом комиссии метода
                // Эффективный курс уже учитывает ККК Рапиры
                let usdtAmount = null;
                if (transaction.effectiveRate) {
                  // Сначала конвертируем в USDT по эффективному курсу
                  const usdtBeforeCommission = transaction.amount / transaction.effectiveRate;
                  // Затем вычитаем комиссию метода
                  const commissionPercent = transaction.type === 'IN' 
                    ? transaction.method.commissionPayin 
                    : transaction.method.commissionPayout;
                  usdtAmount = transaction.type === 'IN'
                    ? usdtBeforeCommission * (1 - commissionPercent / 100)
                    : usdtBeforeCommission * (1 + commissionPercent / 100);
                }
                
                return (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div>
                      <div className="font-mono text-xs">{transaction.id}</div>
                      <div className="text-sm">{transaction.orderId || '-'}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={transaction.type === 'IN' ? 'default' : 'secondary'}>
                      {transaction.type === 'IN' ? 'Входящая' : 'Исходящая'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[transaction.status] as any}>
                      {statusLabels[transaction.status] || transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{transaction.method.name}</div>
                      <div className="text-xs text-gray-500">{transaction.method.code}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ₽{formatAmount(transaction.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {transaction.type === 'IN' 
                      ? `${transaction.method.commissionPayin}%`
                      : `${transaction.method.commissionPayout}%`
                    }
                  </TableCell>
                  {!merchantLoading && !merchantInfo?.countInRubEquivalent && (
                    <>
                      <TableCell className="text-right">
                        {transaction.effectiveRate ? formatAmount(transaction.effectiveRate) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-[#006039] dark:text-green-400">
                        {usdtAmount ? formatAmount(usdtAmount) : '-'}
                      </TableCell>
                    </>
                  )}
                  <TableCell>{formatDateTime(transaction.createdAt)}</TableCell>
                  <TableCell>
                    {transaction.type === 'IN' && 
                     transaction.trader && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDispute(transaction)}
                        title="Открыть спор по транзакции"
                      >
                        <AlertCircle className="h-4 w-4 mr-1 text-[#006039]" />
                        Спор
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
          <TableCaption>
            <div className="flex items-center justify-between px-2">
              <div className="text-sm text-gray-500">
                Показано {transactions.length} транзакций
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || isLoading}
                >
                  <ChevronLeft className="h-4 w-4 text-[#006039]" />
                  Назад
                </Button>
                <span className="text-sm">Страница {page}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={!hasMore || isLoading}
                >
                  Вперед
                  <ChevronRight className="h-4 w-4 text-[#006039]" />
                </Button>
              </div>
            </div>
          </TableCaption>
        </Table>
      </div>
      
      {/* Dispute Dialog */}
      <CreateDisputeDialog
        open={showDisputeDialog}
        onOpenChange={setShowDisputeDialog}
        transaction={selectedTransaction}
        onSuccess={handleDisputeSuccess}
      />
    </div>
  )
}