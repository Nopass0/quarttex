'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RefreshCw, Users, TrendingUp, Wallet, Plus, Edit2, Trash2 } from 'lucide-react'
import agentApi from '@/services/agent-api'
import { formatAmount } from '@/lib/utils'
import { toast } from 'sonner'

type Team = {
  id: string
  name: string
  agentId: string
  createdAt: string
  traders: TeamMember[]
}

type TeamMember = {
  id: string
  email: string
  name: string
  balanceUsdt: number
  balanceRub: number
  joinedAt: string
  turnover: number
  banned: boolean
  teamId: string | null
}

export default function AgentTeamPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [allTraders, setAllTraders] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [showEditTeam, setShowEditTeam] = useState(false)
  const [showMoveTrader, setShowMoveTrader] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [selectedTrader, setSelectedTrader] = useState<TeamMember | null>(null)
  const [targetTeamId, setTargetTeamId] = useState<string>('no-team')
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [teamsResponse, tradersResponse] = await Promise.all([
        agentApi.get('/agent/teams'),
        agentApi.get('/agent/traders')
      ])
      setTeams(teamsResponse.data.teams || [])
      setAllTraders(tradersResponse.data.traders || [])
    } catch (error) {
      toast.error('Не удалось загрузить данные')
    } finally {
      setIsLoading(false)
    }
  }

  const createTeam = async () => {
    if (!newTeamName.trim()) {
      toast.error('Введите название команды')
      return
    }

    try {
      setIsCreating(true)
      await agentApi.post('/agent/teams', { name: newTeamName.trim() })
      toast.success('Команда создана')
      setNewTeamName('')
      setShowCreateTeam(false)
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка при создании команды')
    } finally {
      setIsCreating(false)
    }
  }

  const updateTeam = async () => {
    if (!editingTeam || !editingTeam.name.trim()) {
      toast.error('Введите название команды')
      return
    }

    try {
      setIsUpdating(true)
      await agentApi.put(`/agent/teams/${editingTeam.id}`, { name: editingTeam.name.trim() })
      toast.success('Команда обновлена')
      setShowEditTeam(false)
      setEditingTeam(null)
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка при обновлении команды')
    } finally {
      setIsUpdating(false)
    }
  }

  const deleteTeam = async (teamId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту команду? Все трейдеры будут перемещены в "Без команды".')) {
      return
    }

    try {
      await agentApi.delete(`/agent/teams/${teamId}`)
      toast.success('Команда удалена')
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка при удалении команды')
    }
  }

  const moveTrader = async () => {
    if (!selectedTrader) return

    try {
      setIsUpdating(true)
      await agentApi.patch(`/agent/traders/${selectedTrader.id}/team`, {
        teamId: targetTeamId === 'no-team' ? null : targetTeamId
      })
      toast.success('Трейдер перемещен')
      setShowMoveTrader(false)
      setSelectedTrader(null)
      setTargetTeamId('no-team')
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка при перемещении трейдера')
    } finally {
      setIsUpdating(false)
    }
  }

  const totalTraders = allTraders.length
  const totalTurnover = allTraders.reduce((sum, trader) => sum + trader.turnover, 0)
  const totalBalance = allTraders.reduce((sum, trader) => sum + trader.balanceUsdt, 0)

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <RefreshCw className="h-8 w-8 animate-spin text-[#006039]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Управление командами</h1>
          <p className="text-gray-600 mt-2">
            Создавайте команды и управляйте вашими трейдерами
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 text-[#006039] ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setShowCreateTeam(true)}>
            <Plus className="h-4 w-4 mr-2 text-white" />
            Создать команду
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Всего команд</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#006039]" />
              <span className="text-2xl font-bold">{teams.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Всего трейдеров</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#006039]" />
              <span className="text-2xl font-bold">{totalTraders}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Общий баланс USDT</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-[#006039]" />
              <span className="text-2xl font-bold text-[#006039]">
                ${formatAmount(totalBalance)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {teams.map((team) => (
          <Card key={team.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {team.name}
                    <Badge variant="outline">{team.traders.length} трейдеров</Badge>
                  </CardTitle>
                  <CardDescription>
                    Создана: {new Date(team.createdAt).toLocaleDateString('ru-RU')}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingTeam({ ...team })
                      setShowEditTeam(true)
                    }}
                  >
                    <Edit2 className="h-4 w-4 text-[#006039]" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteTeam(team.id)}
                  >
                    <Trash2 className="h-4 w-4 text-[#006039]" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {team.traders.map((trader) => (
                  <div key={trader.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{trader.name}</span>
                          {trader.banned && (
                            <Badge variant="destructive">Заблокирован</Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{trader.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right space-y-1">
                        <div className="text-sm">
                          <span className="text-gray-600">USDT:</span> ${formatAmount(trader.balanceUsdt || 0)}
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600">RUB:</span> ₽{formatAmount(trader.balanceRub || 0)}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTrader(trader)
                          setTargetTeamId(trader.teamId || 'no-team')
                          setShowMoveTrader(true)
                        }}
                      >
                        Переместить
                      </Button>
                    </div>
                  </div>
                ))}
                {team.traders.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    В команде нет трейдеров
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Трейдеры без команды */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Без команды
              <Badge variant="outline">
                {allTraders.filter(t => !t.teamId).length} трейдеров
              </Badge>
            </CardTitle>
            <CardDescription>
              Трейдеры, не привязанные ни к одной команде
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allTraders.filter(trader => !trader.teamId).map((trader) => (
                <div key={trader.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{trader.name}</span>
                        {trader.banned && (
                          <Badge variant="destructive">Заблокирован</Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{trader.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right space-y-1">
                      <div className="text-sm">
                        <span className="text-gray-600">USDT:</span> ${formatAmount(trader.balanceUsdt || 0)}
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">RUB:</span> ₽{formatAmount(trader.balanceRub || 0)}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTrader(trader)
                        setTargetTeamId('no-team')
                        setShowMoveTrader(true)
                      }}
                    >
                      Добавить в команду
                    </Button>
                  </div>
                </div>
              ))}
              {allTraders.filter(t => !t.teamId).length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  Все трейдеры распределены по командам
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Диалог создания команды */}
      <Dialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать новую команду</DialogTitle>
            <DialogDescription>
              Введите название для новой команды
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="teamName">Название команды</Label>
              <Input
                id="teamName"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Например: Команда A"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTeam(false)}>
              Отмена
            </Button>
            <Button onClick={createTeam} disabled={isCreating}>
              {isCreating ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог редактирования команды */}
      <Dialog open={showEditTeam} onOpenChange={setShowEditTeam}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать команду</DialogTitle>
            <DialogDescription>
              Изменить название команды
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editTeamName">Название команды</Label>
              <Input
                id="editTeamName"
                value={editingTeam?.name || ''}
                onChange={(e) => setEditingTeam(prev => prev ? { ...prev, name: e.target.value } : null)}
                placeholder="Например: Команда A"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditTeam(false)}>
              Отмена
            </Button>
            <Button onClick={updateTeam} disabled={isUpdating}>
              {isUpdating ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог перемещения трейдера */}
      <Dialog open={showMoveTrader} onOpenChange={setShowMoveTrader}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Переместить трейдера</DialogTitle>
            <DialogDescription>
              Выберите команду для трейдера {selectedTrader?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="targetTeam">Команда</Label>
              <Select
                value={targetTeamId}
                onValueChange={setTargetTeamId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите команду" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-team">Без команды</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveTrader(false)}>
              Отмена
            </Button>
            <Button onClick={moveTrader} disabled={isUpdating}>
              {isUpdating ? 'Перемещение...' : 'Переместить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}