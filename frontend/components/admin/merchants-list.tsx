'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Search, Plus, Copy, Trash2, RefreshCw, Activity, Edit, Settings, MoreHorizontal, Power, PowerOff, DollarSign, History } from 'lucide-react'
import { useAdminAuth } from '@/stores/auth'
import { formatAmount } from '@/lib/utils'
import { toast } from 'sonner'

type Merchant = {
  id: string
  name: string
  token: string
  createdAt: string
  balanceUsdt: number
  balanceRub?: number
  totalTx: number
  paidTx: number
  disabled?: boolean
  banned?: boolean
  countInRubEquivalent?: boolean
}

type Method = {
  id: string
  code: string
  name: string
  type: string
  currency: string
}

type MerchantMethod = {
  id: string
  isEnabled: boolean
  method: Method
}

export function MerchantsList() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isMethodsDialogOpen, setIsMethodsDialogOpen] = useState(false)
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null)
  const [showTokenDialog, setShowTokenDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [availableMethods, setAvailableMethods] = useState<Method[]>([])
  const [merchantMethods, setMerchantMethods] = useState<MerchantMethod[]>([])
  const { token: adminToken } = useAdminAuth()
  const [formData, setFormData] = useState({
    name: '',
  })
  const [editFormData, setEditFormData] = useState({
    name: '',
    disabled: false,
    banned: false,
    countInRubEquivalent: false,
  })

  useEffect(() => {
    fetchMerchants()
  }, [])

  const fetchMerchants = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/merchant/list`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch merchants')
      const data = await response.json()
      setMerchants(data)
    } catch (error) {
      toast.error('Не удалось загрузить список мерчантов')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredMerchants = merchants.filter((merchant) =>
    merchant.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateMerchant = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/merchant/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({
          name: formData.name,
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create merchant')
      }
      
      const data = await response.json()
      setIsCreateDialogOpen(false)
      setSelectedMerchant(data)
      setShowTokenDialog(true)
      setFormData({ name: '' })
      await fetchMerchants()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось создать мерчанта')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteMerchant = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого мерчанта?')) return
    
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/merchant/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({ id }),
      })
      
      if (!response.ok) throw new Error('Failed to delete merchant')
      
      await fetchMerchants()
      toast.success('Мерчант удален')
    } catch (error) {
      toast.error('Не удалось удалить мерчанта')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAvailableMethods = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/merchant/methods/list`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch methods')
      const data = await response.json()
      setAvailableMethods(data)
    } catch (error) {
      toast.error('Не удалось загрузить список методов')
    }
  }

  const fetchMerchantMethods = async (merchantId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/merchant/${merchantId}`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch merchant methods')
      const data = await response.json()
      setMerchantMethods(data.merchantMethods || [])
    } catch (error) {
      toast.error('Не удалось загрузить методы мерчанта')
    }
  }

  const handleEditMerchant = async () => {
    if (!selectedMerchant) return
    
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/merchant/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({
          id: selectedMerchant.id,
          name: editFormData.name,
          disabled: editFormData.disabled,
          banned: editFormData.banned,
          countInRubEquivalent: editFormData.countInRubEquivalent,
        }),
      })
      
      if (!response.ok) throw new Error('Failed to update merchant')
      
      setIsEditDialogOpen(false)
      setSelectedMerchant(null)
      await fetchMerchants()
      toast.success('Мерчант обновлен')
    } catch (error) {
      toast.error('Не удалось обновить мерчанта')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddMethod = async (methodId: string) => {
    if (!selectedMerchant) return
    
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/merchant/${selectedMerchant.id}/methods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({
          methodId,
          isEnabled: true,
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add method')
      }
      
      await fetchMerchantMethods(selectedMerchant.id)
      toast.success('Метод добавлен')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось добавить метод')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveMethod = async (methodId: string) => {
    if (!selectedMerchant) return
    
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/merchant/${selectedMerchant.id}/methods/${methodId}`, {
        method: 'DELETE',
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      
      if (!response.ok) throw new Error('Failed to remove method')
      
      await fetchMerchantMethods(selectedMerchant.id)
      toast.success('Метод удален')
    } catch (error) {
      toast.error('Не удалось удалить метод')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleMethod = async (methodId: string, isEnabled: boolean) => {
    if (!selectedMerchant) return
    
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/merchant/${selectedMerchant.id}/methods/${methodId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({
          isEnabled,
        }),
      })
      
      if (!response.ok) throw new Error('Failed to toggle method')
      
      await fetchMerchantMethods(selectedMerchant.id)
      toast.success('Статус метода обновлен')
    } catch (error) {
      toast.error('Не удалось обновить статус метода')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleDisabled = async (merchantId: string, disabled: boolean) => {
    const merchant = merchants.find(m => m.id === merchantId)
    if (!merchant) return

    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/merchant/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({
          id: merchantId,
          name: merchant.name,
          disabled: disabled,
          banned: merchant.banned || false,
        }),
      })
      
      if (!response.ok) throw new Error('Failed to update merchant status')
      
      await fetchMerchants()
      toast.success(disabled ? 'Трафик мерчанта отключен' : 'Трафик мерчанта включен')
    } catch (error) {
      toast.error('Не удалось изменить статус мерчанта')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleRubCalculation = async (merchantId: string, countInRubEquivalent: boolean) => {
    const merchant = merchants.find(m => m.id === merchantId)
    if (!merchant) return

    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/merchant/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({
          id: merchantId,
          name: merchant.name,
          disabled: merchant.disabled || false,
          banned: merchant.banned || false,
          countInRubEquivalent: countInRubEquivalent,
        }),
      })
      
      if (!response.ok) throw new Error('Failed to update merchant rub calculation setting')
      
      await fetchMerchants()
      toast.success(countInRubEquivalent ? 'Расчеты в рублях включены' : 'Расчеты в рублях отключены')
    } catch (error) {
      toast.error('Не удалось изменить настройку расчетов')
    } finally {
      setIsLoading(false)
    }
  }

  const openEditDialog = (merchant: Merchant) => {
    setSelectedMerchant(merchant)
    setEditFormData({
      name: merchant.name,
      disabled: merchant.disabled || false,
      banned: merchant.banned || false,
      countInRubEquivalent: merchant.countInRubEquivalent || false,
    })
    setIsEditDialogOpen(true)
  }

  const openMethodsDialog = async (merchant: Merchant) => {
    setSelectedMerchant(merchant)
    setIsMethodsDialogOpen(true)
    await Promise.all([
      fetchAvailableMethods(),
      fetchMerchantMethods(merchant.id)
    ])
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('API ключ скопирован в буфер обмена')
  }

  const getTrafficPercentage = (merchant: Merchant) => {
    if (merchant.totalTx === 0) return 0
    return Math.round((merchant.paidTx / merchant.totalTx) * 100)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#006039]" />
            <Input
              placeholder="Поиск по названию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchMerchants}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 text-[#006039] ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#006039] hover:bg-[#005030]">
              <Plus className="mr-2 h-4 w-4 text-white" />
              Добавить мерчанта
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить нового мерчанта</DialogTitle>
              <DialogDescription>
                Введите название для нового мерчанта. API ключ будет сгенерирован автоматически.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Название
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="col-span-3"
                  placeholder="Например: Online Shop"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreateMerchant}
                className="bg-[#006039] hover:bg-[#005030]"
                disabled={isLoading || !formData.name}
              >
                Создать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && merchants.length === 0 ? (
        <div className="flex justify-center items-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-[#006039]" />
        </div>
      ) : (
        <Table>
          <TableCaption>Список всех мерчантов в системе</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>API ключ</TableHead>
              <TableHead>Баланс (рубли)</TableHead>
              <TableHead>Транзакции</TableHead>
              <TableHead>Трафик</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Расчеты в рублях</TableHead>
              <TableHead>Дата создания</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMerchants.map((merchant) => (
              <TableRow 
                key={merchant.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => router.push(`/admin/merchants/${merchant.id}`)}
              >
                <TableCell className="font-medium">{merchant.name}</TableCell>
                <TableCell className="font-mono text-xs">{merchant.id.slice(0, 8)}...</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {merchant.token.slice(0, 8)}...{merchant.token.slice(-8)}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        copyToClipboard(merchant.token)
                      }}
                    >
                      <Copy className="h-3 w-3 text-[#006039]" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>{formatAmount(merchant.balanceRub || 0)} ₽</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{merchant.totalTx} всего</div>
                    <div className="text-xs text-gray-500">{merchant.paidTx} оплачено</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[#006039]" />
                    <span className="text-sm font-medium">{getTrafficPercentage(merchant)}%</span>
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!merchant.disabled}
                      onCheckedChange={(checked) => handleToggleDisabled(merchant.id, !checked)}
                      disabled={isLoading}
                    />
                    <span className="text-sm text-gray-600">
                      {merchant.disabled ? 'Отключен' : 'Активен'}
                    </span>
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={merchant.countInRubEquivalent || false}
                      onCheckedChange={(checked) => handleToggleRubCalculation(merchant.id, checked)}
                      disabled={isLoading}
                    />
                    <span className="text-sm text-gray-600">
                      {merchant.countInRubEquivalent ? 'Включено' : 'Отключено'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{new Date(merchant.createdAt).toLocaleDateString('ru-RU')}</TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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
                          onClick={() => {
                            setSelectedMerchant(merchant)
                            setShowTokenDialog(true)
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2 text-[#006039]" />
                          Показать ключ
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => openEditDialog(merchant)}
                          disabled={isLoading}
                        >
                          <Edit className="h-4 w-4 mr-2 text-[#006039]" />
                          Редактировать
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => openMethodsDialog(merchant)}
                          disabled={isLoading}
                        >
                          <Settings className="h-4 w-4 mr-2 text-[#006039]" />
                          Методы
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => router.push(`/admin/merchants/${merchant.id}/settlements`)}
                          disabled={isLoading}
                        >
                          <DollarSign className="h-4 w-4 mr-2 text-[#006039]" />
                          Сеттлы
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => router.push(`/admin/merchants/${merchant.id}/settle-history`)}
                          disabled={isLoading}
                        >
                          <History className="h-4 w-4 mr-2 text-[#006039]" />
                          История Settle
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteMerchant(merchant.id)}
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
      )}

      <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API ключ мерчанта</DialogTitle>
            <DialogDescription>
              {selectedMerchant && (
                <>Сохраните этот API ключ для мерчанта "{selectedMerchant.name}"</>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedMerchant && (
            <div className="py-4">
              <div className="space-y-3">
                <div>
                  <Label>ID мерчанта</Label>
                  <div className="bg-gray-100 p-3 rounded-lg font-mono text-sm flex items-center justify-between">
                    {selectedMerchant.id}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(selectedMerchant.id)}
                    >
                      <Copy className="h-4 w-4 text-[#006039]" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>API ключ</Label>
                  <div className="bg-gray-100 p-3 rounded-lg font-mono text-sm break-all relative">
                    {selectedMerchant.token}
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => copyToClipboard(selectedMerchant.token)}
                    >
                      <Copy className="h-4 w-4 text-[#006039]" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => {
                setShowTokenDialog(false)
                setSelectedMerchant(null)
              }}
              className="bg-[#006039] hover:bg-[#005030]"
            >
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог редактирования мерчанта */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать мерчанта</DialogTitle>
            <DialogDescription>
              Измените данные мерчанта
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Название
              </Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Трафик отключен
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Switch
                  checked={editFormData.disabled}
                  onCheckedChange={(checked) => setEditFormData({ ...editFormData, disabled: !!checked })}
                />
                <span className="text-sm text-gray-600">
                  {editFormData.disabled ? 'Отключен' : 'Активен'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Заблокирован
              </Label>
              <div className="col-span-3">
                <Checkbox
                  checked={editFormData.banned}
                  onCheckedChange={(checked) => setEditFormData({ ...editFormData, banned: !!checked })}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Подсчет в рублевом эквиваленте
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Switch
                  checked={editFormData.countInRubEquivalent}
                  onCheckedChange={(checked) => setEditFormData({ ...editFormData, countInRubEquivalent: !!checked })}
                />
                <span className="text-sm text-gray-600">
                  {editFormData.countInRubEquivalent ? 'Включен' : 'Выключен'}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleEditMerchant}
              className="bg-[#006039] hover:bg-[#005030]"
              disabled={isLoading || !editFormData.name}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог управления методами */}
      <Dialog open={isMethodsDialogOpen} onOpenChange={setIsMethodsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Методы мерчанта</DialogTitle>
            <DialogDescription>
              {selectedMerchant && `Управление методами для "${selectedMerchant.name}"`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Подключенные методы */}
            <div>
              <h4 className="text-lg font-medium mb-3">Подключенные методы</h4>
              {merchantMethods.length > 0 ? (
                <div className="space-y-2">
                  {merchantMethods.map((merchantMethod) => (
                    <div key={merchantMethod.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium">{merchantMethod.method.name}</div>
                          <div className="text-sm text-gray-500">
                            {merchantMethod.method.code} • {merchantMethod.method.type} • {merchantMethod.method.currency.toUpperCase()}
                          </div>
                        </div>
                        <Badge variant={merchantMethod.isEnabled ? 'default' : 'secondary'}>
                          {merchantMethod.isEnabled ? 'Активен' : 'Отключен'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleMethod(merchantMethod.method.id, !merchantMethod.isEnabled)}
                          disabled={isLoading}
                        >
                          {merchantMethod.isEnabled ? 'Отключить' : 'Включить'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveMethod(merchantMethod.method.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">У мерчанта нет подключенных методов</p>
              )}
            </div>

            {/* Доступные методы для добавления */}
            <div>
              <h4 className="text-lg font-medium mb-3">Доступные методы</h4>
              {availableMethods.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availableMethods
                    .filter(method => !merchantMethods.some(mm => mm.method.id === method.id))
                    .map((method) => (
                      <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{method.name}</div>
                          <div className="text-sm text-gray-500">
                            {method.code} • {method.type} • {method.currency.toUpperCase()}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddMethod(method.id)}
                          disabled={isLoading}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Добавить
                        </Button>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Все доступные методы уже подключены</p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsMethodsDialogOpen(false)}
            >
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}