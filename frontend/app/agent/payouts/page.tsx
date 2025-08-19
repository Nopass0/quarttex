'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Download, Calendar, Wallet } from 'lucide-react'
import agentApi from '@/services/agent-api'
import { formatAmount } from '@/lib/utils'
import { toast } from 'sonner'

type PayoutStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

type Payout = {
  id: string
  amount: number
  status: PayoutStatus
  requestedAt: string
  processedAt: string | null
  trcWallet: string
  txHash: string | null
  adminNote: string | null
}

type PayoutStats = {
  totalPaid: number
  pendingAmount: number
  thisMonthPaid: number
  totalPayouts: number
}

const statusColors: Record<PayoutStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
}

const statusLabels: Record<PayoutStatus, string> = {
  PENDING: 'Ожидает',
  PROCESSING: 'В обработке',
  COMPLETED: 'Завершена',
  FAILED: 'Ошибка',
}

export default function AgentPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [stats, setStats] = useState<PayoutStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchPayouts()
  }, [])

  const fetchPayouts = async () => {
    try {
      setIsLoading(true)
      const response = await agentApi.get('/agent/payouts')
      setPayouts(response.data.payouts || [])
      setStats(response.data.stats || null)
    } catch (error) {
      toast.error('Не удалось загрузить данные о выплатах')
    } finally {
      setIsLoading(false)
    }
  }

  const requestPayout = async () => {
    try {
      await agentApi.post('/agent/payouts/request')
      toast.success('Запрос на выплату отправлен')
      fetchPayouts()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка при запросе выплаты')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">История выплат</h1>
          <p className="text-gray-600 mt-2">
            Управление выплатами и их статус
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchPayouts}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            onClick={requestPayout}
            className="bg-[#006039] hover:bg-[#006039]/90"
          >
            <Download className="h-4 w-4 mr-2" />
            Запросить выплату
          </Button>
        </div>
      </div>

      {stats && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Всего выплачено</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-gray-400" />
                <span className="text-2xl font-bold text-[#006039]">
                  ${formatAmount(stats.totalPaid)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>В ожидании</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-gray-400" />
                <span className="text-2xl font-bold text-yellow-600">
                  ${formatAmount(stats.pendingAmount)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>За этот месяц</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                <span className="text-2xl font-bold">
                  ${formatAmount(stats.thisMonthPaid)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Всего выплат</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-gray-400" />
                <span className="text-2xl font-bold">
                  {stats.totalPayouts}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>История выплат</CardTitle>
          <CardDescription>
            Список всех запрошенных выплат
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payouts.map((payout) => (
              <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">${formatAmount(payout.amount)}</span>
                    <Badge className={statusColors[payout.status]}>
                      {statusLabels[payout.status]}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-500">
                    Запрошена: {new Date(payout.requestedAt).toLocaleString('ru-RU')}
                  </div>
                  {payout.processedAt && (
                    <div className="text-sm text-gray-500">
                      Обработана: {new Date(payout.processedAt).toLocaleString('ru-RU')}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 font-mono">
                    Кошелек: {payout.trcWallet}
                  </div>
                  {payout.txHash && (
                    <div className="text-xs text-gray-400 font-mono">
                      TX: {payout.txHash}
                    </div>
                  )}
                  {payout.adminNote && (
                    <div className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                      Примечание: {payout.adminNote}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">
                    ID: {payout.id.slice(-8)}
                  </div>
                  {payout.txHash && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        window.open(`https://tronscan.org/#/transaction/${payout.txHash}`, '_blank')
                      }}
                    >
                      Проверить TX
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {payouts.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                У вас пока нет выплат
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}