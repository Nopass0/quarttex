'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, RefreshCw, DollarSign, Settings, Ban, CheckCircle, History, Filter, Calendar as CalendarIcon } from 'lucide-react'
import { useAdminAuth } from '@/stores/auth'
import { formatAmount } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { TraderMerchantsTable } from '@/components/admin/trader-merchants-table'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"

type Agent = {
  id: string
  name: string
  email: string
}

type Team = {
  id: string
  name: string
  agentId: string
}

type Trader = {
  id: string
  numericId: number
  name: string
  email: string
  balanceUsdt: number
  balanceRub: number
  trustBalance: number
  banned: boolean
  turnover: number
  createdAt: string
  frozenUsdt: number
  frozenRub: number
  trafficEnabled: boolean
  deposit: number
  profitFromDeals: number
  profitFromPayouts: number
  profitPercent: number | null
  stakePercent: number | null
  rateConst: number | null
  useConstRate: boolean
  lastTransactionAt: string | null
  agent: Agent | null
  team: Team | null
  maxSimultaneousPayouts: number
  payoutBalance: number
  frozenPayoutBalance: number
}

function TraderProfileContent() {
  const params = useParams()
  const router = useRouter()
  const traderId = params.traderId as string
  const { token: adminToken } = useAdminAuth()
  
  const [trader, setTrader] = useState<Trader | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBalanceDialogOpen, setIsBalanceDialogOpen] = useState(false)
  const [balanceForm, setBalanceForm] = useState({
    amount: '',
    currency: 'BALANCE' as 'USDT' | 'RUB' | 'DEPOSIT' | 'BALANCE' | 'FROZEN_USDT' | 'FROZEN_RUB',
    operation: 'add' as 'add' | 'subtract'
  })
  const [traderSettings, setTraderSettings] = useState<any>(null)
  const [agents, setAgents] = useState<any[]>([])
  const [isSettingsLoading, setIsSettingsLoading] = useState(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([])
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false)
  const [dateFilter, setDateFilter] = useState({
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    startTime: '00:00',
    endTime: '23:59'
  })
  const [filteredProfit, setFilteredProfit] = useState({
    profitFromDeals: 0,
    profitFromPayouts: 0,
    turnover: 0
  })
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false)

  useEffect(() => {
    fetchTrader()
    fetchTraderSettings()
    fetchAgents()
  }, [traderId])

  const fetchTrader = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch traders')
      const traders = await response.json()
      const traderData = traders.find((t: Trader) => t.id === traderId)
      if (!traderData) throw new Error('Trader not found')
      setTrader(traderData)
    } catch (error) {
      toast.error('Не удалось загрузить данные трейдера')
      router.push('/admin/traders')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTraderSettings = async () => {
    try {
      setIsSettingsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/traders/${traderId}/full`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch trader settings')
      const data = await response.json()
      setTraderSettings(data)
    } catch (error) {
      toast.error('Не удалось загрузить настройки трейдера')
    } finally {
      setIsSettingsLoading(false)
    }
  }

  const fetchAgents = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/agents/teams`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch agents')
      const data = await response.json()
      setAgents(data)
    } catch (error) {
      toast.error('Не удалось загрузить список агентов')
    }
  }

  const handleChangeBalance = async () => {
    if (!trader || !balanceForm.amount) return
    
    try {
      setIsLoading(true)
      const amount = parseFloat(balanceForm.amount)
      const finalAmount = balanceForm.operation === 'subtract' ? -amount : amount
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/traders/${traderId}/balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({
          amount: finalAmount,
          currency: balanceForm.currency,
        }),
      })
      
      if (!response.ok) throw new Error('Failed to update balance')
      
      setIsBalanceDialogOpen(false)
      setBalanceForm({ amount: '', currency: 'BALANCE' as 'USDT' | 'RUB' | 'DEPOSIT' | 'BALANCE' | 'FROZEN_USDT' | 'FROZEN_RUB', operation: 'add' })
      await fetchTrader()
      toast.success('Баланс успешно обновлен')
    } catch (error) {
      toast.error('Не удалось обновить баланс')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!traderSettings) return

    try {
      setIsSavingSettings(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/traders/${traderId}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({
          email: traderSettings.email,
          name: traderSettings.name || traderSettings.email,
          minInsuranceDeposit: traderSettings.minInsuranceDeposit || 1000,
          maxInsuranceDeposit: traderSettings.maxInsuranceDeposit || 100000,
          minAmountPerRequisite: traderSettings.minAmountPerRequisite || 100,
          maxAmountPerRequisite: traderSettings.maxAmountPerRequisite || 100000,
          disputeLimit: traderSettings.disputeLimit || 5,
          teamId: traderSettings.teamId || null,
          telegramChatId: traderSettings.telegramChatId || null,
          telegramDisputeChatId: traderSettings.telegramDisputeChatId || null,
          telegramBotToken: traderSettings.telegramBotToken || null,
          maxSimultaneousPayouts: traderSettings.maxSimultaneousPayouts || 10,
          minPayoutAmount: traderSettings.minPayoutAmount || 100,
          maxPayoutAmount: traderSettings.maxPayoutAmount || 1000000,
          payoutRateDelta: traderSettings.payoutRateDelta || 0,
          payoutFeePercent: traderSettings.payoutFeePercent || 0,
          payoutAcceptanceTime: traderSettings.payoutAcceptanceTime || 5,
        }),
      })

      if (!response.ok) throw new Error('Failed to update settings')

      toast.success('Настройки успешно обновлены')
      await fetchTrader()
      await fetchTraderSettings()
    } catch (error) {
      toast.error('Не удалось обновить настройки')
    } finally {
      setIsSavingSettings(false)
    }
  }

  const handleToggleBlock = async () => {
    if (!trader) return

    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/update-user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({
          id: trader.id,
          email: trader.email,
          name: trader.email, // Use email as name
          balanceUsdt: trader.balanceUsdt,
          balanceRub: trader.balanceRub,
          trustBalance: trader.trustBalance,
          profitFromDeals: trader.profitFromDeals || 0,
          profitFromPayouts: trader.profitFromPayouts || 0,
          profitPercent: trader.profitPercent,
          stakePercent: trader.stakePercent,
          rateConst: trader.rateConst,
          useConstRate: trader.useConstRate,
          banned: !trader.banned,
        }),
      })
      
      if (!response.ok) throw new Error('Failed to update trader')
      
      await fetchTrader()
      toast.success(trader.banned ? 'Трейдер разблокирован' : 'Трейдер заблокирован')
    } catch (error) {
      toast.error('Не удалось изменить статус трейдера')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && !trader) {
    return (
      <div className="flex justify-center items-center py-8">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!trader) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/admin/traders')}
        >
          <ArrowLeft className="h-4 w-4 text-[#530FAD]" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-gray-900">Профиль трейдера</h1>
          <p className="text-sm text-gray-500 mt-1">{trader.email} • ID: {trader.numericId}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={trader.banned ? 'destructive' : 'default'}>
            {trader.banned ? 'Заблокирован' : 'Активен'}
          </Badge>
          <Button
            variant={trader.banned ? 'default' : 'destructive'}
            size="sm"
            onClick={handleToggleBlock}
            disabled={isLoading}
          >
            {trader.banned ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Разблокировать
              </>
            ) : (
              <>
                <Ban className="mr-2 h-4 w-4" />
                Заблокировать
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Основная информация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{trader.email}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Дата регистрации</p>
              <p className="font-medium">{new Date(trader.createdAt).toLocaleString('ru-RU')}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Последняя транзакция</p>
              <p className="font-medium">
                {trader.lastTransactionAt 
                  ? new Date(trader.lastTransactionAt).toLocaleString('ru-RU')
                  : 'Нет транзакций'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Трафик</p>
              <Badge variant={trader.trafficEnabled ? 'default' : 'secondary'}>
                {trader.trafficEnabled ? 'Включен' : 'Выключен'}
              </Badge>
            </div>
            <Separator />
            <div className="space-y-1">
              <Label htmlFor="agent" className="text-sm text-gray-500">Агент</Label>
              <Select
                value={trader.agent?.id || 'none'}
                onValueChange={async (value) => {
                  const newAgentId = value === 'none' ? null : value
                  try {
                    // First remove from current agent if exists
                    if (trader.agent?.id) {
                      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/agents/${trader.agent.id}/traders/${traderId}`, {
                        method: 'DELETE',
                        headers: {
                          'x-admin-key': adminToken || '',
                        },
                      })
                    }
                    
                    // Then assign to new agent if selected
                    if (newAgentId) {
                      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/agents/${newAgentId}/traders`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'x-admin-key': adminToken || '',
                        },
                        body: JSON.stringify({
                          traderId: traderId,
                        }),
                      })
                      
                      if (!response.ok) throw new Error('Failed to assign agent')
                    }
                    
                    // Reset team if agent changed
                    if (trader.team) {
                      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/traders/${traderId}/settings`, {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                          'x-admin-key': adminToken || '',
                        },
                        body: JSON.stringify({
                          email: trader.email,
                          name: trader.email,
                          minAmountPerRequisite: traderSettings?.minAmountPerRequisite || 100,
                          maxAmountPerRequisite: traderSettings?.maxAmountPerRequisite || 100000,
                          disputeLimit: traderSettings?.disputeLimit || 5,
                          teamId: null,
                          telegramChatId: traderSettings?.telegramChatId,
                          telegramDisputeChatId: traderSettings?.telegramDisputeChatId,
                          telegramBotToken: traderSettings?.telegramBotToken,
                        }),
                      })
                    }
                    
                    await fetchTrader()
                    await fetchTraderSettings()
                    toast.success('Агент обновлен')
                  } catch (error) {
                    toast.error('Не удалось обновить агента')
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите агента" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без агента</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name} ({agent.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="team" className="text-sm text-gray-500">Команда</Label>
              <Select
                value={trader.team?.id || 'none'}
                onValueChange={async (value) => {
                  const teamId = value === 'none' ? null : value
                  // Update trader with new team
                  try {
                    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/traders/${traderId}/settings`, {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        'x-admin-key': adminToken || '',
                      },
                      body: JSON.stringify({
                        email: trader.email,
                        name: trader.email,
                        minAmountPerRequisite: traderSettings?.minAmountPerRequisite || 100,
                        maxAmountPerRequisite: traderSettings?.maxAmountPerRequisite || 100000,
                        disputeLimit: traderSettings?.disputeLimit || 5,
                        teamId: teamId,
                        telegramChatId: traderSettings?.telegramChatId,
                        telegramDisputeChatId: traderSettings?.telegramDisputeChatId,
                        telegramBotToken: traderSettings?.telegramBotToken,
                      }),
                    })
                    if (response.ok) {
                      await fetchTrader()
                      await fetchTraderSettings()
                      toast.success('Команда обновлена')
                    } else {
                      throw new Error('Failed to update team')
                    }
                  } catch (error) {
                    toast.error('Не удалось обновить команду')
                  }
                }}
                disabled={!trader.agent}
              >
                <SelectTrigger className="w-full" disabled={!trader.agent}>
                  <SelectValue placeholder="Выберите команду" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без команды</SelectItem>
                  {trader.agent && agents.find(a => a.id === trader.agent?.id)?.teams?.map((team: any) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Финансовые показатели</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Баланс</p>
              <p className="font-semibold text-lg">${formatAmount(trader.trustBalance)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Депозит</p>
              <p className="font-semibold text-lg text-purple-600">${formatAmount(trader.deposit)}</p>
            </div>
            <Separator />
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Заморожено USDT</p>
              <p className="font-medium">${formatAmount(trader.frozenUsdt)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Заморожено RUB</p>
              <p className="font-medium">₽{formatAmount(trader.frozenRub)}</p>
            </div>
            <Dialog open={isBalanceDialogOpen} onOpenChange={setIsBalanceDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full mt-3" variant="outline" size="sm">
                  <DollarSign className="mr-2 h-4 w-4 text-[#530FAD]" />
                  Изменить баланс
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Изменить баланс</DialogTitle>
                  <DialogDescription>
                    Добавить или вычесть средства с баланса трейдера
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="currency" className="text-right">
                      Валюта
                    </Label>
                    <Select
                      value={balanceForm.currency}
                      onValueChange={(value) => setBalanceForm({ ...balanceForm, currency: value as 'USDT' | 'RUB' | 'DEPOSIT' | 'BALANCE' | 'FROZEN_USDT' | 'FROZEN_RUB' })}
                    >
                      <SelectTrigger className="col-span-3 bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BALANCE">Баланс</SelectItem>
                        <SelectItem value="DEPOSIT">Депозит</SelectItem>
                        <SelectItem value="USDT">USDT</SelectItem>
                        <SelectItem value="RUB">RUB</SelectItem>
                        <SelectItem value="FROZEN_USDT">Замороженные USDT</SelectItem>
                        <SelectItem value="FROZEN_RUB">Замороженные RUB</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="operation" className="text-right">
                      Операция
                    </Label>
                    <Select
                      value={balanceForm.operation}
                      onValueChange={(value) => setBalanceForm({ ...balanceForm, operation: value as 'add' | 'subtract' })}
                    >
                      <SelectTrigger className="col-span-3 bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="add">Добавить</SelectItem>
                        <SelectItem value="subtract">Вычесть</SelectItem>
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
                      step="0.01"
                      value={balanceForm.amount}
                      onChange={(e) => setBalanceForm({ ...balanceForm, amount: e.target.value })}
                      className="col-span-3 bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleChangeBalance}
                    disabled={isLoading || !balanceForm.amount}
                  >
                    Подтвердить
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Прибыль</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <Filter className="mr-2 h-4 w-4 text-[#530FAD]" />
                    Фильтры
                    {(dateFilter.startDate || dateFilter.endDate) && (
                      <span className="ml-auto text-xs text-gray-500">
                        {dateFilter.startDate && format(dateFilter.startDate, 'dd.MM.yyyy', { locale: ru })}
                        {dateFilter.startDate && dateFilter.endDate && ' - '}
                        {dateFilter.endDate && format(dateFilter.endDate, 'dd.MM.yyyy', { locale: ru })}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-4 space-y-4">
                    <h4 className="font-medium">Фильтр по датам</h4>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm">Начальная дата</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-[280px] justify-start text-left font-normal",
                                !dateFilter.startDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 text-[#530FAD]" />
                              {dateFilter.startDate ? format(dateFilter.startDate, 'dd MMMM yyyy', { locale: ru }) : "Выберите дату"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={dateFilter.startDate}
                              onSelect={(date) => setDateFilter({ ...dateFilter, startDate: date })}
                              initialFocus
                              locale={ru}
                            />
                          </PopoverContent>
                        </Popover>
                        <Input
                          type="time"
                          value={dateFilter.startTime}
                          onChange={(e) => setDateFilter({ ...dateFilter, startTime: e.target.value })}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Конечная дата</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-[280px] justify-start text-left font-normal",
                                !dateFilter.endDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 text-[#530FAD]" />
                              {dateFilter.endDate ? format(dateFilter.endDate, 'dd MMMM yyyy', { locale: ru }) : "Выберите дату"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={dateFilter.endDate}
                              onSelect={(date) => setDateFilter({ ...dateFilter, endDate: date })}
                              initialFocus
                              locale={ru}
                            />
                          </PopoverContent>
                        </Popover>
                        <Input
                          type="time"
                          value={dateFilter.endTime}
                          onChange={(e) => setDateFilter({ ...dateFilter, endTime: e.target.value })}
                          className="mt-2"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setDateFilter({
                            startDate: undefined,
                            endDate: undefined,
                            startTime: '00:00',
                            endTime: '23:59'
                          })
                          toast.info('Фильтры сброшены')
                        }}
                      >
                        Сбросить
                      </Button>
                      <Button 
                        className="flex-1"
                        onClick={() => {
                          setIsFilterPopoverOpen(false)
                          toast.info('Фильтры применены')
                        }}
                      >
                        Применить
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={async () => {
                  try {
                    const response = await fetch(`/api/admin/traders/${params.traderId}/withdrawals`, {
                      headers: {
                        'x-admin-key': localStorage.getItem('adminKey') || ''
                      }
                    })
                    
                    if (response.ok) {
                      const data = await response.json()
                      setWithdrawalHistory(data.withdrawals)
                    } else {
                      // Fallback to empty array if API fails
                      setWithdrawalHistory([])
                    }
                  } catch (error) {
                    console.error('Failed to fetch withdrawal history:', error)
                    setWithdrawalHistory([])
                  }
                  setIsWithdrawalDialogOpen(true)
                }}
              >
                <History className="mr-2 h-4 w-4 text-[#530FAD]" />
                История выводов
              </Button>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Оборот</p>
                <p className="font-semibold text-lg">₽{formatAmount(trader.turnover)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Прибыль со сделок</p>
                <p className="font-medium">${formatAmount(dateFilter.startDate || dateFilter.endDate ? filteredProfit.profitFromDeals : trader.profitFromDeals)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Прибыль с выплат</p>
                <p className="font-medium">${formatAmount(dateFilter.startDate || dateFilter.endDate ? filteredProfit.profitFromPayouts : trader.profitFromPayouts)}</p>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Общая прибыль</p>
                <p className="font-semibold text-lg text-purple-600">
                  ${formatAmount(
                    dateFilter.startDate || dateFilter.endDate 
                      ? filteredProfit.profitFromDeals + filteredProfit.profitFromPayouts 
                      : trader.profitFromDeals + trader.profitFromPayouts
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Настройки трейдера</CardTitle>
          <CardDescription>Изменение основных параметров и лимитов трейдера</CardDescription>
        </CardHeader>
        <CardContent>
          {isSettingsLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : traderSettings ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={traderSettings.email}
                    onChange={(e) => setTraderSettings({ ...traderSettings, email: e.target.value })}
                    className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>


              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Лимиты на реквизит</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minAmountPerRequisite">Минимальная сумма (₽)</Label>
                    <Input
                      id="minAmountPerRequisite"
                      type="number"
                      step="0.01"
                      value={traderSettings.minAmountPerRequisite}
                      onChange={(e) => setTraderSettings({ ...traderSettings, minAmountPerRequisite: parseFloat(e.target.value) || 0 })}
                      className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxAmountPerRequisite">Максимальная сумма (₽)</Label>
                    <Input
                      id="maxAmountPerRequisite"
                      type="number"
                      step="0.01"
                      value={traderSettings.maxAmountPerRequisite}
                      onChange={(e) => setTraderSettings({ ...traderSettings, maxAmountPerRequisite: parseFloat(e.target.value) || 0 })}
                      className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Настройки выплат</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minPayoutAmount">Минимальная сумма выплаты (₽)</Label>
                    <Input
                      id="minPayoutAmount"
                      type="number"
                      step="0.01"
                      value={traderSettings.minPayoutAmount || 100}
                      onChange={(e) => setTraderSettings({ ...traderSettings, minPayoutAmount: parseFloat(e.target.value) || 100 })}
                      className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxPayoutAmount">Максимальная сумма выплаты (₽)</Label>
                    <Input
                      id="maxPayoutAmount"
                      type="number"
                      step="0.01"
                      value={traderSettings.maxPayoutAmount || 1000000}
                      onChange={(e) => setTraderSettings({ ...traderSettings, maxPayoutAmount: parseFloat(e.target.value) || 1000000 })}
                      className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxSimultaneousPayouts">Макс. одновременных выплат</Label>
                    <Input
                      id="maxSimultaneousPayouts"
                      type="number"
                      min="1"
                      max="100"
                      value={traderSettings.maxSimultaneousPayouts || 5}
                      onChange={(e) => setTraderSettings({ ...traderSettings, maxSimultaneousPayouts: parseInt(e.target.value) || 5 })}
                      className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500">
                      Количество активных выплат, которые трейдер может обрабатывать одновременно
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payoutAcceptanceTime">Время на принятие выплаты (мин)</Label>
                    <Input
                      id="payoutAcceptanceTime"
                      type="number"
                      min="1"
                      max="60"
                      value={traderSettings.payoutAcceptanceTime || 5}
                      onChange={(e) => setTraderSettings({ ...traderSettings, payoutAcceptanceTime: parseInt(e.target.value) || 5 })}
                      className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Настройки ставок для выплат</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payoutRateDelta">Дельта курса (%)</Label>
                    <Input
                      id="payoutRateDelta"
                      type="number"
                      step="0.01"
                      min="-100"
                      max="100"
                      value={traderSettings.payoutRateDelta || 0}
                      onChange={(e) => setTraderSettings({ ...traderSettings, payoutRateDelta: parseFloat(e.target.value) || 0 })}
                      className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500">
                      Процент изменения курса для выплат. Положительное значение увеличивает курс.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payoutFeePercent">Комиссия за выплаты (%)</Label>
                    <Input
                      id="payoutFeePercent"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={traderSettings.payoutFeePercent || 0}
                      onChange={(e) => setTraderSettings({ ...traderSettings, payoutFeePercent: parseFloat(e.target.value) || 0 })}
                      className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500">
                      Комиссия с трейдера за каждую выплату
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="disputeLimit">Лимит одновременных споров</Label>
                <Input
                  id="disputeLimit"
                  type="number"
                  min="0"
                  value={traderSettings.disputeLimit}
                  onChange={(e) => setTraderSettings({ ...traderSettings, disputeLimit: parseInt(e.target.value) || 0 })}
                  className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500">
                  При достижении этого количества споров, новые сделки не будут назначаться трейдеру
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Telegram настройки</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telegramChatId">Telegram Chat ID</Label>
                    <Input
                      id="telegramChatId"
                      type="text"
                      placeholder="Например: -100123456789"
                      value={traderSettings.telegramChatId || ''}
                      onChange={(e) => setTraderSettings({ ...traderSettings, telegramChatId: e.target.value })}
                      className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500">
                      ID чата для уведомлений о сделках
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telegramDisputeChatId">Telegram Dispute Chat ID</Label>
                    <Input
                      id="telegramDisputeChatId"
                      type="text"
                      placeholder="Например: -100987654321"
                      value={traderSettings.telegramDisputeChatId || ''}
                      onChange={(e) => setTraderSettings({ ...traderSettings, telegramDisputeChatId: e.target.value })}
                      className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500">
                      ID чата для уведомлений о спорах
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telegramBotToken">Telegram Bot Token</Label>
                  <Input
                    id="telegramBotToken"
                    type="text"
                    placeholder="Например: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                    value={traderSettings.telegramBotToken || ''}
                    onChange={(e) => setTraderSettings({ ...traderSettings, telegramBotToken: e.target.value })}
                    className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500">
                    Токен бота для отправки уведомлений
                  </p>
                </div>
              </div>


              <div className="flex justify-end">
                <Button 
                  onClick={handleSaveSettings} 
                  disabled={isSavingSettings}
                  className="bg-[#530FAD] hover:bg-[#530FAD]/90"
                >
                  {isSavingSettings ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    'Сохранить настройки'
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Не удалось загрузить настройки</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <TraderMerchantsTable traderId={traderId} />
      </div>

      {/* Withdrawal History Dialog */}
      <Dialog open={isWithdrawalDialogOpen} onOpenChange={setIsWithdrawalDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>История выводов прибыли</DialogTitle>
            <DialogDescription>
              Все запросы на вывод прибыли трейдера
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Table>
              <TableCaption>История всех запросов на вывод</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Дата создания</TableHead>
                  <TableHead>Дата принятия</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Мерчант</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawalHistory.length > 0 ? withdrawalHistory.map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell className="font-mono text-sm">{withdrawal.numericId}</TableCell>
                    <TableCell>{new Date(withdrawal.createdAt).toLocaleString('ru-RU')}</TableCell>
                    <TableCell>
                      {withdrawal.acceptedAt ? new Date(withdrawal.acceptedAt).toLocaleString('ru-RU') : '-'}
                    </TableCell>
                    <TableCell className="font-medium">₽{formatAmount(withdrawal.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={
                        withdrawal.status === 'completed' ? 'default' :
                        withdrawal.status === 'cancelled' ? 'destructive' :
                        withdrawal.status === 'expired' ? 'secondary' :
                        'secondary'
                      }>
                        {withdrawal.status === 'completed' ? 'Выполнен' :
                         withdrawal.status === 'cancelled' ? 'Отменён' :
                         withdrawal.status === 'expired' ? 'Истёк' :
                         withdrawal.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{withdrawal.merchantName}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500">
                      Нет данных о выводах
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsWithdrawalDialogOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

export default function TraderProfilePage() {
  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <TraderProfileContent />
      </AuthLayout>
    </ProtectedRoute>
  )
}