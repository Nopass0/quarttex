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
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Edit, RefreshCw, Plus, Trash2 } from 'lucide-react'
import { useAdminAuth } from '@/stores/auth'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type RateSetting = {
  id: string
  methodId: string
  kkkPercent: number
  kkkOperation: 'PLUS' | 'MINUS'
  createdAt: string
  updatedAt: string
  method: {
    id: string
    code: string
    name: string
    type: string
  }
}

export function RateSettingsList() {
  const [settings, setSettings] = useState<RateSetting[]>([])
  const [availableMethods, setAvailableMethods] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedSetting, setSelectedSetting] = useState<RateSetting | null>(null)
  const [kkkPercent, setKkkPercent] = useState('')
  const [kkkOperation, setKkkOperation] = useState<'PLUS' | 'MINUS'>('MINUS')
  const [selectedMethodId, setSelectedMethodId] = useState('')
  const { token: adminToken } = useAdminAuth()

  useEffect(() => {
    fetchSettings()
    fetchMethods()
  }, [])

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/rate-settings`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch settings')
      const data = await response.json()
      setSettings(data)
    } catch (error) {
      toast.error('Не удалось загрузить настройки ККК')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMethods = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/merchant/methods/list`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch methods')
      const data = await response.json()
      // Фильтруем только RUB методы
      setAvailableMethods(data.filter((m: any) => m.currency === 'rub' && m.isEnabled))
    } catch (error) {
      toast.error('Не удалось загрузить список методов')
    }
  }

  const openCreateDialog = () => {
    setSelectedSetting(null)
    setKkkPercent('')
    setKkkOperation('MINUS')
    setSelectedMethodId('')
    setIsDialogOpen(true)
  }

  const openEditDialog = (setting: RateSetting) => {
    setSelectedSetting(setting)
    setKkkPercent(setting.kkkPercent.toString())
    setKkkOperation(setting.kkkOperation || 'MINUS')
    setSelectedMethodId(setting.methodId)
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      setIsLoading(true)
      const kkkValue = parseFloat(kkkPercent) || 0

      let response
      if (selectedSetting) {
        // Обновление
        response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/rate-settings/${selectedSetting.methodId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': adminToken || '',
          },
          body: JSON.stringify({
            kkkPercent: kkkValue,
            kkkOperation: kkkOperation,
          }),
        })
      } else {
        // Создание
        response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/rate-settings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': adminToken || '',
          },
          body: JSON.stringify({
            methodId: selectedMethodId,
            kkkPercent: kkkValue,
            kkkOperation: kkkOperation,
          }),
        })
      }

      if (!response.ok) throw new Error('Failed to save settings')

      setIsDialogOpen(false)
      toast.success(selectedSetting ? 'Настройки обновлены' : 'Настройки созданы')
      await fetchSettings()
    } catch (error) {
      toast.error('Не удалось сохранить настройки')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (methodId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эти настройки?')) return

    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/rate-settings/${methodId}`, {
        method: 'DELETE',
        headers: {
          'x-admin-key': adminToken || '',
        },
      })

      if (!response.ok) throw new Error('Failed to delete settings')

      toast.success('Настройки удалены')
      await fetchSettings()
    } catch (error) {
      toast.error('Не удалось удалить настройки')
    } finally {
      setIsLoading(false)
    }
  }

  // Методы, для которых еще нет настроек
  const methodsWithoutSettings = availableMethods.filter(
    method => !settings.find(s => s.methodId === method.id)
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchSettings}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <Button
          className="bg-[#006039] hover:bg-[#005030]"
          onClick={openCreateDialog}
          disabled={methodsWithoutSettings.length === 0}
        >
          <Plus className="mr-2 h-4 w-4" />
          Добавить настройку
        </Button>
      </div>

      {isLoading && settings.length === 0 ? (
        <div className="flex justify-center items-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <Table>
          <TableCaption>
            Настройки коэффициента корректировки курса для RUB методов
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Метод</TableHead>
              <TableHead>Код</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>ККК (%)</TableHead>
              <TableHead>Операция</TableHead>
              <TableHead>Формула</TableHead>
              <TableHead>Обновлено</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {settings.map((setting) => (
              <TableRow key={setting.id}>
                <TableCell className="font-medium">{setting.method.name}</TableCell>
                <TableCell className="font-mono">{setting.method.code}</TableCell>
                <TableCell>{setting.method.type.toUpperCase()}</TableCell>
                <TableCell>
                  <Badge variant="outline">{setting.kkkPercent}%</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={setting.kkkOperation === 'PLUS' ? 'default' : 'secondary'}>
                    {setting.kkkOperation === 'PLUS' ? '+' : '-'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  Курс × {setting.kkkOperation === 'PLUS' 
                    ? ((100 + setting.kkkPercent) / 100).toFixed(2)
                    : ((100 - setting.kkkPercent) / 100).toFixed(2)}
                </TableCell>
                <TableCell>
                  {new Date(setting.updatedAt).toLocaleDateString('ru-RU')}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(setting)}
                      disabled={isLoading}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(setting.methodId)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedSetting ? 'Редактировать' : 'Добавить'} настройку ККК
            </DialogTitle>
            <DialogDescription>
              Коэффициент корректировки курса для расчета заморозки средств
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {!selectedSetting && (
              <div>
                <Label htmlFor="method">Метод</Label>
                <select
                  id="method"
                  className="w-full px-3 py-2 border rounded-md"
                  value={selectedMethodId}
                  onChange={(e) => setSelectedMethodId(e.target.value)}
                >
                  <option value="">Выберите метод</option>
                  {methodsWithoutSettings.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name} ({method.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <Label htmlFor="kkk-percent">Процент ККК (%)</Label>
              <Input
                id="kkk-percent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={kkkPercent}
                onChange={(e) => setKkkPercent(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="kkk-operation">Операция ККК</Label>
              <Select value={kkkOperation} onValueChange={(value: 'PLUS' | 'MINUS') => setKkkOperation(value)}>
                <SelectTrigger id="kkk-operation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MINUS">Минус (-)</SelectItem>
                  <SelectItem value="PLUS">Плюс (+)</SelectItem>
                </SelectContent>
              </Select>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-muted-foreground">
                  Скорректированный курс = Курс мерчанта × (1 {kkkOperation === 'PLUS' ? '+' : '-'} ККК/100)
                </p>
                <p className="text-sm text-muted-foreground">
                  {kkkOperation === 'PLUS' 
                    ? 'При операции "+" курс увеличивается, USDT замораживается меньше'
                    : 'При операции "-" курс уменьшается, USDT замораживается больше'}
                </p>
                {kkkPercent && (
                  <p className="text-sm font-medium">
                    Пример: при курсе 100 и ККК {kkkPercent}% → скорректированный курс {
                      kkkOperation === 'PLUS'
                        ? (100 * (1 + parseFloat(kkkPercent) / 100)).toFixed(2)
                        : (100 * (1 - parseFloat(kkkPercent) / 100)).toFixed(2)
                    }
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              className="bg-[#006039] hover:bg-[#005030]"
              disabled={isLoading || (!selectedSetting && !selectedMethodId)}
            >
              {selectedSetting ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}