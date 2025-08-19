'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  Eye,
  Edit,
  User,
  CreditCard,
  Calendar,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  Battery,
} from 'lucide-react'
import { toast } from 'sonner'
import { useDebounce } from '@/hooks/use-debounce'
import { cn } from '@/lib/utils'
import { adminApi } from '@/services/api'

type Device = {
  id: string
  name: string
  isOnline: boolean
  energy: number | null
  ethernetSpeed: number | null
  emulated: boolean
  trader: {
    id: string
    name: string
    email: string
  }
  lastActiveAt: string | null
  createdAt: string
}

type Statistics = {
  total: number
  online: number
  offline: number
}

export function DevicesManagement() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [statistics, setStatistics] = useState<Statistics>({
    total: 0,
    online: 0,
    offline: 0,
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
    isOnline: '',
    name: '',
    emulated: '',
  })
  
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 500)
  
  const [showFilters, setShowFilters] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const fetchDevices = useCallback(async (page: number = 1) => {
    try {
      setIsLoading(true)
      const params: any = {
        page,
        pageSize: pagination.pageSize,
      }

      // Apply filters
      if (filters.traderId) params.traderId = filters.traderId
      if (filters.isOnline !== '') params.isOnline = filters.isOnline
      if (filters.name) params.name = filters.name
      if (filters.emulated !== '') params.emulated = filters.emulated
      if (debouncedSearchQuery) params.search = debouncedSearchQuery

      const response = await adminApi.getDevices(params)
      
      setStatistics(response.statistics)
      setDevices(response.devices)
      setPagination(response.pagination)
    } catch (error) {
      toast.error('Не удалось загрузить устройства')
      console.error('Error fetching devices:', error)
    } finally {
      setIsLoading(false)
    }
  }, [filters, debouncedSearchQuery, pagination.pageSize])

  useEffect(() => {
    fetchDevices(1)
  }, [filters, debouncedSearchQuery])

  const handlePageChange = (newPage: number) => {
    fetchDevices(newPage)
  }

  const clearFilters = () => {
    setFilters({
      traderId: '',
      isOnline: '',
      name: '',
      emulated: '',
    })
    setSearchQuery('')
  }

  const handleToggleActive = async (device: Device) => {
    try {
      await adminApi.updateDevice(device.id, { isOnline: !device.isOnline })
      await fetchDevices(pagination.page)
      toast.success(`Устройство ${device.isOnline ? 'отключено' : 'подключено'}`)
    } catch (error) {
      toast.error('Не удалось обновить статус устройства')
    }
  }

  const handleDeleteDevice = async () => {
    if (!selectedDevice) return

    try {
      await adminApi.deleteDevice(selectedDevice.id)
      await fetchDevices(pagination.page)
      toast.success('Устройство успешно удалено')
      setShowDeleteDialog(false)
      setSelectedDevice(null)
    } catch (error) {
      toast.error('Не удалось удалить устройство')
    }
  }

  const navigateToDetails = (deviceId: string) => {
    router.push(`/admin/devices/${deviceId}`)
  }

  const getDeviceIcon = (emulated: boolean) => {
    return emulated ? Monitor : Smartphone
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
      return { label: `${Math.floor(diffHours / 24)} дн. назад`, variant: 'outline' as const, color: 'text-gray-600' }
    } else {
      return { label: 'Неактивно', variant: 'destructive' as const, color: 'text-red-600' }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
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
            <CardTitle className="text-base font-medium text-green-600">Онлайн</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-green-600">{statistics.online}</p>
              <Activity className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-red-600">Офлайн</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-red-600">{statistics.offline}</p>
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию, трейдеру..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Advanced filters */}
          {showFilters && (
            <div className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Статус</Label>
                  <Select
                    value={filters.isOnline}
                    onValueChange={(value) => setFilters({ ...filters, isOnline: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Все статусы" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Все статусы</SelectItem>
                      <SelectItem value="true">Онлайн</SelectItem>
                      <SelectItem value="false">Офлайн</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Название устройства</Label>
                  <Input
                    placeholder="Фильтр по названию"
                    value={filters.name}
                    onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Тип устройства</Label>
                  <Select
                    value={filters.emulated}
                    onValueChange={(value) => setFilters({ ...filters, emulated: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Все типы" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Все типы</SelectItem>
                      <SelectItem value="true">Эмулированные</SelectItem>
                      <SelectItem value="false">Реальные</SelectItem>
                    </SelectContent>
                  </Select>
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

      {/* Devices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список устройств</CardTitle>
          <CardDescription>
            Управление всеми зарегистрированными устройствами
          </CardDescription>
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
                      <TableHead>Название</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Трейдер</TableHead>
                      <TableHead>Параметры</TableHead>
                      <TableHead>Последняя активность</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.map((device) => {
                      const DeviceIcon = getDeviceIcon(device.emulated)
                      const lastActiveStatus = device.lastActiveAt ? getLastActiveStatus(device.lastActiveAt) : null
                      
                      return (
                        <TableRow 
                          key={device.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => navigateToDetails(device.id)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <DeviceIcon className="h-4 w-4 text-gray-400" />
                              <div>
                                <div className="font-medium">{device.name}</div>
                                {device.emulated && (
                                  <Badge variant="outline" className="text-xs">Эмулированное</Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge 
                                variant={device.isOnline ? "default" : "secondary"}
                                className="w-fit"
                              >
                                {device.isOnline ? (
                                  <>
                                    <Wifi className="h-3 w-3 mr-1" />
                                    Онлайн
                                  </>
                                ) : (
                                  <>
                                    <WifiOff className="h-3 w-3 mr-1" />
                                    Офлайн
                                  </>
                                )}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <div>
                                <div className="font-medium">{device.trader.name}</div>
                                <div className="text-sm text-gray-500">{device.trader.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {device.energy !== null && (
                                <div className="flex items-center gap-1">
                                  <Battery className="h-3 w-3 text-gray-400" />
                                  <span className="text-sm">{device.energy}%</span>
                                </div>
                              )}
                              {device.ethernetSpeed !== null && (
                                <div className="flex items-center gap-1">
                                  <Activity className="h-3 w-3 text-gray-400" />
                                  <span className="text-sm">{device.ethernetSpeed} Mbps</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {lastActiveStatus ? (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <div>
                                  <div className={cn("text-sm font-medium", lastActiveStatus.color)}>
                                    {lastActiveStatus.label}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {formatDate(device.lastActiveAt!)}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">Никогда</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Действия</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigateToDetails(device.id)
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Подробнее
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleToggleActive(device)
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  {device.isOnline ? 'Отключить' : 'Подключить'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedDevice(device)
                                    setShowDeleteDialog(true)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Удалить
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
                      <ChevronLeft className="h-4 w-4" />
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
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
                    <strong>Устройство:</strong> {selectedDevice.name}
                  </p>
                  <p className="text-sm">
                    <strong>Трейдер:</strong> {selectedDevice.trader.name}
                  </p>
                  <p className="text-sm">
                    <strong>ID устройства:</strong> {selectedDevice.id}
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