"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAdminAuth } from "@/stores/auth"
import { adminApiInstance } from "@/services/api"
import { toast } from "sonner"
import { 
  Settings, 
  Activity, 
  Loader2, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Cpu,
  MessageSquare,
  Save,
  RotateCcw
} from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"

// Dynamic import for Monaco editor
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react"),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-96">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  }
)

interface ServiceConfig {
  serviceKey: string
  enabled: boolean
  config: any
  updatedAt?: string
}

interface ServiceData {
  device_emulator: ServiceConfig
  notification_auto_processor: ServiceConfig
}

export default function ServiceConfigPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [services, setServices] = useState<ServiceData>({
    device_emulator: {
      serviceKey: "device_emulator",
      enabled: false,
      config: {}
    },
    notification_auto_processor: {
      serviceKey: "notification_auto_processor",
      enabled: true,
      config: {}
    }
  })
  const [editorContent, setEditorContent] = useState<string>("")
  const [editorErrors, setEditorErrors] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("device_emulator")
  const [processorStats, setProcessorStats] = useState<any>(null)

  useEffect(() => {
    fetchServiceConfigs()
    fetchProcessorStats()
  }, [])

  const fetchServiceConfigs = async () => {
    try {
      setIsLoading(true)
      
      // Fetch device emulator config
      const emulatorRes = await adminApiInstance.get("/admin/device-emulator/config")
      const processorRes = await adminApiInstance.get("/admin/notification-processor/config")
      
      setServices({
        device_emulator: {
          serviceKey: "device_emulator",
          ...emulatorRes.data
        },
        notification_auto_processor: {
          serviceKey: "notification_auto_processor",
          ...processorRes.data
        }
      })

      // Set initial editor content
      if (activeTab === "device_emulator") {
        setEditorContent(JSON.stringify(emulatorRes.data.config, null, 2))
      } else {
        setEditorContent(JSON.stringify(processorRes.data.config, null, 2))
      }
    } catch (error) {
      console.error("Error fetching service configs:", error)
      toast.error("Не удалось загрузить конфигурации сервисов")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchProcessorStats = async () => {
    try {
      const res = await adminApiInstance.get("/admin/notification-processor/stats")
      setProcessorStats(res.data)
    } catch (error) {
      console.error("Error fetching processor stats:", error)
    }
  }

  const validateJSON = (content: string): { valid: boolean; errors: string[] } => {
    try {
      JSON.parse(content)
      return { valid: true, errors: [] }
    } catch (error) {
      const match = error.message.match(/position (\d+)/)
      const position = match ? parseInt(match[1]) : 0
      const lines = content.substring(0, position).split('\n')
      const line = lines.length
      const column = lines[lines.length - 1].length + 1
      
      return {
        valid: false,
        errors: [`Ошибка JSON на строке ${line}, позиция ${column}: ${error.message}`]
      }
    }
  }

  const handleEditorChange = (value: string | undefined) => {
    if (!value) return
    
    setEditorContent(value)
    const validation = validateJSON(value)
    setEditorErrors(validation.errors)
  }

  const handleSaveConfig = async () => {
    const validation = validateJSON(editorContent)
    if (!validation.valid) {
      toast.error("Исправьте ошибки в JSON перед сохранением")
      return
    }

    try {
      setIsSaving(true)
      const config = JSON.parse(editorContent)
      
      const endpoint = activeTab === "device_emulator" 
        ? "/admin/device-emulator/reload"
        : "/admin/notification-processor/reload"
      
      await adminApiInstance.post(endpoint, config)
      
      toast.success("Конфигурация успешно сохранена")
      await fetchServiceConfigs()
    } catch (error: any) {
      console.error("Error saving config:", error)
      toast.error(error.response?.data?.details || "Не удалось сохранить конфигурацию")
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleService = async (serviceKey: string, enabled: boolean) => {
    try {
      if (serviceKey === "device_emulator") {
        const endpoint = enabled 
          ? "/admin/device-emulator/enable"
          : "/admin/device-emulator/disable"
        
        await adminApiInstance.patch(endpoint)
      } else {
        // For processor, update config with enabled flag
        const config = { ...services.notification_auto_processor.config, enabled }
        await adminApiInstance.post("/admin/notification-processor/reload", config)
      }
      
      toast.success(`Сервис ${enabled ? "включен" : "выключен"}`)
      await fetchServiceConfigs()
    } catch (error) {
      console.error("Error toggling service:", error)
      toast.error("Не удалось изменить состояние сервиса")
    }
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setEditorContent(JSON.stringify(services[value as keyof ServiceData].config, null, 2))
    setEditorErrors([])
  }

  const resetConfig = () => {
    const currentConfig = services[activeTab as keyof ServiceData].config
    setEditorContent(JSON.stringify(currentConfig, null, 2))
    setEditorErrors([])
  }

  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Конфигурация сервисов</h1>
            <p className="text-gray-500">Настройка эмулятора устройств и обработчика уведомлений</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList>
                <TabsTrigger value="device_emulator" className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-[#006039]" />
                  Device Emulator
                  <Badge variant={services.device_emulator.enabled ? "default" : "secondary"}>
                    {services.device_emulator.enabled ? "ON" : "OFF"}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="notification_auto_processor" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-[#006039]" />
                  Notification Processor
                  <Badge variant={services.notification_auto_processor.enabled ? "default" : "secondary"}>
                    {services.notification_auto_processor.enabled ? "ON" : "OFF"}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="device_emulator" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Device Emulator Service</CardTitle>
                        <CardDescription>
                          Эмулирует мобильные устройства для тестирования потока уведомлений
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-4">
                        <Switch
                          checked={services.device_emulator.enabled}
                          onCheckedChange={(checked) => handleToggleService("device_emulator", checked)}
                        />
                        <Label>
                          {services.device_emulator.enabled ? "Включен" : "Выключен"}
                        </Label>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">Конфигурация JSON</h3>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={resetConfig}
                            disabled={isSaving}
                          >
                            <RotateCcw className="h-4 w-4 mr-2 text-[#006039]" />
                            Сбросить
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveConfig}
                            disabled={isSaving || editorErrors.length > 0}
                            className="bg-[#1B5E3F] hover:bg-[#1B5E3F]/90"
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4 mr-2 text-[#006039]" />
                            )}
                            Сохранить
                          </Button>
                        </div>
                      </div>

                      {editorErrors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-red-600">
                            <XCircle className="h-4 w-4 text-[#006039]" />
                            <span className="text-sm font-medium">Ошибки валидации JSON:</span>
                          </div>
                          <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
                            {editorErrors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="border rounded-lg overflow-hidden">
                        <MonacoEditor
                          height="400px"
                          language="json"
                          theme="vs-light"
                          value={editorContent}
                          onChange={handleEditorChange}
                          options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            lineNumbers: "on",
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            formatOnPaste: true,
                            formatOnType: true,
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notification_auto_processor" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Notification Auto-Processor Service</CardTitle>
                        <CardDescription>
                          Автоматически обрабатывает банковские уведомления и сопоставляет их с транзакциями
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-4">
                        <Switch
                          checked={services.notification_auto_processor.enabled}
                          onCheckedChange={(checked) => handleToggleService("notification_auto_processor", checked)}
                        />
                        <Label>
                          {services.notification_auto_processor.enabled ? "Включен" : "Выключен"}
                        </Label>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {processorStats && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-sm text-gray-500">Обработано</div>
                              <div className="text-2xl font-bold">
                                {processorStats.stats?.totalProcessed || 0}
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-sm text-gray-500">Успешных</div>
                              <div className="text-2xl font-bold text-green-600">
                                {processorStats.stats?.successfulMatches || 0}
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-sm text-gray-500">Callback отправлено</div>
                              <div className="text-2xl font-bold text-blue-600">
                                {processorStats.stats?.callbacksSent || 0}
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-sm text-gray-500">Очередь callback</div>
                              <div className="text-2xl font-bold">
                                {processorStats.callbackQueueSize || 0}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">Конфигурация JSON</h3>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              fetchProcessorStats()
                              toast.success("Статистика обновлена")
                            }}
                          >
                            <RefreshCw className="h-4 w-4 mr-2 text-[#006039]" />
                            Обновить статистику
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={resetConfig}
                            disabled={isSaving}
                          >
                            <RotateCcw className="h-4 w-4 mr-2 text-[#006039]" />
                            Сбросить
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveConfig}
                            disabled={isSaving || editorErrors.length > 0}
                            className="bg-[#1B5E3F] hover:bg-[#1B5E3F]/90"
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4 mr-2 text-[#006039]" />
                            )}
                            Сохранить
                          </Button>
                        </div>
                      </div>

                      {editorErrors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-red-600">
                            <XCircle className="h-4 w-4 text-[#006039]" />
                            <span className="text-sm font-medium">Ошибки валидации JSON:</span>
                          </div>
                          <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
                            {editorErrors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="border rounded-lg overflow-hidden">
                        <MonacoEditor
                          height="400px"
                          language="json"
                          theme="vs-light"
                          value={editorContent}
                          onChange={handleEditorChange}
                          options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            lineNumbers: "on",
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            formatOnPaste: true,
                            formatOnType: true,
                          }}
                        />
                      </div>

                      {processorStats?.supportedBanks && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2">Поддерживаемые банки:</h4>
                          <div className="flex flex-wrap gap-2">
                            {processorStats.supportedBanks.map((bank: string) => (
                              <Badge key={bank} variant="secondary">
                                {bank}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </AuthLayout>
    </ProtectedRoute>
  )
}