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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Edit, Archive, RefreshCw } from 'lucide-react'
import { useAdminAuth } from '@/stores/auth'
import { formatAmount } from '@/lib/utils'
import { toast } from 'sonner'

type MethodType = 'c2c' | 'sbp' | 'crypto'
type Currency = 'rub' | 'usdt'
type RateSource = 'bybit' | 'manual' | 'fixed'

type Method = {
  id: string
  code: string
  name: string
  type: MethodType
  currency: Currency
  commissionPayin: number
  commissionPayout: number
  maxPayin: number
  minPayin: number
  maxPayout: number
  minPayout: number
  chancePayin: number
  chancePayout: number
  isEnabled: boolean
  rateSource: RateSource
}

const methodTypeLabels: Record<MethodType, string> = {
  c2c: 'Card to Card',
  sbp: 'СБП',
  crypto: 'Криптовалюта',
}

const currencyLabels: Record<Currency, string> = {
  rub: 'RUB',
  usdt: 'USDT',
}

export function MethodsList() {
  const [searchQuery, setSearchQuery] = useState('')
  const [methods, setMethods] = useState<Method[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { token: adminToken } = useAdminAuth()
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'c2c' as MethodType,
    currency: 'usdt' as Currency,
    commissionPayin: '',
    commissionPayout: '',
    maxPayin: '',
    minPayin: '',
    maxPayout: '',
    minPayout: '',
    chancePayin: 100,
    chancePayout: 100,
    isEnabled: true,
    rateSource: 'bybit' as RateSource,
  })

  useEffect(() => {
    fetchMethods()
  }, [])

  const fetchMethods = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/merchant/methods/list`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch methods')
      const data = await response.json()
      setMethods(data)
    } catch (error) {
      toast.error('Не удалось загрузить список методов')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredMethods = methods.filter((method) =>
    method.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    method.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateMethod = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/merchant/methods/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({
          ...formData,
          commissionPayin: parseFloat(formData.commissionPayin) || 0,
          commissionPayout: parseFloat(formData.commissionPayout) || 0,
          maxPayin: parseFloat(formData.maxPayin) || 0,
          minPayin: parseFloat(formData.minPayin) || 0,
          maxPayout: parseFloat(formData.maxPayout) || 0,
          minPayout: parseFloat(formData.minPayout) || 0,
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create method')
      }
      
      setIsCreateDialogOpen(false)
      setFormData({
        code: '',
        name: '',
        type: 'c2c',
        currency: 'usdt',
        commissionPayin: '',
        commissionPayout: '',
        maxPayin: '',
        minPayin: '',
        maxPayout: '',
        minPayout: '',
        chancePayin: 100,
        chancePayout: 100,
        isEnabled: true,
        rateSource: 'bybit',
      })
      await fetchMethods()
      toast.success('Метод платежа создан')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось создать метод')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateMethod = async () => {
    if (!selectedMethod) return
    
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/merchant/methods/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({
          id: selectedMethod.id,
          code: formData.code,
          name: formData.name,
          type: formData.type,
          currency: formData.currency,
          commissionPayin: parseFloat(formData.commissionPayin) || 0,
          commissionPayout: parseFloat(formData.commissionPayout) || 0,
          maxPayin: parseFloat(formData.maxPayin) || 0,
          minPayin: parseFloat(formData.minPayin) || 0,
          maxPayout: parseFloat(formData.maxPayout) || 0,
          minPayout: parseFloat(formData.minPayout) || 0,
          chancePayin: formData.chancePayin,
          chancePayout: formData.chancePayout,
          isEnabled: formData.isEnabled,
          rateSource: formData.rateSource,
        }),
      })
      
      if (!response.ok) throw new Error('Failed to update method')
      
      setIsEditDialogOpen(false)
      setSelectedMethod(null)
      await fetchMethods()
      toast.success('Метод обновлен')
    } catch (error) {
      toast.error('Не удалось обновить метод')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleMethod = async (method: Method) => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/merchant/methods/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({
          ...method,
          isEnabled: !method.isEnabled,
        }),
      })
      
      if (!response.ok) throw new Error('Failed to toggle method')
      
      await fetchMethods()
      toast.success(method.isEnabled ? 'Метод архивирован' : 'Метод активирован')
    } catch (error) {
      toast.error('Не удалось изменить статус метода')
    } finally {
      setIsLoading(false)
    }
  }

  const openEditDialog = (method: Method) => {
    setSelectedMethod(method)
    setFormData({
      code: method.code,
      name: method.name,
      type: method.type,
      currency: method.currency,
      commissionPayin: method.commissionPayin.toString(),
      commissionPayout: method.commissionPayout.toString(),
      maxPayin: method.maxPayin.toString(),
      minPayin: method.minPayin.toString(),
      maxPayout: method.maxPayout.toString(),
      minPayout: method.minPayout.toString(),
      chancePayin: method.chancePayin,
      chancePayout: method.chancePayout,
      isEnabled: method.isEnabled,
      rateSource: method.rateSource,
    })
    setIsEditDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию или коду..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchMethods}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#006039] hover:bg-[#005030]">
              <Plus className="mr-2 h-4 w-4" />
              Добавить метод
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Добавить новый метод платежа</DialogTitle>
              <DialogDescription>
                Заполните данные нового метода платежа
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Код метода</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Например: sber_c2c"
                  />
                </div>
                <div>
                  <Label htmlFor="name">Название</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Например: Сбербанк C2C"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Тип</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value as MethodType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="c2c">Card to Card</SelectItem>
                      <SelectItem value="sbp">СБП</SelectItem>
                      <SelectItem value="crypto">Криптовалюта</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="rateSource">Источник курса</Label>
                  <Select
                    value={formData.rateSource}
                    onValueChange={(value) => setFormData({ ...formData, rateSource: value as RateSource })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bybit">Bybit</SelectItem>
                      <SelectItem value="manual">Ручной</SelectItem>
                      <SelectItem value="fixed">Фиксированный</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="commissionPayin">Комиссия вход %</Label>
                  <Input
                    id="commissionPayin"
                    type="number"
                    step="0.1"
                    value={formData.commissionPayin}
                    onChange={(e) => setFormData({ ...formData, commissionPayin: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="commissionPayout">Комиссия выход %</Label>
                  <Input
                    id="commissionPayout"
                    type="number"
                    step="0.1"
                    value={formData.commissionPayout}
                    onChange={(e) => setFormData({ ...formData, commissionPayout: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minPayin">Мин. сумма вход</Label>
                  <Input
                    id="minPayin"
                    type="number"
                    value={formData.minPayin}
                    onChange={(e) => setFormData({ ...formData, minPayin: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="maxPayin">Макс. сумма вход</Label>
                  <Input
                    id="maxPayin"
                    type="number"
                    value={formData.maxPayin}
                    onChange={(e) => setFormData({ ...formData, maxPayin: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minPayout">Мин. сумма выход</Label>
                  <Input
                    id="minPayout"
                    type="number"
                    value={formData.minPayout}
                    onChange={(e) => setFormData({ ...formData, minPayout: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="maxPayout">Макс. сумма выход</Label>
                  <Input
                    id="maxPayout"
                    type="number"
                    value={formData.maxPayout}
                    onChange={(e) => setFormData({ ...formData, maxPayout: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreateMethod}
                className="bg-[#006039] hover:bg-[#005030]"
                disabled={isLoading || !formData.code || !formData.name}
              >
                Создать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && methods.length === 0 ? (
        <div className="flex justify-center items-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <Table>
          <TableCaption>Список всех платежных методов</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Код</TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Валюта</TableHead>
              <TableHead>Комиссия вход</TableHead>
              <TableHead>Комиссия выход</TableHead>
              <TableHead>Лимиты вход</TableHead>
              <TableHead>Лимиты выход</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMethods.map((method) => (
              <TableRow key={method.id}>
                <TableCell className="font-mono">{method.code}</TableCell>
                <TableCell className="font-medium">{method.name}</TableCell>
                <TableCell>{methodTypeLabels[method.type]}</TableCell>
                <TableCell>{currencyLabels[method.currency]}</TableCell>
                <TableCell>{method.commissionPayin}%</TableCell>
                <TableCell>{method.commissionPayout}%</TableCell>
                <TableCell>
                  <div className="text-xs">
                    <div>{formatAmount(method.minPayin)} - {formatAmount(method.maxPayin)}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs">
                    <div>{formatAmount(method.minPayout)} - {formatAmount(method.maxPayout)}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={method.isEnabled ? 'default' : 'secondary'}>
                    {method.isEnabled ? 'Активен' : 'Архивирован'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(method)}
                      disabled={isLoading}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleMethod(method)}
                      disabled={isLoading}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактировать метод платежа</DialogTitle>
            <DialogDescription>
              Измените данные метода платежа
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-code">Код метода</Label>
                <Input
                  id="edit-code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-name">Название</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-type">Тип</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as MethodType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="c2c">Card to Card</SelectItem>
                    <SelectItem value="sbp">СБП</SelectItem>
                    <SelectItem value="crypto">Криптовалюта</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-currency">Валюта</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value as Currency })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rub">RUB</SelectItem>
                    <SelectItem value="usdt">USDT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-rateSource">Источник курса</Label>
                <Select
                  value={formData.rateSource}
                  onValueChange={(value) => setFormData({ ...formData, rateSource: value as RateSource })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bybit">Bybit</SelectItem>
                    <SelectItem value="manual">Ручной</SelectItem>
                    <SelectItem value="fixed">Фиксированный</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-commissionPayin">Комиссия вход %</Label>
                <Input
                  id="edit-commissionPayin"
                  type="number"
                  step="0.1"
                  value={formData.commissionPayin}
                  onChange={(e) => setFormData({ ...formData, commissionPayin: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-commissionPayout">Комиссия выход %</Label>
                <Input
                  id="edit-commissionPayout"
                  type="number"
                  step="0.1"
                  value={formData.commissionPayout}
                  onChange={(e) => setFormData({ ...formData, commissionPayout: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-minPayin">Мин. сумма вход</Label>
                <Input
                  id="edit-minPayin"
                  type="number"
                  value={formData.minPayin}
                  onChange={(e) => setFormData({ ...formData, minPayin: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-maxPayin">Макс. сумма вход</Label>
                <Input
                  id="edit-maxPayin"
                  type="number"
                  value={formData.maxPayin}
                  onChange={(e) => setFormData({ ...formData, maxPayin: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-minPayout">Мин. сумма выход</Label>
                <Input
                  id="edit-minPayout"
                  type="number"
                  value={formData.minPayout}
                  onChange={(e) => setFormData({ ...formData, minPayout: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-maxPayout">Макс. сумма выход</Label>
                <Input
                  id="edit-maxPayout"
                  type="number"
                  value={formData.maxPayout}
                  onChange={(e) => setFormData({ ...formData, maxPayout: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleUpdateMethod}
              className="bg-[#006039] hover:bg-[#005030]"
              disabled={isLoading}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}