'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
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
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Search, UserPlus, Trash2, Ban, CheckCircle, Copy, RefreshCw, MoreHorizontal } from 'lucide-react'
import { useAdminAuth } from '@/stores/auth'
import { formatAmount, API_URL } from '@/lib/utils'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type Trader = {
  id: string
  numericId: number
  name: string
  email: string
  balanceUsdt: number
  balanceRub: number
  trustBalance: number
  deposit: number
  frozenUsdt: number
  frozenRub: number
  profitFromDeals: number
  profitFromPayouts: number
  profitPercent: number | null
  stakePercent: number | null
  rateConst: number | null
  useConstRate: boolean
  banned: boolean
  turnover: number
  createdAt: string
  activeRequisitesCount: number
  team: {
    id: string
    name: string
    agentId: string
  } | null
  agent: {
    id: string
    name: string
    email: string
  } | null
}

export function TradersList() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [traders, setTraders] = useState<Trader[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedTrader, setSelectedTrader] = useState<Trader | null>(null)
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { token: adminToken } = useAdminAuth()
  const [formData, setFormData] = useState({
    email: '',
    trustBalance: 0,
    profitFromDeals: 0,
    profitFromPayouts: 0,
    profitPercent: 0,
    stakePercent: 0,
    rateConst: null as number | null,
    useConstRate: false,
  })

  useEffect(() => {
    fetchTraders()
  }, [])

  const fetchTraders = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_URL}/admin/users`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch traders')
      const data = await response.json()
      setTraders(data)
    } catch (error) {
      toast.error('Не удалось загрузить список трейдеров')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredTraders = traders.filter(
    (trader) =>
      trader.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trader.numericId.toString().includes(searchQuery)
  )

  const handleCreateTrader = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_URL}/admin/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({
          email: formData.email,
          name: formData.email, // Use email as name for identification
          trustBalance: formData.trustBalance,
          profitPercent: formData.profitPercent || null,
          stakePercent: formData.stakePercent || null,
          rateConst: formData.rateConst,
          useConstRate: formData.useConstRate,
        }),
      })
      
      if (!response.ok && response.status !== 201) {
        let errorMessage = 'Failed to create trader'
        try {
          const contentType = response.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const error = await response.json()
            errorMessage = error.error || error.message || errorMessage
          } else {
            errorMessage = `Server error: ${response.status} ${response.statusText}`
          }
        } catch (e) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }
      
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned invalid response format')
      }
      
      const data = await response.json()
      setGeneratedPassword(data.plainPassword)
      setIsCreateDialogOpen(false)
      setShowPasswordDialog(true)
      setFormData({
        email: '',
        trustBalance: 0,
        profitFromDeals: 0,
        profitFromPayouts: 0,
        profitPercent: 0,
        stakePercent: 0,
        rateConst: null,
        useConstRate: false,
      })
      await fetchTraders()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось создать трейдера')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateTrader = async () => {
    if (!selectedTrader) return
    
    try {
      setIsLoading(true)
      const response = await fetch(`${API_URL}/admin/update-user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({
          id: selectedTrader.id,
          email: formData.email,
          name: formData.email, // Use email as name
          balanceUsdt: selectedTrader.balanceUsdt,
          balanceRub: selectedTrader.balanceRub,
          trustBalance: formData.trustBalance,
          profitFromDeals: formData.profitFromDeals,
          profitFromPayouts: formData.profitFromPayouts,
          profitPercent: formData.profitPercent || null,
          stakePercent: formData.stakePercent || null,
          rateConst: formData.rateConst,
          useConstRate: formData.useConstRate,
          banned: selectedTrader.banned,
        }),
      })
      
      if (!response.ok) throw new Error('Failed to update trader')
      
      setIsEditDialogOpen(false)
      setSelectedTrader(null)
      await fetchTraders()
      toast.success('Данные трейдера обновлены')
    } catch (error) {
      toast.error('Не удалось обновить данные трейдера')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteTrader = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого трейдера?')) return
    
    try {
      setIsLoading(true)
      const response = await fetch(`${API_URL}/admin/delete-user`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({ id }),
      })
      
      if (!response.ok) throw new Error('Failed to delete trader')
      
      await fetchTraders()
      toast.success('Трейдер удален')
    } catch (error) {
      toast.error('Не удалось удалить трейдера')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleBlock = async (trader: Trader) => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_URL}/admin/update-user`, {
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
          profitPercent: trader.profitPercent,
          stakePercent: trader.stakePercent,
          rateConst: trader.rateConst,
          useConstRate: trader.useConstRate,
          banned: !trader.banned,
        }),
      })
      
      if (!response.ok) throw new Error('Failed to update trader')
      
      await fetchTraders()
      toast.success(trader.banned ? 'Трейдер разблокирован' : 'Трейдер заблокирован')
    } catch (error) {
      toast.error('Не удалось изменить статус трейдера')
    } finally {
      setIsLoading(false)
    }
  }

  const openEditDialog = (trader: Trader) => {
    setSelectedTrader(trader)
    setFormData({
      email: trader.email,
      trustBalance: trader.trustBalance,
      profitFromDeals: trader.profitFromDeals,
      profitFromPayouts: trader.profitFromPayouts,
      profitPercent: trader.profitPercent || 0,
      stakePercent: trader.stakePercent || 0,
      rateConst: trader.rateConst,
      useConstRate: trader.useConstRate,
    })
    setIsEditDialogOpen(true)
  }

  const copyToClipboard = (text: string, message: string = 'Скопировано в буфер обмена') => {
    navigator.clipboard.writeText(text)
    toast.success(message)
  }

  const handleRegeneratePassword = async (id: string) => {
    if (!confirm('Вы уверены, что хотите сгенерировать новый пароль для этого трейдера?')) return
    
    try {
      setIsLoading(true)
      const response = await fetch(`${API_URL}/admin/regenerate-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({ id }),
      })
      
      if (!response.ok) throw new Error('Failed to regenerate password')
      
      const data = await response.json()
      setGeneratedPassword(data.newPassword)
      setShowPasswordDialog(true)
      toast.success('Новый пароль сгенерирован')
    } catch (error) {
      toast.error('Не удалось сгенерировать новый пароль')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#006039]" />
            <Input
              placeholder="Поиск по email или ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchTraders}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 text-[#006039] ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#006039] hover:bg-[#005030]">
              <UserPlus className="mr-2 h-4 w-4 text-white" />
              Добавить трейдера
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить нового трейдера</DialogTitle>
              <DialogDescription>
                Введите данные нового трейдера. Пароль будет сгенерирован автоматически.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="trustBalance" className="text-right">
                  Баланс
                </Label>
                <Input
                  id="trustBalance"
                  type="text"
                  value={formData.trustBalance === 0 ? '' : formData.trustBalance}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d.]/g, '')
                    setFormData({ ...formData, trustBalance: value ? Number(value) : 0 })
                  }}
                  placeholder="0"
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="profit" className="text-right">
                  Прибыль %
                </Label>
                <Input
                  id="profit"
                  type="number"
                  value={formData.profitPercent}
                  onChange={(e) => setFormData({ ...formData, profitPercent: Number(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="stake" className="text-right">
                  Ставка %
                </Label>
                <Input
                  id="stake"
                  type="number"
                  value={formData.stakePercent}
                  onChange={(e) => setFormData({ ...formData, stakePercent: Number(e.target.value) })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreateTrader}
                className="bg-[#006039] hover:bg-[#005030]"
                disabled={isLoading || !formData.email}
              >
                Создать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && traders.length === 0 ? (
        <div className="flex justify-center items-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="w-full overflow-hidden rounded-lg border">
          <div className="overflow-x-auto">
            <Table>
              <TableCaption>Список всех трейдеров в системе</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Трейдер</TableHead>
                  <TableHead className="w-[100px]">Баланс</TableHead>
                  <TableHead className="w-[100px]">Депозит</TableHead>
                  <TableHead className="w-[100px]">Оборот</TableHead>
                  <TableHead className="w-[80px]">Реквизиты</TableHead>
                  <TableHead className="w-[120px]">Заморожено</TableHead>
                  <TableHead className="w-[140px]">Прибыль</TableHead>
                  <TableHead className="w-[100px]">Статус</TableHead>
                  <TableHead className="w-[130px]">Агент и команда</TableHead>
                  <TableHead className="w-[120px]">Дата регистрации</TableHead>
                  <TableHead className="w-[60px]">Действия</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {filteredTraders.map((trader) => (
                <TableRow 
                  key={trader.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/admin/traders/${trader.id}`)}
                >
                  <TableCell>
                    <div className="space-y-1">
                      <div 
                        className="font-medium cursor-pointer hover:text-gray-700 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          copyToClipboard(trader.email, 'Email скопирован')
                        }}
                        title="Нажмите чтобы скопировать email"
                      >
                        {trader.email}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {trader.numericId}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">${formatAmount(trader.trustBalance)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-green-600">${formatAmount(trader.deposit || 0)}</div>
                  </TableCell>
                  <TableCell>₽{formatAmount(trader.turnover)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono">
                      {trader.activeRequisitesCount}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm text-orange-600">${formatAmount(trader.frozenUsdt || 0)}</div>
                      <div className="text-sm text-orange-600">₽{formatAmount(trader.frozenRub || 0)}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm">Сделки: ${formatAmount(trader.profitFromDeals)}</div>
                      <div className="text-sm">Выплаты: ${formatAmount(trader.profitFromPayouts)}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={trader.banned ? 'destructive' : 'default'}>
                      {trader.banned ? 'Заблокирован' : 'Активен'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {trader.agent ? (
                        <div className="text-sm font-medium">{trader.agent.email}</div>
                      ) : (
                        <div className="text-gray-400 text-sm">Без агента</div>
                      )}
                      {trader.team ? (
                        <Badge variant="outline" className="text-xs">
                          {trader.team.name}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-xs">Без команды</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{new Date(trader.createdAt).toLocaleDateString('ru-RU')}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          disabled={isLoading}
                        >
                          <MoreHorizontal className="h-4 w-4 text-[#006039]" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48" align="end">
                        <div className="space-y-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => handleToggleBlock(trader)}
                            disabled={isLoading}
                          >
                            {trader.banned ? (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2 text-[#006039]" />
                                Разблокировать
                              </>
                            ) : (
                              <>
                                <Ban className="h-4 w-4 mr-2 text-[#006039]" />
                                Заблокировать
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => handleRegeneratePassword(trader.id)}
                            disabled={isLoading}
                          >
                            <RefreshCw className="h-4 w-4 mr-2 text-[#006039]" />
                            Новый пароль
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteTrader(trader.id)}
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4 mr-2 text-[#006039]" />
                            Удалить
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать трейдера</DialogTitle>
            <DialogDescription>
              Измените данные трейдера
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-email" className="text-right">
                Email
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-trustBalance" className="text-right">
                Баланс
              </Label>
              <Input
                id="edit-trustBalance"
                type="text"
                value={formData.trustBalance === 0 ? '' : formData.trustBalance}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d.]/g, '')
                  setFormData({ ...formData, trustBalance: value ? Number(value) : 0 })
                }}
                placeholder="0"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-profitFromDeals" className="text-right">
                Прибыль со сделок
              </Label>
              <Input
                id="edit-profitFromDeals"
                type="text"
                value={formData.profitFromDeals === 0 ? '' : formData.profitFromDeals}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d.]/g, '')
                  setFormData({ ...formData, profitFromDeals: value ? Number(value) : 0 })
                }}
                placeholder="0"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-profitFromPayouts" className="text-right">
                Прибыль с выплат
              </Label>
              <Input
                id="edit-profitFromPayouts"
                type="text"
                value={formData.profitFromPayouts === 0 ? '' : formData.profitFromPayouts}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d.]/g, '')
                  setFormData({ ...formData, profitFromPayouts: value ? Number(value) : 0 })
                }}
                placeholder="0"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-profit" className="text-right">
                Прибыль %
              </Label>
              <Input
                id="edit-profit"
                type="number"
                value={formData.profitPercent}
                onChange={(e) => setFormData({ ...formData, profitPercent: Number(e.target.value) })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-stake" className="text-right">
                Ставка %
              </Label>
              <Input
                id="edit-stake"
                type="number"
                value={formData.stakePercent}
                onChange={(e) => setFormData({ ...formData, stakePercent: Number(e.target.value) })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-rateConst" className="text-right">
                Конст. курс
              </Label>
              <Input
                id="edit-rateConst"
                type="number"
                value={formData.rateConst || ''}
                onChange={(e) => setFormData({ ...formData, rateConst: e.target.value ? Number(e.target.value) : null })}
                className="col-span-3"
                placeholder="Оставьте пустым для динамического курса"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-useConstRate" className="text-right">
                Использовать
              </Label>
              <div className="col-span-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.useConstRate}
                    onChange={(e) => setFormData({ ...formData, useConstRate: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Использовать константный курс</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleUpdateTrader}
              className="bg-[#006039] hover:bg-[#005030]"
              disabled={isLoading}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Пароль трейдера</DialogTitle>
            <DialogDescription>
              Сохраните этот пароль - он показывается только один раз!
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-gray-100 p-4 rounded-lg font-mono text-lg text-center relative">
              {generatedPassword}
              <Button
                variant="outline"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => copyToClipboard(generatedPassword)}
              >
                <Copy className="h-4 w-4 text-[#006039]" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowPasswordDialog(false)
                setGeneratedPassword('')
              }}
              className="bg-[#006039] hover:bg-[#005030]"
            >
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}