'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { 
  Search, 
  RefreshCw, 
  Play, 
  Pause, 
  Save,
  Eye,
  Copy,
  Trash2,
  Filter,
  ChevronDown,
  ChevronUp,
  Calendar as CalendarIcon,
  AlertCircle,
  Info,
  AlertTriangle,
  Bug,
  X
} from 'lucide-react'
import { useAdminAuth } from '@/stores/auth'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'

type ServiceStatus = 'RUNNING' | 'STOPPED' | 'ERROR'
type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

type Service = {
  id: string
  name: string
  displayName: string
  description?: string
  status: ServiceStatus
  interval: number
  enabled: boolean
  lastTick?: string
  lastError?: string
  errorCount: number
  publicFields?: Record<string, any>
  createdAt: string
  updatedAt: string
  runtimeStatus?: any
}

type ServiceLog = {
  id: string
  level: LogLevel
  message: string
  data?: string
  createdAt: string
}

const logLevelColors: Record<LogLevel, string> = {
  DEBUG: 'bg-gray-100 text-gray-700',
  INFO: 'bg-blue-100 text-blue-700',
  WARN: 'bg-yellow-100 text-yellow-700',
  ERROR: 'bg-red-100 text-red-700',
}

const logLevelIcons: Record<LogLevel, any> = {
  DEBUG: Bug,
  INFO: Info,
  WARN: AlertTriangle,
  ERROR: AlertCircle,
}

interface ServiceDetailProps {
  serviceName: string
}

export function ServiceDetail({ serviceName }: ServiceDetailProps) {
  const [service, setService] = useState<Service | null>(null)
  const [logs, setLogs] = useState<ServiceLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [serviceLoading, setServiceLoading] = useState(false)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const { token: adminToken } = useAdminAuth()

  const [logFilters, setLogFilters] = useState({
    level: 'all',
    search: '',
    dateFrom: null as Date | null,
    dateTo: null as Date | null,
  })

  const [logMeta, setLogMeta] = useState({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 0,
  })

  const [editForm, setEditForm] = useState({
    interval: 5000,
    enabled: true,
    maxLogs: 2500,
    publicFields: {} as Record<string, any>,
  })

  useEffect(() => {
    fetchService()
    fetchLogs()
  }, [serviceName])

  useEffect(() => {
    fetchLogs()
  }, [logFilters, logMeta.page])

  const fetchService = async () => {
    try {
      setServiceLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/services/${serviceName}`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch service')
      const data = await response.json()
      setService(data)
      
      setEditForm({
        interval: data.interval,
        enabled: data.enabled,
        maxLogs: data.maxLogs || 2500,
        publicFields: data.publicFields || {},
      })
    } catch (error) {
      toast.error('Не удалось загрузить информацию о сервисе')
    } finally {
      setServiceLoading(false)
    }
  }

  const fetchLogs = async () => {
    try {
      setLogsLoading(true)
      const params = new URLSearchParams({
        page: logMeta.page.toString(),
        limit: logMeta.limit.toString(),
        ...(logFilters.level !== 'all' && { level: logFilters.level }),
        ...(logFilters.search && { search: logFilters.search }),
        ...(logFilters.dateFrom && { dateFrom: logFilters.dateFrom.toISOString() }),
        ...(logFilters.dateTo && { dateTo: logFilters.dateTo.toISOString() }),
      })

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/services/${serviceName}/logs?${params}`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch logs')
      const data = await response.json()
      setLogs(data.data)
      setLogMeta(data.meta)
    } catch (error) {
      toast.error('Не удалось загрузить логи сервиса')
    } finally {
      setLogsLoading(false)
    }
  }

  const handleServiceAction = async (action: 'start' | 'stop') => {
    try {
      setServiceLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/services/${serviceName}/${action}`, {
        method: 'POST',
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error(`Failed to ${action} service`)
      const data = await response.json()
      
      if (data.success) {
        toast.success(data.message)
        await fetchService()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(`Не удалось ${action === 'start' ? 'запустить' : 'остановить'} сервис`)
    } finally {
      setServiceLoading(false)
    }
  }

  const handleUpdateSettings = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/services/${serviceName}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({
          interval: editForm.interval,
          enabled: editForm.enabled,
          maxLogs: editForm.maxLogs,
        }),
      })
      if (!response.ok) throw new Error('Failed to update settings')
      const data = await response.json()
      
      if (data.success) {
        toast.success('Настройки обновлены')
        await fetchService()
        setIsEditDialogOpen(false)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error('Не удалось обновить настройки')
    }
  }

  const handleUpdatePublicFields = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/services/${serviceName}/public-fields`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({
          fields: editForm.publicFields,
        }),
      })
      if (!response.ok) throw new Error('Failed to update public fields')
      const data = await response.json()
      
      if (data.success) {
        toast.success('Поля обновлены')
        await fetchService()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error('Не удалось обновить поля')
    }
  }

  const handleClearLogs = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/services/${serviceName}/logs`, {
        method: 'DELETE',
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error('Failed to clear logs')
      const data = await response.json()
      
      if (data.success) {
        toast.success('Логи очищены')
        await fetchLogs()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error('Не удалось очистить логи')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Скопировано в буфер обмена')
  }

  const toggleLogExpansion = (logId: string) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId)
    } else {
      newExpanded.add(logId)
    }
    setExpandedLogs(newExpanded)
  }

  const formatInterval = (interval: number) => {
    const seconds = Math.floor(interval / 1000)
    if (seconds < 60) return `${seconds}с`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}м`
    const hours = Math.floor(minutes / 60)
    return `${hours}ч ${minutes % 60}м`
  }

  if (!service) {
    return (
      <div className="flex justify-center items-center py-8">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{service.displayName}</h1>
          <p className="text-muted-foreground">{service.description || 'Нет описания'}</p>
        </div>
        <div className="flex items-center gap-2">
          {service.status === 'RUNNING' ? (
            <Button
              variant="outline"
              onClick={() => handleServiceAction('stop')}
              disabled={serviceLoading}
            >
              <Pause className="h-4 w-4 mr-2" />
              Остановить
            </Button>
          ) : (
            <Button
              onClick={() => handleServiceAction('start')}
              disabled={serviceLoading}
            >
              <Play className="h-4 w-4 mr-2" />
              Запустить
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setIsEditDialogOpen(true)}
          >
            <Save className="h-4 w-4 mr-2" />
            Настройки
          </Button>
          <Button
            variant="outline"
            onClick={fetchService}
            disabled={serviceLoading}
          >
            <RefreshCw className={`h-4 w-4 ${serviceLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="logs">Логи ({logMeta.total})</TabsTrigger>
          <TabsTrigger value="fields">Поля</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="p-4">
              <div className="text-sm font-medium text-gray-500">Статус</div>
              <div className="text-2xl font-bold">{service.status}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm font-medium text-gray-500">Интервал</div>
              <div className="text-2xl font-bold">{formatInterval(service.interval)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm font-medium text-gray-500">Ошибки</div>
              <div className="text-2xl font-bold text-red-600">{service.errorCount}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm font-medium text-gray-500">Макс. логов</div>
              <div className="text-2xl font-bold">{service.maxLogs || 2500}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm font-medium text-gray-500">Активен</div>
              <div className="text-2xl font-bold">{service.enabled ? 'Да' : 'Нет'}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Информация о сервисе</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Класс:</span> {service.name}
              </div>
              <div>
                <span className="font-medium">Последний запуск:</span>{' '}
                {service.lastTick ? formatDateTime(service.lastTick) : 'Никогда'}
              </div>
              <div>
                <span className="font-medium">Создан:</span> {formatDateTime(service.createdAt)}
              </div>
              <div>
                <span className="font-medium">Обновлен:</span> {formatDateTime(service.updatedAt)}
              </div>
            </div>
            {service.lastError && (
              <div className="mt-4">
                <span className="font-medium text-red-600">Последняя ошибка:</span>
                <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm font-mono">
                  {service.lastError}
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск в логах..."
                  value={logFilters.search}
                  onChange={(e) => setLogFilters({ ...logFilters, search: e.target.value })}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Фильтры
              </Button>
              <Button
                variant="outline"
                onClick={fetchLogs}
                disabled={logsLoading}
              >
                <RefreshCw className={`h-4 w-4 ${logsLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="outline"
                onClick={handleClearLogs}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Очистить
              </Button>
            </div>
          </div>

          {showFilters && (
            <Card className="p-4 space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>Уровень</Label>
                  <Select value={logFilters.level} onValueChange={(value) => setLogFilters({ ...logFilters, level: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все уровни</SelectItem>
                      <SelectItem value="DEBUG">DEBUG</SelectItem>
                      <SelectItem value="INFO">INFO</SelectItem>
                      <SelectItem value="WARN">WARN</SelectItem>
                      <SelectItem value="ERROR">ERROR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Дата от</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !logFilters.dateFrom && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {logFilters.dateFrom ? format(logFilters.dateFrom, "PPP", { locale: ru }) : "Выберите дату"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={logFilters.dateFrom || undefined}
                        onSelect={(date) => setLogFilters({ ...logFilters, dateFrom: date || null })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div>
                  <Label>Дата до</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !logFilters.dateTo && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {logFilters.dateTo ? format(logFilters.dateTo, "PPP", { locale: ru }) : "Выберите дату"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={logFilters.dateTo || undefined}
                        onSelect={(date) => setLogFilters({ ...logFilters, dateTo: date || null })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => setLogFilters({
                      level: 'all',
                      search: '',
                      dateFrom: null,
                      dateTo: null,
                    })}
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Сбросить
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <Table>
            <TableCaption>
              Показано {logs.length} из {logMeta.total} записей логов
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Уровень</TableHead>
                <TableHead className="w-40">Время</TableHead>
                <TableHead>Сообщение</TableHead>
                <TableHead className="w-20">Данные</TableHead>
                <TableHead className="w-20">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const LogIcon = logLevelIcons[log.level]
                const isExpanded = expandedLogs.has(log.id)
                const hasData = log.data && log.data !== 'null'
                
                return (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge className={logLevelColors[log.level]}>
                        <LogIcon className="h-3 w-3 mr-1" />
                        {log.level}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <div className="text-sm">{log.message}</div>
                        {hasData && isExpanded && (
                          <div className="bg-gray-50 p-2 rounded text-xs font-mono">
                            <pre className="whitespace-pre-wrap">{JSON.stringify(JSON.parse(log.data), null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {hasData && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleLogExpansion(log.id)}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(`[${log.level}] ${log.message}${hasData ? '\n' + log.data : ''}`)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {logMeta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Страница {logMeta.page} из {logMeta.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLogMeta({ ...logMeta, page: logMeta.page - 1 })}
                  disabled={logMeta.page === 1 || logsLoading}
                >
                  Назад
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLogMeta({ ...logMeta, page: logMeta.page + 1 })}
                  disabled={logMeta.page === logMeta.totalPages || logsLoading}
                >
                  Вперед
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="fields" className="space-y-4">
          {service.publicFields && Object.keys(service.publicFields).length > 0 ? (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Публичные поля сервиса</h3>
                <Button onClick={handleUpdatePublicFields}>
                  <Save className="h-4 w-4 mr-2" />
                  Сохранить изменения
                </Button>
              </div>
              <div className="space-y-4">
                {Object.entries(service.publicFields).map(([key, value]) => {
                  const isObject = typeof value === 'object' && value !== null;
                  const isEditable = !isObject && !['config', 'endpoints', 'customSettings'].includes(key);
                  
                  return (
                    <div key={key} className="border rounded-lg p-4">
                      <div className="flex items-start gap-4">
                        <Label className="font-medium text-sm text-gray-600 min-w-[120px]">
                          {key}:
                        </Label>
                        <div className="flex-1">
                          {typeof value === 'boolean' && isEditable ? (
                            <Select
                              value={String(editForm.publicFields[key] ?? value)}
                              onValueChange={(val) => 
                                setEditForm({
                                  ...editForm,
                                  publicFields: { ...editForm.publicFields, [key]: val === 'true' }
                                })
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">Да</SelectItem>
                                <SelectItem value="false">Нет</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : typeof value === 'number' && isEditable ? (
                            <Input
                              type="number"
                              value={editForm.publicFields[key] ?? value}
                              onChange={(e) => 
                                setEditForm({
                                  ...editForm,
                                  publicFields: { ...editForm.publicFields, [key]: Number(e.target.value) }
                                })
                              }
                              className="w-32"
                            />
                          ) : typeof value === 'string' && isEditable ? (
                            <Input
                              value={editForm.publicFields[key] ?? value}
                              onChange={(e) => 
                                setEditForm({
                                  ...editForm,
                                  publicFields: { ...editForm.publicFields, [key]: e.target.value }
                                })
                              }
                              className="max-w-md"
                            />
                          ) : isObject ? (
                            <div className="bg-gray-50 p-3 rounded border">
                              <pre className="text-xs whitespace-pre-wrap overflow-x-auto">
                                {JSON.stringify(value, null, 2)}
                              </pre>
                            </div>
                          ) : (
                            <div className="bg-gray-50 p-2 rounded border text-sm">
                              {String(value)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          ) : (
            <Card className="p-6 text-center">
              <p className="text-gray-500">У этого сервиса нет публичных полей для настройки</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Настройки сервиса</DialogTitle>
            <DialogDescription>
              Измените основные параметры сервиса
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="interval" className="text-right">
                Интервал (мс)
              </Label>
              <Input
                id="interval"
                type="number"
                value={editForm.interval}
                onChange={(e) => setEditForm({ ...editForm, interval: Number(e.target.value) })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="enabled" className="text-right">
                Активен
              </Label>
              <Select
                value={String(editForm.enabled)}
                onValueChange={(val) => setEditForm({ ...editForm, enabled: val === 'true' })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Да</SelectItem>
                  <SelectItem value="false">Нет</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="maxLogs" className="text-right">
                Макс. логов
              </Label>
              <Input
                id="maxLogs"
                type="number"
                min="100"
                max="50000"
                value={editForm.maxLogs}
                onChange={(e) => setEditForm({ ...editForm, maxLogs: Number(e.target.value) })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleUpdateSettings}
              className="bg-[#006039] hover:bg-[#005030]"
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}