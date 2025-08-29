'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, RefreshCw, UserPlus, Trash2, Calendar } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { DateRange } from 'react-day-picker'
import { addDays, format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { AgentMerchantsTable } from '@/components/admin/agent-merchants-table'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"

type Trader = {
  id: string
  email: string
  name: string
  balanceUsdt: number
  balanceRub: number
}

type AgentTrader = {
  id: string
  agentId: string
  traderId: string
  createdAt: string
  trader: Trader
  team: {
    id: string
    name: string
  } | null
}

type AgentPayout = {
  id: string
  agentId: string
  amount: number
  isPaid: boolean
  paidAt: string | null
  txHash: string | null
  periodStart: string
  periodEnd: string
  earnings: number
  createdAt: string
}

type Team = {
  id: string
  name: string
  createdAt: string
  tradersCount: number
}

type Agent = {
  id: string
  email: string
  name: string
  commissionRate: number
  trcWallet: string | null
  earnings30Days: number
  createdAt: string
  updatedAt: string
  agentTraders: AgentTrader[]
  agentPayouts: AgentPayout[]
  teams: Team[]
}

type EarningsData = {
  totalEarnings: number
  commissionRate: number
  startDate: string
  endDate: string
  traders: Array<{
    id: string
    email: string
    name: string
    earnings: number
  }>
}

function AgentProfileContent() {
  const params = useParams()
  const router = useRouter()
  const agentId = params.agentId as string
  const { token: adminToken } = useAdminAuth()
  
  const [agent, setAgent] = useState<Agent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAddTraderDialogOpen, setIsAddTraderDialogOpen] = useState(false)
  const [availableTraders, setAvailableTraders] = useState<Trader[]>([])
  const [selectedTrader, setSelectedTrader] = useState<string>('')
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  })
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    commissionRate: 0,
    trcWallet: '',
  })

  useEffect(() => {
    fetchAgent()
    fetchAvailableTraders()
  }, [agentId])

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      fetchEarnings()
    }
  }, [dateRange])

  const fetchAgent = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/agents/${agentId}`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch agent')
      const data = await response.json()
      setAgent(data)
      setEditForm({
        name: data.name,
        email: data.email,
        commissionRate: data.commissionRate,
        trcWallet: data.trcWallet || '',
      })
    } catch (error) {
      toast.error('Не удалось загрузить данные агента')
      router.push('/admin/agents')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAvailableTraders = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/agents/${agentId}/available-traders`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch available traders')
      const data = await response.json()
      setAvailableTraders(data)
    } catch (error) {
      console.error('Failed to fetch available traders:', error)
    }
  }

  const fetchEarnings = async () => {
    if (!dateRange?.from || !dateRange?.to) return

    try {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      })
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/agents/${agentId}/earnings?${params}`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch earnings')
      const data = await response.json()
      setEarningsData(data)
    } catch (error) {
      toast.error('Не удалось загрузить данные о заработке')
    }
  }

  const handleAddTrader = async () => {
    if (!selectedTrader) {
      toast.error('Выберите трейдера')
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/agents/${agentId}/traders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({
          traderId: selectedTrader,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add trader')
      }

      setIsAddTraderDialogOpen(false)
      setSelectedTrader('')
      await fetchAgent()
      await fetchAvailableTraders()
      toast.success('Трейдер добавлен')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось добавить трейдера')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveTrader = async (traderId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого трейдера из команды агента?')) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/agents/${agentId}/traders/${traderId}`, {
        method: 'DELETE',
        headers: {
          'x-admin-key': adminToken || '',
        },
      })

      if (!response.ok) throw new Error('Failed to remove trader')

      await fetchAgent()
      await fetchAvailableTraders()
      toast.success('Трейдер удален из команды')
    } catch (error) {
      toast.error('Не удалось удалить трейдера')
    }
  }

  const handleUpdateAgent = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/agents/${agentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          commissionRate: editForm.commissionRate,
          trcWallet: editForm.trcWallet || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update agent')
      }

      setIsEditDialogOpen(false)
      await fetchAgent()
      toast.success('Данные агента обновлены')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось обновить данные')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && !agent) {
    return (
      <div className="flex justify-center items-center py-8">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!agent) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/admin/agents')}
        >
          <ArrowLeft className="h-4 w-4 text-[#006039]" />
        </Button>
        <h1 className="text-3xl font-bold">Профиль агента</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Основная информация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{agent.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Имя</p>
              <p className="font-medium">{agent.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Комиссия</p>
              <p className="font-medium">{agent.commissionRate}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">TRC-20 кошелек</p>
              <p className="font-medium font-mono text-sm">
                {agent.trcWallet || 'Не указан'}
              </p>
            </div>
            <Separator className="my-2" />
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  Редактировать
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Редактировать агента</DialogTitle>
                  <DialogDescription>
                    Измените данные агента
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-name" className="text-right">
                      Имя
                    </Label>
                    <Input
                      id="edit-name"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-email" className="text-right">
                      Email
                    </Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-commission" className="text-right">
                      Комиссия %
                    </Label>
                    <Input
                      id="edit-commission"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={editForm.commissionRate}
                      onChange={(e) => setEditForm({ ...editForm, commissionRate: parseFloat(e.target.value) || 0 })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-wallet" className="text-right">
                      TRC-20
                    </Label>
                    <Input
                      id="edit-wallet"
                      value={editForm.trcWallet}
                      onChange={(e) => setEditForm({ ...editForm, trcWallet: e.target.value })}
                      className="col-span-3"
                      placeholder="TRC-20 USDT адрес"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleUpdateAgent} disabled={isLoading}>
                    Сохранить
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Статистика</CardTitle>
            <CardDescription>Заработок и команда</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Заработок за 30 дней</p>
              <p className="font-medium text-lg">${formatAmount(agent.earnings30Days)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Трейдеров в команде</p>
              <p className="font-medium text-lg">{agent.agentTraders.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Дата регистрации</p>
              <p className="font-medium">{format(new Date(agent.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru })}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Фильтр по датам</CardTitle>
            <CardDescription>Выберите период для расчета</CardDescription>
          </CardHeader>
          <CardContent>
            <DatePickerWithRange
              date={dateRange}
              onDateChange={setDateRange}
            />
            {earningsData && (
              <div className="mt-4 space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Заработок за период</p>
                  <p className="font-medium text-lg">${formatAmount(earningsData.totalEarnings)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Команда трейдеров</CardTitle>
              <CardDescription>
                Трейдеры, привязанные к этому агенту
              </CardDescription>
            </div>
            <Dialog open={isAddTraderDialogOpen} onOpenChange={setIsAddTraderDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4 text-[#006039]" />
                  Добавить трейдера
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Добавить трейдера</DialogTitle>
                  <DialogDescription>
                    Выберите трейдера для добавления в команду агента
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="trader" className="text-right">
                      Трейдер
                    </Label>
                    <Select value={selectedTrader} onValueChange={setSelectedTrader}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Выберите трейдера" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTraders.map((trader) => (
                          <SelectItem key={trader.id} value={trader.id}>
                            {trader.name} ({trader.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddTrader} disabled={isLoading}>
                    Добавить
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>Список трейдеров в команде агента</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Трейдер</TableHead>
                <TableHead>Команда</TableHead>
                <TableHead>Баланс USDT</TableHead>
                <TableHead>Баланс RUB</TableHead>
                {earningsData && <TableHead>Заработок за период</TableHead>}
                <TableHead>Дата добавления</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agent.agentTraders.map((at) => {
                const traderEarnings = earningsData?.traders.find(t => t.id === at.traderId)
                return (
                  <TableRow key={at.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{at.trader.name}</div>
                        <div className="text-sm text-gray-500">{at.trader.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {at.team ? (
                        <Badge variant="outline">
                          {at.team.name}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>${formatAmount(at.trader.balanceUsdt)}</TableCell>
                    <TableCell>₽{formatAmount(at.trader.balanceRub)}</TableCell>
                    {earningsData && (
                      <TableCell>${formatAmount(traderEarnings?.earnings || 0)}</TableCell>
                    )}
                    <TableCell>{format(new Date(at.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru })}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTrader(at.traderId)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 text-[#006039]" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {agent.teams && agent.teams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Команды агента</CardTitle>
            <CardDescription>
              Все команды, созданные этим агентом
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableCaption>Список команд агента</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Название команды</TableHead>
                  <TableHead>Количество трейдеров</TableHead>
                  <TableHead>Дата создания</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agent.teams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {team.tradersCount} трейдеров
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(team.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru })}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/agents/${agentId}/teams/${team.id}`)}
                      >
                        Подробнее
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>История выплат</CardTitle>
          <CardDescription>
            Последние выплаты агенту
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>История выплат комиссий</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Период</TableHead>
                <TableHead>Заработок</TableHead>
                <TableHead>Сумма выплаты</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Дата выплаты</TableHead>
                <TableHead>TX Hash</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agent.agentPayouts.map((payout) => (
                <TableRow key={payout.id}>
                  <TableCell>
                    {format(new Date(payout.periodStart), 'dd.MM.yyyy HH:mm', { locale: ru })} - {format(new Date(payout.periodEnd), 'dd.MM.yyyy HH:mm', { locale: ru })}
                  </TableCell>
                  <TableCell>${formatAmount(payout.earnings)}</TableCell>
                  <TableCell>${formatAmount(payout.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={payout.isPaid ? 'default' : 'secondary'}>
                      {payout.isPaid ? 'Выплачено' : 'Ожидает'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {payout.paidAt ? format(new Date(payout.paidAt), 'dd.MM.yyyy HH:mm', { locale: ru }) : '-'}
                  </TableCell>
                  <TableCell>
                    {payout.txHash ? (
                      <span className="font-mono text-xs">
                        {payout.txHash.slice(0, 6)}...{payout.txHash.slice(-4)}
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AgentMerchantsTable agentId={agentId} />
    </div>
  )
}

export default function AgentProfilePage() {
  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <AgentProfileContent />
      </AuthLayout>
    </ProtectedRoute>
  )
}