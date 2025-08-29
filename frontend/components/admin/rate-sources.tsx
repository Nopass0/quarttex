'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAdminAuth } from '@/stores/auth'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RefreshCw, Users, Building2, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import {
  Table,
  TableBody,
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

interface RateSource {
  id: string
  source: 'bybit' | 'rapira'
  displayName: string
  kkkPercent: number
  kkkOperation: 'PLUS' | 'MINUS'
  isActive: boolean
  baseRate: number | null
  lastRateUpdate: string | null
  currentRate?: number | null
  adjustedRate?: number | null
  _count?: {
    traders: number
    merchants: number
  }
  traders?: Array<{
    id: string
    name: string
    email: string
  }>
  merchants?: Array<{
    id: string
    merchantId: string
    merchantProvidesRate: boolean
    priority: number
    isActive: boolean
    merchant: {
      id: string
      name: string
    }
  }>
}

interface MerchantRateRelation {
  id: string
  merchantId: string
  rateSourceId: string
  merchantProvidesRate: boolean
  priority: number
  isActive: boolean
  rateSource?: RateSource
}

export function RateSources() {
  const [sources, setSources] = useState<RateSource[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedSource, setSelectedSource] = useState<RateSource | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isMerchantDialogOpen, setIsMerchantDialogOpen] = useState(false)
  const [isTraderDialogOpen, setIsTraderDialogOpen] = useState(false)
  const [allMerchants, setAllMerchants] = useState<Array<{ id: string; name: string }>>([])
  const [allTraders, setAllTraders] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [selectedMerchantId, setSelectedMerchantId] = useState('')
  const [selectedTraderId, setSelectedTraderId] = useState('')
  const [merchantProvidesRate, setMerchantProvidesRate] = useState(true)
  const { token: adminToken } = useAdminAuth()

  useEffect(() => {
    fetchRateSources()
    fetchMerchants()
    fetchTraders()
  }, [])

  // Auto-refresh rates every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchRateSources, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchRateSources = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/rate-sources`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      
      if (!response.ok) throw new Error('Failed to fetch rate sources')
      
      const data = await response.json()
      setSources(data.data || [])
    } catch (error) {
      toast.error('Не удалось загрузить источники курсов')
    }
  }

  const fetchMerchants = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/merchant`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      
      if (!response.ok) throw new Error('Failed to fetch merchants')
      
      const data = await response.json()
      setAllMerchants(data.merchants || [])
    } catch (error) {
      console.error('Failed to fetch merchants:', error)
    }
  }

  const fetchTraders = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/traders`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      
      if (!response.ok) throw new Error('Failed to fetch traders')
      
      const data = await response.json()
      setAllTraders(data.traders || [])
    } catch (error) {
      console.error('Failed to fetch traders:', error)
    }
  }

  const handleUpdateSource = async (source: RateSource) => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/rate-sources/${source.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({
          displayName: source.displayName,
          kkkPercent: source.kkkPercent,
          kkkOperation: source.kkkOperation,
          isActive: source.isActive,
        }),
      })
      
      if (!response.ok) throw new Error('Failed to update rate source')
      
      toast.success('Источник курса обновлен')
      fetchRateSources()
      setIsEditDialogOpen(false)
    } catch (error) {
      toast.error('Не удалось обновить источник курса')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefreshRates = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/rate-sources/update-rates`, {
        method: 'POST',
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      
      if (!response.ok) throw new Error('Failed to refresh rates')
      
      toast.success('Курсы обновлены')
      fetchRateSources()
    } catch (error) {
      toast.error('Не удалось обновить курсы')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddMerchant = async () => {
    if (!selectedSource || !selectedMerchantId) return

    try {
      setIsLoading(true)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/rate-sources/${selectedSource.id}/merchants/${selectedMerchantId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': adminToken || '',
          },
          body: JSON.stringify({
            merchantProvidesRate,
            priority: 0,
          }),
        }
      )
      
      if (!response.ok) throw new Error('Failed to add merchant')
      
      toast.success('Мерчант привязан к источнику')
      fetchRateSources()
      setIsMerchantDialogOpen(false)
      setSelectedMerchantId('')
    } catch (error) {
      toast.error('Не удалось привязать мерчанта')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddTrader = async () => {
    if (!selectedSource || !selectedTraderId) return

    try {
      setIsLoading(true)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/rate-sources/${selectedSource.id}/traders/${selectedTraderId}`,
        {
          method: 'POST',
          headers: {
            'x-admin-key': adminToken || '',
          },
        }
      )
      
      if (!response.ok) throw new Error('Failed to add trader')
      
      toast.success('Трейдер привязан к источнику')
      fetchRateSources()
      setIsTraderDialogOpen(false)
      setSelectedTraderId('')
    } catch (error) {
      toast.error('Не удалось привязать трейдера')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleMerchantRateProvider = async (relationId: string, currentValue: boolean) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/rate-sources/merchants/${relationId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': adminToken || '',
          },
          body: JSON.stringify({
            merchantProvidesRate: !currentValue,
          }),
        }
      )
      
      if (!response.ok) throw new Error('Failed to update merchant relation')
      
      toast.success('Настройки мерчанта обновлены')
      fetchRateSources()
    } catch (error) {
      toast.error('Не удалось обновить настройки мерчанта')
    }
  }

  const handleRemoveMerchant = async (relationId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/rate-sources/merchants/${relationId}`,
        {
          method: 'DELETE',
          headers: {
            'x-admin-key': adminToken || '',
          },
        }
      )
      
      if (!response.ok) throw new Error('Failed to remove merchant')
      
      toast.success('Мерчант отвязан от источника')
      fetchRateSources()
    } catch (error) {
      toast.error('Не удалось отвязать мерчанта')
    }
  }

  const handleRemoveTrader = async (sourceId: string, traderId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/rate-sources/${sourceId}/traders/${traderId}`,
        {
          method: 'DELETE',
          headers: {
            'x-admin-key': adminToken || '',
          },
        }
      )
      
      if (!response.ok) throw new Error('Failed to remove trader')
      
      toast.success('Трейдер отвязан от источника')
      fetchRateSources()
    } catch (error) {
      toast.error('Не удалось отвязать трейдера')
    }
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'bybit':
        return '🟦'
      case 'rapira':
        return '🟩'
      default:
        return '📊'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Управление источниками курсов и их настройками
        </p>
        <Button onClick={handleRefreshRates} disabled={isLoading} size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Обновить курсы
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sources.map((source) => (
          <Card key={source.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getSourceIcon(source.source)}</span>
                  <div>
                    <CardTitle className="text-lg">{source.displayName}</CardTitle>
                    <CardDescription className="text-xs">
                      {source.source.toUpperCase()}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={source.isActive ? 'default' : 'secondary'}>
                  {source.isActive ? 'Активен' : 'Неактивен'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Курсы */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-purple-50/30 rounded-lg">
                    <span className="text-sm text-gray-600">Базовый курс:</span>
                    <span className="font-semibold">
                      {source.currentRate ? `${source.currentRate.toFixed(2)} ₽/USDT` : 'Нет данных'}
                    </span>
                  </div>
                  
                  {source.kkkPercent !== 0 && (
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Корректировка:</span>
                        {source.kkkOperation === 'PLUS' ? (
                          <TrendingUp className="h-4 w-4 text-[#530FAD] dark:text-[#7c3aed]" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <span className="font-semibold">
                        {source.kkkOperation === 'MINUS' ? '-' : '+'}{source.kkkPercent}%
                      </span>
                    </div>
                  )}

                  {source.adjustedRate && source.kkkPercent !== 0 && (
                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                      <span className="text-sm text-gray-600">Итоговый курс:</span>
                      <span className="font-bold text-purple-700">
                        {source.adjustedRate.toFixed(2)} ₽/USDT
                      </span>
                    </div>
                  )}
                </div>

                {/* Статистика */}
                <div className="flex gap-4">
                  <div className="flex-1 p-3 bg-purple-50/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Трейдеры:</span>
                    </div>
                    <span className="text-lg font-semibold">{source._count?.traders || 0}</span>
                  </div>
                  <div className="flex-1 p-3 bg-purple-50/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Мерчанты:</span>
                    </div>
                    <span className="text-lg font-semibold">{source._count?.merchants || 0}</span>
                  </div>
                </div>

                {/* Действия */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedSource(source)
                      setIsEditDialogOpen(true)
                    }}
                  >
                    Настройки
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedSource(source)
                      setIsMerchantDialogOpen(true)
                    }}
                  >
                    Мерчанты
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedSource(source)
                      setIsTraderDialogOpen(true)
                    }}
                  >
                    Трейдеры
                  </Button>
                </div>

                {source.lastRateUpdate && (
                  <p className="text-xs text-gray-500 text-center">
                    Обновлено: {new Date(source.lastRateUpdate).toLocaleString('ru-RU')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Диалог редактирования источника */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Настройки источника курса</DialogTitle>
            <DialogDescription>
              Измените параметры источника {selectedSource?.displayName}
            </DialogDescription>
          </DialogHeader>
          {selectedSource && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Название для отображения</Label>
                <Input
                  value={selectedSource.displayName}
                  onChange={(e) =>
                    setSelectedSource({ ...selectedSource, displayName: e.target.value })
                  }
                />
              </div>
              
              <div className="space-y-2">
                <Label>Корректировка курса (%)</Label>
                <div className="flex gap-2">
                  <Select
                    value={selectedSource.kkkOperation}
                    onValueChange={(value: 'PLUS' | 'MINUS') =>
                      setSelectedSource({ ...selectedSource, kkkOperation: value })
                    }
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLUS">Увеличить</SelectItem>
                      <SelectItem value="MINUS">Уменьшить</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={selectedSource.kkkPercent}
                    onChange={(e) =>
                      setSelectedSource({ ...selectedSource, kkkPercent: parseFloat(e.target.value) || 0 })
                    }
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>Активен</Label>
                <Switch
                  checked={selectedSource.isActive}
                  onCheckedChange={(checked) =>
                    setSelectedSource({ ...selectedSource, isActive: checked })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => selectedSource && handleUpdateSource(selectedSource)}
              disabled={isLoading}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог управления мерчантами */}
      <Dialog open={isMerchantDialogOpen} onOpenChange={setIsMerchantDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Мерчанты источника {selectedSource?.displayName}</DialogTitle>
            <DialogDescription>
              Управление привязкой мерчантов к источнику курса
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="current" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="current">Текущие мерчанты</TabsTrigger>
              <TabsTrigger value="add">Добавить мерчанта</TabsTrigger>
            </TabsList>
            
            <TabsContent value="current" className="space-y-4">
              {selectedSource?.merchants && selectedSource.merchants.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Мерчант</TableHead>
                      <TableHead>Источник курса</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSource.merchants.map((relation) => (
                      <TableRow key={relation.id}>
                        <TableCell className="font-medium">{relation.merchant.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {relation.merchantProvidesRate ? (
                              <>
                                <Badge variant="outline">Передает курс</Badge>
                                <AlertCircle className="h-4 w-4 text-yellow-600" />
                              </>
                            ) : (
                              <Badge variant="default">Берет из источника</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={relation.isActive ? 'default' : 'secondary'}>
                            {relation.isActive ? 'Активен' : 'Неактивен'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleMerchantRateProvider(relation.id, relation.merchantProvidesRate)}
                            >
                              {relation.merchantProvidesRate ? 'Использовать источник' : 'Передавать курс'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRemoveMerchant(relation.id)}
                            >
                              Удалить
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  Нет привязанных мерчантов
                </p>
              )}
            </TabsContent>
            
            <TabsContent value="add" className="space-y-4">
              <div className="space-y-2">
                <Label>Выберите мерчанта</Label>
                <Select value={selectedMerchantId} onValueChange={setSelectedMerchantId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите мерчанта" />
                  </SelectTrigger>
                  <SelectContent>
                    {allMerchants.map((merchant) => (
                      <SelectItem key={merchant.id} value={merchant.id}>
                        {merchant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Источник курса для мерчанта</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={merchantProvidesRate}
                    onCheckedChange={setMerchantProvidesRate}
                  />
                  <Label className="text-sm">
                    {merchantProvidesRate
                      ? 'Мерчант передает свой курс'
                      : 'Мерчант берет курс из источника'}
                  </Label>
                </div>
              </div>
              
              <Button onClick={handleAddMerchant} disabled={!selectedMerchantId || isLoading}>
                Добавить мерчанта
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Диалог управления трейдерами */}
      <Dialog open={isTraderDialogOpen} onOpenChange={setIsTraderDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Трейдеры источника {selectedSource?.displayName}</DialogTitle>
            <DialogDescription>
              Управление привязкой трейдеров к источнику курса
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="current" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="current">Текущие трейдеры</TabsTrigger>
              <TabsTrigger value="add">Добавить трейдера</TabsTrigger>
            </TabsList>
            
            <TabsContent value="current" className="space-y-4">
              {selectedSource?.traders && selectedSource.traders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Имя</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSource.traders.map((trader) => (
                      <TableRow key={trader.id}>
                        <TableCell className="font-medium">{trader.name}</TableCell>
                        <TableCell>{trader.email}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => selectedSource && handleRemoveTrader(selectedSource.id, trader.id)}
                          >
                            Удалить
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  Нет привязанных трейдеров
                </p>
              )}
            </TabsContent>
            
            <TabsContent value="add" className="space-y-4">
              <div className="space-y-2">
                <Label>Выберите трейдера</Label>
                <Select value={selectedTraderId} onValueChange={setSelectedTraderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите трейдера" />
                  </SelectTrigger>
                  <SelectContent>
                    {allTraders.map((trader) => (
                      <SelectItem key={trader.id} value={trader.id}>
                        {trader.name} ({trader.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button onClick={handleAddTrader} disabled={!selectedTraderId || isLoading}>
                Добавить трейдера
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}
