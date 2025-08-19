'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, TrendingUp, Calendar, Percent } from 'lucide-react'
import agentApi from '@/services/agent-api'
import { formatAmount } from '@/lib/utils'
import { toast } from 'sonner'

type EarningsData = {
  totalEarnings: number
  thisMonthEarnings: number
  lastMonthEarnings: number
  commissionRate: number
  teamVolume: number
  thisMonthVolume: number
  averageDailyEarnings: number
  earningsHistory: Array<{
    date: string
    amount: number
    volume: number
    traderId: string
    traderName: string
  }>
}

export default function AgentEarningsPage() {
  const [earnings, setEarnings] = useState<EarningsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchEarnings()
  }, [])

  const fetchEarnings = async () => {
    try {
      setIsLoading(true)
      const response = await agentApi.get('/agent/earnings')
      setEarnings(response.data)
    } catch (error) {
      toast.error('Не удалось загрузить данные о заработке')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!earnings) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Заработок</h1>
          <p className="text-gray-600 mt-2">
            Анализ вашего заработка и комиссий
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={fetchEarnings}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Общий заработок</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gray-400" />
              <span className="text-2xl font-bold text-[#006039]">
                ${formatAmount(earnings.totalEarnings)}
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
              <span className="text-2xl font-bold text-[#006039]">
                ${formatAmount(earnings.thisMonthEarnings)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Процент комиссии</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-gray-400" />
              <span className="text-2xl font-bold text-[#006039]">
                {earnings.commissionRate}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Средний заработок в день</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gray-400" />
              <span className="text-2xl font-bold">
                ${formatAmount(earnings.averageDailyEarnings)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Объемы команды</CardTitle>
            <CardDescription>
              Торговые объемы вашей команды
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Общий объем</span>
              <span className="font-semibold">₽{formatAmount(earnings.teamVolume)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">За этот месяц</span>
              <span className="font-semibold">₽{formatAmount(earnings.thisMonthVolume)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">За прошлый месяц</span>
              <span className="font-semibold">₽{formatAmount(earnings.teamVolume - earnings.thisMonthVolume)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Сравнение по месяцам</CardTitle>
            <CardDescription>
              Заработок в текущем и прошлом месяце
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Этот месяц</span>
              <span className="font-semibold text-[#006039]">
                ${formatAmount(earnings.thisMonthEarnings)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Прошлый месяц</span>
              <span className="font-semibold">
                ${formatAmount(earnings.lastMonthEarnings)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm text-gray-600">Изменение</span>
              <span className={`font-semibold ${
                earnings.thisMonthEarnings >= earnings.lastMonthEarnings 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {earnings.thisMonthEarnings >= earnings.lastMonthEarnings ? '+' : ''}
                ${formatAmount(earnings.thisMonthEarnings - earnings.lastMonthEarnings)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>История заработка</CardTitle>
          <CardDescription>
            Детальная история ваших комиссий
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(earnings.earningsHistory || []).map((earning, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">{earning.traderName}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(earning.date).toLocaleDateString('ru-RU')}
                  </div>
                  <div className="text-xs text-gray-400">
                    Объем: ₽{formatAmount(earning.volume)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-[#006039]">
                    +${formatAmount(earning.amount)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {earnings.commissionRate}% комиссия
                  </div>
                </div>
              </div>
            ))}
            {(!earnings.earningsHistory || earnings.earningsHistory.length === 0) && (
              <p className="text-center text-gray-500 py-8">
                История заработка пуста
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}