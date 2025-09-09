"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "sonner"
import { adminApi, adminApiInstance } from "@/services/api"
import { formatDateTime } from "@/lib/utils"
import { 
  Save, 
  RefreshCw, 
  Smartphone, 
  Activity, 
  AlertCircle,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Info,
  AlertTriangle,
  Bug,
  Play,
  Pause,
  Plus,
  Trash2,
  Copy,
  Power,
  PowerOff
} from "lucide-react"
import Editor from "@monaco-editor/react"

interface DeviceInfo {
  deviceCode: string
  isConnected: boolean
  batteryLevel: number
  lastPing?: string
  lastNotification?: string
}

interface EmulatorConfig {
  global: {
    defaultPingSec: number
    defaultNotifyChance: number
    defaultSpamChance: number
    defaultDelayChance: number
    reconnectOnAuthError: boolean
    rngSeed?: number
  }
  devices: Array<{
    deviceCode: string
    bankType: string
    model?: string
    androidVersion?: string
    initialBattery?: number
    pingSec?: number
    notifyChance?: number
    spamChance?: number
    delayChance?: number
  }>
}

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

interface ServiceLog {
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

export function DeviceEmulatorDetail() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [activeTab, setActiveTab] = useState("devices")
  const [config, setConfig] = useState<EmulatorConfig>({
    global: {
      defaultPingSec: 60,
      defaultNotifyChance: 0.4,
      defaultSpamChance: 0.05,
      defaultDelayChance: 0.1,
      reconnectOnAuthError: true,
    },
    devices: [],
  })
  const [configJson, setConfigJson] = useState("")
  const [metrics, setMetrics] = useState({
    deviceCount: 0,
    activeDevices: 0,
    devices: [] as DeviceInfo[],
    isRunning: false,
  })
  const [jsonError, setJsonError] = useState<string | null>(null)
  
  // Logs state
  const [logs, setLogs] = useState<ServiceLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [logFilters, setLogFilters] = useState({
    level: 'all',
    search: '',
  })
  const [logMeta, setLogMeta] = useState({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 0,
  })
  
  // Add device dialog state
  const [showAddDeviceDialog, setShowAddDeviceDialog] = useState(false)
  const [newDevice, setNewDevice] = useState({
    deviceCode: '',
    bankType: 'SBER',
    model: 'Pixel 7 Pro',
    androidVersion: '13',
    initialBattery: 85,
    pingSec: 60,
    notifyChance: 0.4,
    spamChance: 0.05,
    delayChance: 0.1,
  })

  const fetchConfig = async () => {
    try {
      const response = await adminApi.deviceEmulator.getConfig()
      setConfig(response.config)
      setConfigJson(JSON.stringify(response.config, null, 2))
      setEnabled(response.enabled)
      setMetrics(response.metrics)
    } catch (error) {
      toast.error("Не удалось загрузить конфигурацию")
    } finally {
      setLoading(false)
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
      })

      const response = await adminApiInstance.get(`/admin/services/DeviceEmulatorService/logs?${params}`)
      setLogs(response.data.data || [])
      setLogMeta(response.data.meta || {
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
      })
    } catch (error) {
      // Silently handle error if logs endpoint doesn't exist yet
      setLogs([])
      setLogMeta({
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
      })
    } finally {
      setLogsLoading(false)
    }
  }

  const handleJsonChange = (value: string | undefined) => {
    if (!value) return
    setConfigJson(value)
    setJsonError(null)
    
    try {
      const parsed = JSON.parse(value)
      setConfig(parsed)
    } catch (error) {
      setJsonError("Некорректный JSON")
    }
  }

  const handleSave = async () => {
    if (jsonError) {
      toast.error("Исправьте ошибки в JSON перед сохранением")
      return
    }

    setSaving(true)
    try {
      await adminApi.deviceEmulator.updateConfig(config)
      toast.success("Конфигурация сохранена и применена")
      await fetchConfig()
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Ошибка сохранения конфигурации")
    } finally {
      setSaving(false)
    }
  }

  const handleToggleEnabled = async () => {
    try {
      await adminApi.deviceEmulator.setEnabled(!enabled)
      setEnabled(!enabled)
      toast.success(enabled ? "Сервис отключен" : "Сервис включен")
    } catch (error) {
      toast.error("Ошибка изменения статуса сервиса")
    }
  }

  const toggleLogExpanded = (logId: string) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId)
    } else {
      newExpanded.add(logId)
    }
    setExpandedLogs(newExpanded)
  }

  const handleAddDevice = async () => {
    if (!newDevice.deviceCode) {
      toast.error("Введите код устройства")
      return
    }

    const updatedConfig = {
      ...config,
      devices: [...config.devices, newDevice]
    }

    try {
      await adminApi.deviceEmulator.updateConfig(updatedConfig)
      toast.success(`Устройство ${newDevice.deviceCode} добавлено`)
      setShowAddDeviceDialog(false)
      setNewDevice({
        deviceCode: '',
        bankType: 'SBER',
        model: 'Pixel 7 Pro',
        androidVersion: '13',
        initialBattery: 85,
        pingSec: 60,
        notifyChance: 0.4,
        spamChance: 0.05,
        delayChance: 0.1,
      })
      await fetchConfig()
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Ошибка добавления устройства")
    }
  }

  const handleRemoveDevice = async (deviceCode: string) => {
    const updatedConfig = {
      ...config,
      devices: config.devices.filter(d => d.deviceCode !== deviceCode)
    }

    try {
      await adminApi.deviceEmulator.updateConfig(updatedConfig)
      toast.success(`Устройство ${deviceCode} удалено`)
      await fetchConfig()
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Ошибка удаления устройства")
    }
  }

  const handleCopyDeviceCode = (deviceCode: string) => {
    navigator.clipboard.writeText(deviceCode)
    toast.success(`Код устройства ${deviceCode} скопирован`)
  }

  // Effects
  useEffect(() => {
    fetchConfig()
    fetchLogs()
  }, [])
  
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConfig()
      if (activeTab === 'logs') {
        fetchLogs()
      }
    }, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [activeTab])

  useEffect(() => {
    fetchLogs()
  }, [logFilters, logMeta.page])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  const exampleConfig = {
    global: {
      defaultPingSec: 60,
      defaultNotifyChance: 0.4,
      defaultSpamChance: 0.05,
      defaultDelayChance: 0.1,
      reconnectOnAuthError: true,
      rngSeed: 12345,
    },
    devices: [
      {
        deviceCode: "test-sber-1",
        bankType: "SBER",
        model: "Pixel 7 Pro",
        androidVersion: "13",
        initialBattery: 85,
      },
      {
        deviceCode: "test-tink-1",
        bankType: "TINK",
        model: "iPhone 14",
        androidVersion: "iOS 16",
        initialBattery: 70,
      },
    ],
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Device Emulator Service</h1>
          <p className="text-gray-600">
            Эмулятор виртуальных устройств для тестирования Device API
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge variant={enabled ? "default" : "secondary"}>
            {enabled ? (
              <>
                <Play className="w-3 h-3 mr-1" />
                Работает
              </>
            ) : (
              <>
                <Pause className="w-3 h-3 mr-1" />
                Остановлен
              </>
            )}
          </Badge>
          
          <div className="flex items-center gap-2">
            <Switch
              checked={enabled}
              onCheckedChange={handleToggleEnabled}
            />
            <Label>
              {enabled ? "Включен" : "Выключен"}
            </Label>
          </div>
          
          <Button onClick={fetchConfig} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Обновить
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Всего устройств
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{metrics.deviceCount}</span>
              <Smartphone className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Активные устройства
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-green-600">
                {metrics.activeDevices}
              </span>
              <Activity className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Процент активных
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {metrics.deviceCount > 0 
                  ? Math.round((metrics.activeDevices / metrics.deviceCount) * 100)
                  : 0}%
              </span>
              <div className="w-16 h-16 relative">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="#10b981"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - (metrics.activeDevices / metrics.deviceCount || 0))}`}
                    className="transition-all duration-500"
                  />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="devices">Устройства</TabsTrigger>
          <TabsTrigger value="config">Конфигурация</TabsTrigger>
          <TabsTrigger value="logs">
            Логи
            {logs.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {logMeta.total}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Devices Tab */}
        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Эмулированные устройства</CardTitle>
                <Button 
                  size="sm" 
                  onClick={() => setShowAddDeviceDialog(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить устройство
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {config.devices.length === 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900">Как добавить устройство</h4>
                      <ol className="mt-2 text-sm text-blue-800 space-y-1 list-decimal list-inside">
                        <li>Перейдите в раздел "Устройства" у трейдера</li>
                        <li>Откройте страницу устройства и нажмите "QR-код"</li>
                        <li>Скопируйте код устройства из диалога</li>
                        <li>Вставьте код в поле "Код устройства" при добавлении</li>
                      </ol>
                      <p className="mt-2 text-sm text-blue-700">
                        <strong>Важно:</strong> Устройство должно быть создано у трейдера и иметь привязанные банковские реквизиты
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {config.devices.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Код устройства</TableHead>
                        <TableHead>Банк</TableHead>
                        <TableHead>Модель</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Батарея</TableHead>
                        <TableHead>Последняя активность</TableHead>
                        <TableHead className="w-[200px]">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {config.devices.map((device) => {
                        const activeDevice = metrics.devices.find(d => d.deviceCode === device.deviceCode)
                        return (
                          <TableRow key={device.deviceCode}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="font-mono text-sm cursor-pointer">
                                        {device.deviceCode.length > 5 
                                          ? `${device.deviceCode.substring(0, 5)}...` 
                                          : device.deviceCode}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{device.deviceCode}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleCopyDeviceCode(device.deviceCode)}
                                  title="Копировать код устройства"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{device.bankType}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {device.model || 'Pixel 7 Pro'}
                            </TableCell>
                            <TableCell>
                              {activeDevice ? (
                                activeDevice.isConnected ? (
                                  <Badge variant="default" className="bg-green-600">
                                    <Power className="w-3 h-3 mr-1" />
                                    Подключен
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive">
                                    <PowerOff className="w-3 h-3 mr-1" />
                                    Отключен
                                  </Badge>
                                )
                              ) : enabled && metrics.isRunning ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge variant="outline" className="bg-yellow-50 cursor-help">
                                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                        Подключается...
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-sm">
                                      <p>Устройство пытается подключиться.</p>
                                      <p>Это может занять до 60 секунд.</p>
                                      <p className="mt-2 text-xs">Если подключение не происходит:</p>
                                      <ul className="text-xs mt-1 list-disc list-inside">
                                        <li>Проверьте, что устройство существует в базе</li>
                                        <li>Убедитесь, что у устройства есть флаг emulated: true</li>
                                        <li>Проверьте логи сервиса для деталей ошибки</li>
                                      </ul>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <Badge variant="secondary">
                                  <PowerOff className="w-3 h-3 mr-1" />
                                  Неактивен
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {activeDevice ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-20 bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full ${
                                        activeDevice.batteryLevel > 50
                                          ? "bg-green-500"
                                          : activeDevice.batteryLevel > 20
                                          ? "bg-yellow-500"
                                          : "bg-red-500"
                                      }`}
                                      style={{ width: `${activeDevice.batteryLevel}%` }}
                                    />
                                  </div>
                                  <span className="text-sm">{activeDevice.batteryLevel}%</span>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {activeDevice?.lastPing
                                ? new Date(activeDevice.lastPing).toLocaleString('ru-RU')
                                : "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleCopyDeviceCode(device.deviceCode)}
                                      >
                                        <Copy className="w-4 h-4 text-gray-600" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Скопировать код устройства</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveDevice(device.deviceCode)}
                                  className="text-red-600 hover:text-red-700"
                                  title="Удалить устройство"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Нет настроенных устройств</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Нажмите "Добавить устройство" чтобы начать эмуляцию
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Конфигурация</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    JSON конфигурация сервиса с live валидацией
                  </p>
                </div>
                <Button 
                  onClick={handleSave} 
                  disabled={saving || !!jsonError}
                  size="sm"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {jsonError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">{jsonError}</p>
                  </div>
                )}
                
                <div className="border rounded-lg overflow-hidden">
                  <Editor
                    height="400px"
                    language="json"
                    theme="vs-light"
                    value={configJson}
                    onChange={handleJsonChange}
                    options={{
                      minimap: { enabled: false },
                      formatOnPaste: true,
                      formatOnType: true,
                      automaticLayout: true,
                    }}
                  />
                </div>
                
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700">
                    Пример конфигурации
                  </summary>
                  <pre className="mt-2 p-4 bg-gray-50 rounded-lg overflow-x-auto text-xs">
                    {JSON.stringify(exampleConfig, null, 2)}
                  </pre>
                </details>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Логи сервиса</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Фильтры
                  {showFilters ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                </Button>
              </div>
            </CardHeader>
            {showFilters && (
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <div className="md:col-span-2">
                    <Label>Поиск</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        value={logFilters.search}
                        onChange={(e) => setLogFilters({ ...logFilters, search: e.target.value })}
                        placeholder="Поиск по сообщению..."
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Logs Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Время</TableHead>
                      <TableHead className="w-[100px]">Уровень</TableHead>
                      <TableHead>Сообщение</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                        </TableCell>
                      </TableRow>
                    ) : logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          Нет логов
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => {
                        const Icon = logLevelIcons[log.level]
                        const isExpanded = expandedLogs.has(log.id)
                        return (
                          <React.Fragment key={log.id}>
                            <TableRow className="cursor-pointer hover:bg-gray-50" onClick={() => log.data && toggleLogExpanded(log.id)}>
                              <TableCell className="text-sm text-gray-600">
                                {formatDateTime(log.createdAt)}
                              </TableCell>
                              <TableCell>
                                <Badge className={logLevelColors[log.level]} variant="secondary">
                                  <Icon className="w-3 h-3 mr-1" />
                                  {log.level}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                {log.message}
                              </TableCell>
                              <TableCell>
                                {log.data && (
                                  isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                )}
                              </TableCell>
                            </TableRow>
                            {isExpanded && log.data && (
                              <TableRow key={`${log.id}-expanded`}>
                                <TableCell colSpan={4} className="bg-gray-50">
                                  <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                                    {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                                  </pre>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              {logMeta.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-sm text-gray-600">
                    Страница {logMeta.page} из {logMeta.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLogMeta({ ...logMeta, page: logMeta.page - 1 })}
                      disabled={logMeta.page === 1}
                    >
                      Назад
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLogMeta({ ...logMeta, page: logMeta.page + 1 })}
                      disabled={logMeta.page === logMeta.totalPages}
                    >
                      Вперед
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Device Dialog */}
      <Dialog open={showAddDeviceDialog} onOpenChange={setShowAddDeviceDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Добавить устройство</DialogTitle>
            <DialogDescription>
              Настройте параметры виртуального устройства для эмуляции
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="deviceCode">Код устройства</Label>
              <Input
                id="deviceCode"
                value={newDevice.deviceCode}
                onChange={(e) => setNewDevice({ ...newDevice, deviceCode: e.target.value })}
                placeholder="test-device-1"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bankType">Банк</Label>
              <Select
                value={newDevice.bankType}
                onValueChange={(value) => setNewDevice({ ...newDevice, bankType: value })}
              >
                <SelectTrigger id="bankType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SBER">Сбербанк</SelectItem>
                  <SelectItem value="TINK">Тинькофф</SelectItem>
                  <SelectItem value="VTB">ВТБ</SelectItem>
                  <SelectItem value="ALFA">Альфа-Банк</SelectItem>
                  <SelectItem value="GAZPROM">Газпромбанк</SelectItem>
                  <SelectItem value="OZON">Озон Банк</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="model">Модель устройства</Label>
              <Input
                id="model"
                value={newDevice.model}
                onChange={(e) => setNewDevice({ ...newDevice, model: e.target.value })}
                placeholder="Pixel 7 Pro"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="androidVersion">Версия Android</Label>
              <Input
                id="androidVersion"
                value={newDevice.androidVersion}
                onChange={(e) => setNewDevice({ ...newDevice, androidVersion: e.target.value })}
                placeholder="13"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="initialBattery">Начальный заряд батареи (%)</Label>
              <Input
                id="initialBattery"
                type="number"
                min="0"
                max="100"
                value={newDevice.initialBattery}
                onChange={(e) => setNewDevice({ ...newDevice, initialBattery: parseInt(e.target.value) || 0 })}
              />
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-medium text-gray-700">
                Дополнительные параметры
              </summary>
              <div className="grid gap-4 mt-4">
                <div className="grid gap-2">
                  <Label htmlFor="pingSec">Интервал пинга (сек)</Label>
                  <Input
                    id="pingSec"
                    type="number"
                    min="1"
                    value={newDevice.pingSec}
                    onChange={(e) => setNewDevice({ ...newDevice, pingSec: parseInt(e.target.value) || 60 })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notifyChance">Вероятность уведомлений (0-1)</Label>
                  <Input
                    id="notifyChance"
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={newDevice.notifyChance}
                    onChange={(e) => setNewDevice({ ...newDevice, notifyChance: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="spamChance">Вероятность спама (0-1)</Label>
                  <Input
                    id="spamChance"
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={newDevice.spamChance}
                    onChange={(e) => setNewDevice({ ...newDevice, spamChance: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="delayChance">Вероятность задержки (0-1)</Label>
                  <Input
                    id="delayChance"
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={newDevice.delayChance}
                    onChange={(e) => setNewDevice({ ...newDevice, delayChance: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </details>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDeviceDialog(false)}>
              Отмена
            </Button>
            <Button onClick={handleAddDevice}>
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}