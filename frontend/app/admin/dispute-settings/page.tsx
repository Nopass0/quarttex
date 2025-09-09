'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AuthLayout } from '@/components/layouts/auth-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { adminApi } from '@/services/api'
import { 
  Clock, 
  Sun, 
  Moon, 
  Save,
  AlertCircle,
  Settings
} from 'lucide-react'

interface DisputeSettings {
  dayShiftStartHour: number
  dayShiftEndHour: number
  dayShiftTimeoutMinutes: number
  nightShiftTimeoutMinutes: number
}

export default function DisputeSettingsPage() {
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<DisputeSettings>({
    dayShiftStartHour: 9,
    dayShiftEndHour: 21,
    dayShiftTimeoutMinutes: 30,
    nightShiftTimeoutMinutes: 60
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await adminApi.getSystemConfig()
      const configArray = Array.isArray(response) ? response : response.data || []
      const configMap = Object.fromEntries(
        configArray.map((item: any) => [item.key, item.value])
      )
      
      // Извлекаем настройки споров из общих настроек
      const disputeSettings = {
        dayShiftStartHour: parseInt(configMap.disputeDayShiftStartHour || '9'),
        dayShiftEndHour: parseInt(configMap.disputeDayShiftEndHour || '21'),
        dayShiftTimeoutMinutes: parseInt(configMap.disputeDayShiftTimeoutMinutes || '30'),
        nightShiftTimeoutMinutes: parseInt(configMap.disputeNightShiftTimeoutMinutes || '60')
      }
      
      setSettings(disputeSettings)
    } catch (error) {
      console.error('Failed to load dispute settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      
      // Валидация
      if (settings.dayShiftStartHour >= settings.dayShiftEndHour) {
        toast.error('Время начала дневной смены должно быть меньше времени окончания')
        return
      }
      
      if (settings.dayShiftTimeoutMinutes < 5 || settings.nightShiftTimeoutMinutes < 5) {
        toast.error('Минимальное время ожидания - 5 минут')
        return
      }
      
      // Сохраняем каждую настройку отдельно
      await Promise.all([
        adminApi.updateSystemConfig('disputeDayShiftStartHour', settings.dayShiftStartHour.toString()),
        adminApi.updateSystemConfig('disputeDayShiftEndHour', settings.dayShiftEndHour.toString()),
        adminApi.updateSystemConfig('disputeDayShiftTimeoutMinutes', settings.dayShiftTimeoutMinutes.toString()),
        adminApi.updateSystemConfig('disputeNightShiftTimeoutMinutes', settings.nightShiftTimeoutMinutes.toString())
      ])
      
      toast.success('Настройки споров сохранены')
    } catch (error) {
      toast.error('Ошибка при сохранении настроек')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Settings className="h-8 w-8" />
              Настройки споров
            </h1>
            <p className="text-gray-600 mt-2">
              Управление таймерами ответа на споры для дневной и ночной смены
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Дневная смена */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sun className="h-5 w-5 text-yellow-500" />
                  Дневная смена
                </CardTitle>
                <CardDescription>
                  Настройки для дневного времени работы
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dayStart">Начало смены (час)</Label>
                    <Input
                      id="dayStart"
                      type="number"
                      min="0"
                      max="23"
                      value={settings.dayShiftStartHour}
                      onChange={(e) => setSettings({
                        ...settings,
                        dayShiftStartHour: parseInt(e.target.value) || 0
                      })}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dayEnd">Конец смены (час)</Label>
                    <Input
                      id="dayEnd"
                      type="number"
                      min="0"
                      max="23"
                      value={settings.dayShiftEndHour}
                      onChange={(e) => setSettings({
                        ...settings,
                        dayShiftEndHour: parseInt(e.target.value) || 0
                      })}
                      disabled={loading}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="dayTimeout">Время на ответ (минуты)</Label>
                  <Input
                    id="dayTimeout"
                    type="number"
                    min="5"
                    max="180"
                    value={settings.dayShiftTimeoutMinutes}
                    onChange={(e) => setSettings({
                      ...settings,
                      dayShiftTimeoutMinutes: parseInt(e.target.value) || 5
                    })}
                    disabled={loading}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Трейдер должен ответить в течение {settings.dayShiftTimeoutMinutes} минут
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Ночная смена */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Moon className="h-5 w-5 text-blue-500" />
                  Ночная смена
                </CardTitle>
                <CardDescription>
                  Настройки для ночного времени работы
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Ночная смена: с {settings.dayShiftEndHour}:00 до {settings.dayShiftStartHour}:00
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="nightTimeout">Время на ответ (минуты)</Label>
                  <Input
                    id="nightTimeout"
                    type="number"
                    min="5"
                    max="180"
                    value={settings.nightShiftTimeoutMinutes}
                    onChange={(e) => setSettings({
                      ...settings,
                      nightShiftTimeoutMinutes: parseInt(e.target.value) || 5
                    })}
                    disabled={loading}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Трейдер должен ответить в течение {settings.nightShiftTimeoutMinutes} минут
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Информационная панель */}
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Как работают таймеры споров:
                  </p>
                  <ul className="space-y-1 text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                    <li>Когда открывается спор, у трейдера есть ограниченное время на ответ</li>
                    <li>Время зависит от текущей смены (дневная или ночная)</li>
                    <li>Если трейдер не отвечает в течение установленного времени, спор автоматически закрывается в пользу мерчанта</li>
                    <li>Таймер отображается в интерфейсе трейдера и обновляется в реальном времени</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={loading}
              className="bg-[#006039] hover:bg-[#006039]/90"
            >
              <Save className="h-4 w-4 mr-2" />
              Сохранить настройки
            </Button>
          </div>
        </div>
      </AuthLayout>
    </ProtectedRoute>
  )
}