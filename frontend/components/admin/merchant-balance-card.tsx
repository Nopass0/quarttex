'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calculator, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatAmount } from '@/lib/utils'
import { toast } from 'sonner'

// Функция для обрезания числа до N знаков после запятой без округления
function truncateDecimals(value: number, decimals: number): string {
  const factor = Math.pow(10, decimals);
  return (Math.floor(value * factor) / factor).toFixed(decimals);
}

type MerchantBalanceCardProps = {
  merchantId: string
  merchantName: string
  countInRubEquivalent: boolean
  adminToken: string
}

type BalanceStatistics = {
  period: string
  dateFrom: string
  dateTo: string
  balance: {
    total: number
    totalUsdt?: number
    formula: {
      dealsTotal: number
      dealsCommission: number
      payoutsTotal: number
      payoutsCommission: number
      settledAmount: number
      calculation: string
    }
    formulaUsdt?: {
      dealsTotal: number
      dealsCommission: number
      payoutsTotal: number
      payoutsCommission: number
      settledAmount: number
      calculation: string
    }
  }
  merchant: {
    id: string
    name: string
    countInRubEquivalent: boolean
    balanceUsdt: number
  }
}

export function MerchantBalanceCard({ 
  merchantId, 
  merchantName, 
  countInRubEquivalent, 
  adminToken 
}: MerchantBalanceCardProps) {
  const [statistics, setStatistics] = useState<BalanceStatistics | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('all')

  useEffect(() => {
    fetchStatistics(selectedPeriod)
  }, [selectedPeriod, merchantId])

  const fetchStatistics = async (period = 'all') => {
    try {
      setLoading(true)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/merchant/${merchantId}/statistics?period=${period}`,
        {
          headers: {
            'x-admin-key': adminToken || '',
          },
        }
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch statistics')
      }
      
      const data = await response.json()
      setStatistics(data)
    } catch (error) {
      console.error('Failed to fetch statistics:', error)
      toast.error('Не удалось загрузить статистику')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchStatistics(selectedPeriod)
  }

  if (loading && !statistics) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardHeader>
      </Card>
    )
  }

  if (!statistics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-muted-foreground">
            Не удалось загрузить данные
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>
              {countInRubEquivalent ? "Баланс" : "Баланс USDT"}
            </CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">24 часа</SelectItem>
                <SelectItem value="today">Сегодня</SelectItem>
                <SelectItem value="yesterday">Вчера</SelectItem>
                <SelectItem value="week">Неделя</SelectItem>
                <SelectItem value="month">Месяц</SelectItem>
                <SelectItem value="year">Год</SelectItem>
                <SelectItem value="all">Весь период</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        
        <div className="text-right">
          {!countInRubEquivalent && statistics.balance.totalUsdt !== undefined ? (
            <>
              <div className="text-3xl font-bold text-green-600">
                {truncateDecimals(statistics.balance.totalUsdt, 2)} USDT
              </div>
              <div className="text-lg text-gray-600 mt-1">
                {formatAmount(statistics.balance.total)} ₽
              </div>
            </>
          ) : (
            <div className="text-3xl font-bold text-green-600">
              {formatAmount(statistics.balance.total)} ₽
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Формула расчета баланса:
          </p>
          
          {!countInRubEquivalent && statistics.balance.formulaUsdt ? (
            // Отображаем формулу в USDT
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Сумма успешных сделок:</span>
                <span className="font-medium text-green-600">
                  +{truncateDecimals(statistics.balance.formulaUsdt.dealsTotal, 2)} USDT
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Комиссия платформы со сделок:</span>
                <span className="font-medium text-red-600">
                  -{truncateDecimals(statistics.balance.formulaUsdt.dealsCommission, 2)} USDT
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Сумма выплат:</span>
                <span className="font-medium text-red-600">
                  -{truncateDecimals(statistics.balance.formulaUsdt.payoutsTotal, 2)} USDT
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Комиссия платформы с выплат:</span>
                <span className="font-medium text-red-600">
                  -{truncateDecimals(statistics.balance.formulaUsdt.payoutsCommission, 2)} USDT
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Сумма settle:</span>
                <span className="font-medium text-red-600">
                  -{truncateDecimals(statistics.balance.formulaUsdt.settledAmount, 2)} USDT
                </span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-sm font-medium">
                <span>Итоговый баланс:</span>
                <span className="text-green-600">
                  {truncateDecimals(statistics.balance.totalUsdt!, 2)} USDT
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Эквивалент в рублях:</span>
                <span>
                  {formatAmount(statistics.balance.total)} ₽
                </span>
              </div>
            </div>
          ) : (
            // Отображаем формулу в рублях
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Сумма успешных сделок:</span>
                <span className="font-medium text-green-600">
                  +{formatAmount(statistics.balance.formula.dealsTotal)} ₽
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Комиссия платформы со сделок:</span>
                <span className="font-medium text-red-600">
                  -{formatAmount(statistics.balance.formula.dealsCommission)} ₽
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Сумма выплат:</span>
                <span className="font-medium text-red-600">
                  -{formatAmount(statistics.balance.formula.payoutsTotal)} ₽
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Комиссия платформы с выплат:</span>
                <span className="font-medium text-red-600">
                  -{formatAmount(statistics.balance.formula.payoutsCommission)} ₽
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Сумма settle:</span>
                <span className="font-medium text-red-600">
                  -{formatAmount(statistics.balance.formula.settledAmount)} ₽
                </span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-sm font-medium">
                <span>Итоговый баланс:</span>
                <span className="text-green-600">
                  {formatAmount(statistics.balance.total)} ₽
                </span>
              </div>
            </div>
          )}
          
          <div className="text-xs text-muted-foreground text-center">
            Период: {new Date(statistics.dateFrom).toLocaleDateString('ru-RU')} - {new Date(statistics.dateTo).toLocaleDateString('ru-RU')}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
