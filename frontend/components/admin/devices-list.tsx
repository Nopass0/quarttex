'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { 
  RefreshCw, 
  Search, 
  Filter, 
  Smartphone,
  Tablet,
  Monitor,
  Activity,
  AlertCircle,
  Trash2,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  MessageSquare,
} from 'lucide-react'
import { useAdminAuth } from '@/stores/auth'
import { toast } from 'sonner'
import { DatePickerWithRange } from '@/components/ui/date-picker-range'
import { DateRange } from 'react-day-picker'
import { useDebounce } from '@/hooks/use-debounce'
import { cn } from '@/lib/utils'
import { DeviceMessageEmulator } from './device-message-emulator'

type Device = {
  id: string
  deviceId: string
  model: string
  manufacturer: string
  fingerprint: string
  appVersion: string
  isActive: boolean
  trader: {
    id: string
    name: string
    email: string
  }
  lastActiveAt: string
  createdAt: string
}

type Statistics = {
  total: number
  active: number
  inactive: number
}

export function DevicesList() {
  const { token: adminToken } = useAdminAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [statistics, setStatistics] = useState<Statistics>({
    total: 0,
    active: 0,
    inactive: 0,
  })
  const [devices, setDevices] = useState<Device[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  })
  
  // Filters
  const [filters, setFilters] = useState({
    traderId: '',
    isActive: '',
    dateRange: null as DateRange | null,
    appVersion: '',
  })
  
  const [searchDeviceId, setSearchDeviceId] = useState('')
  const [searchModel, setSearchModel] = useState('')
  const [searchFingerprint, setSearchFingerprint] = useState('')
  
  const debouncedSearchDeviceId = useDebounce(searchDeviceId, 500)
  const debouncedSearchModel = useDebounce(searchModel, 500)
  const debouncedSearchFingerprint = useDebounce(searchFingerprint, 500)
  
  const [showFilters, setShowFilters] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showEmulatorDialog, setShowEmulatorDialog] = useState(false)
  const [emulatorDevice, setEmulatorDevice] = useState<{ id: string; name: string } | null>(null)

  const fetchDevices = useCallback(async (page: number = 1) => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '50',
      })

      // Apply all filters
      if (filters.traderId) params.append('traderId', filters.traderId)
      if (filters.isActive !== '') params.append('isActive', filters.isActive)
      if (filters.dateRange?.from) params.append('startDate', filters.dateRange.from.toISOString())
      if (filters.dateRange?.to) params.append('endDate', filters.dateRange.to.toISOString())
      if (filters.appVersion) params.append('appVersion', filters.appVersion)
      if (debouncedSearchDeviceId) params.append('deviceId', debouncedSearchDeviceId)
      if (debouncedSearchModel) params.append('model', debouncedSearchModel)
      if (debouncedSearchFingerprint) params.append('fingerprint', debouncedSearchFingerprint)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/devices?${params}`,
        {
          headers: {
            'x-admin-key': adminToken || '',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch devices')
      }

      const data = await response.json()
      setStatistics(data.statistics)
      setDevices(data.devices)
      setPagination(data.pagination)
    } catch (error) {
      toast.error('Не удалось загрузить устройства')
    } finally {
      setIsLoading(false)
    }
  }, [adminToken, filters, debouncedSearchDeviceId, debouncedSearchModel, debouncedSearchFingerprint])

  useEffect(() => {
    fetchDevices(1)
  }, [filters, debouncedSearchDeviceId, debouncedSearchModel, debouncedSearchFingerprint])

  const handlePageChange = (newPage: number) => {
    fetchDevices(newPage)
  }

  const clearFilters = () => {
    setFilters({
      traderId: '',
      isActive: '',
      dateRange: null,
      appVersion: '',
    })
    setSearchDeviceId('')
    setSearchModel('')
    setSearchFingerprint('')
  }

  const handleToggleActive = async (device: Device) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/devices/${device.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': adminToken || '',
          },
          body: JSON.stringify({ isActive: !device.isActive }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to update device')
      }

      await fetchDevices(pagination.page)
      toast.success(`Устройство ${device.isActive ? 'деактивировано' : 'активировано'}`)
    } catch (error) {
      toast.error('Не удалось обновить статус устройства')
    }
  }

  const handleDeleteDevice = async () => {
    if (!selectedDevice) return

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/devices/${selectedDevice.id}`,
        {
          method: 'DELETE',
          headers: {
            'x-admin-key': adminToken || '',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to delete device')
      }

      await fetchDevices(pagination.page)
      toast.success('Устройство удалено')
      setShowDeleteDialog(false)
      setSelectedDevice(null)
    } catch (error) {
      toast.error('Не удалось удалить устройство')
    }
  }

  const getDeviceIcon = (model: string) => {
    const modelLower = model.toLowerCase()
    if (modelLower.includes('tablet') || modelLower.includes('ipad')) {
      return Tablet
    } else if (modelLower.includes('desktop') || modelLower.includes('pc')) {
      return Monitor
    }
    return Smartphone
  }

  const getLastActiveStatus = (lastActiveAt: string) => {
    const lastActive = new Date(lastActiveAt)
    const now = new Date()
    const diffHours = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60)
    
    if (diffHours < 1) {
      return { label: 'Онлайн', variant: 'default' as const, color: 'text-green-600' }
    } else if (diffHours < 24) {
      return { label: 'Сегодня', variant: 'secondary' as const, color: 'text-blue-600' }
    } else if (diffHours < 168) { // 7 days
      return { label: `${Math.floor(diffHours / 24)}д назад`, variant: 'outline' as const, color: 'text-gray-600' }
    } else {
      return { label: 'Неактивен', variant: 'destructive' as const, color: 'text-red-600' }
    }
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Всего устройств</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold">{statistics.total}</p>
              <Smartphone className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-green-600">Активных</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-green-600">{statistics.active}</p>
              <Activity className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-red-600">Неактивных</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-red-600">{statistics.inactive}</p>
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Поиск и фильтры</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                {showFilters ? 'Скрыть' : 'Показать'} фильтры
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchDevices(pagination.page)}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick search */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по Device ID..."
                value={searchDeviceId}
                onChange={(e) => setSearchDeviceId(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по модели..."
                value={searchModel}
                onChange={(e) => setSearchModel(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по fingerprint..."
                value={searchFingerprint}
                onChange={(e) => setSearchFingerprint(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Advanced filters */}
          {showFilters && (
            <div className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Статус</Label>
                  <Select
                    value={filters.isActive}
                    onValueChange={(value) => setFilters({ ...filters, isActive: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Все статусы" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Все статусы</SelectItem>
                      <SelectItem value="true">Активные</SelectItem>
                      <SelectItem value="false">Неактивные</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Последняя активность</Label>
                  <DatePickerWithRange
                    date={filters.dateRange}
                    onDateChange={(range) => setFilters({ ...filters, dateRange: range })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Версия приложения</Label>
                  <Input
                    placeholder="Например: 1.0.0"
                    value={filters.appVersion}
                    onChange={(e) => setFilters({ ...filters, appVersion: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={clearFilters} disabled={isLoading}>
                  Очистить фильтры
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список устройств</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && devices.length === 0 ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device ID</TableHead>
                      <TableHead>Модель</TableHead>
                      <TableHead>Трейдер</TableHead>
                      <TableHead>Версия</TableHead>
                      <TableHead>Последняя активность</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.map((device) => {
                      const DeviceIcon = getDeviceIcon(device.model)
                      const lastActiveStatus = getLastActiveStatus(device.lastActiveAt)
                      
                      return (
                        <TableRow key={device.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <DeviceIcon className="h-4 w-4 text-gray-400" />
                              <div>
                                <div className="font-mono text-sm">{device.deviceId}</div>
                                <div className="text-xs text-gray-500">{device.fingerprint}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="text-sm font-medium">{device.model}</div>
                              <div className="text-xs text-gray-500">{device.manufacturer}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="text-sm">{device.trader.name}</div>
                              <div className="text-xs text-gray-500">{device.trader.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{device.appVersion}</Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className={cn("text-sm font-medium", lastActiveStatus.color)}>
                                {lastActiveStatus.label}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(device.lastActiveAt).toLocaleString('ru-RU')}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={device.isActive}
                                onCheckedChange={() => handleToggleActive(device)}
                              />
                              <span className="text-sm">
                                {device.isActive ? (
                                  <Badge variant="default" className="gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Активно
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="gap-1">
                                    <XCircle className="h-3 w-3" />
                                    Неактивно
                                  </Badge>
                                )}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-48" align="end">
                                <div className="space-y-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start"
                                    onClick={() => {
                                      setEmulatorDevice({ id: device.deviceId, name: device.model })
                                      setShowEmulatorDialog(true)
                                    }}
                                  >
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Эмулятор сообщений
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => {
                                      setSelectedDevice(device)
                                      setShowDeleteDialog(true)
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Удалить
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Показано {devices.length} из {pagination.total} устройств
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1 || isLoading}
                    >
                      Назад
                    </Button>
                    <span className="text-sm">
                      Страница {pagination.page} из {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages || isLoading}
                    >
                      Вперед
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message Emulator Dialog */}
      {emulatorDevice && (
        <DeviceMessageEmulator
          deviceId={emulatorDevice.id}
          deviceName={emulatorDevice.name}
          open={showEmulatorDialog}
          onOpenChange={(open) => {
            setShowEmulatorDialog(open)
            if (!open) setEmulatorDevice(null)
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить устройство?</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить это устройство? Это действие нельзя отменить.
              {selectedDevice && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm">
                    <strong>Устройство:</strong> {selectedDevice.model}
                  </p>
                  <p className="text-sm">
                    <strong>Трейдер:</strong> {selectedDevice.trader.name}
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false)
                setSelectedDevice(null)
              }}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteDevice}
            >
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}