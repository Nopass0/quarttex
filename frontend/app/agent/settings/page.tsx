'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RefreshCw, Save, User, Wallet, Key } from 'lucide-react'
import { useAgentAuth } from '@/stores/agent-auth'
import agentApi from '@/services/agent-api'
import { toast } from 'sonner'

type AgentSettings = {
  name: string
  email: string
  trcWallet: string | null
  commissionRate: number
  createdAt: string
  totalEarnings: number
  teamSize: number
}

export default function AgentSettingsPage() {
  const { agent } = useAgentAuth()
  const [settings, setSettings] = useState<AgentSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    trcWallet: '',
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    if (settings) {
      setFormData({
        name: settings.name,
        trcWallet: settings.trcWallet || '',
      })
    }
  }, [settings])

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      const response = await agentApi.get('/agent/profile')
      setSettings({
        ...response.data.agent,
        totalEarnings: response.data.totalEarnings,
        teamSize: response.data.teamSize,
      })
    } catch (error) {
      toast.error('Не удалось загрузить настройки')
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setIsSaving(true)
      await agentApi.put('/agent/profile', {
        name: formData.name,
        trcWallet: formData.trcWallet || null,
      })
      toast.success('Настройки сохранены')
      fetchSettings()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка при сохранении')
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <RefreshCw className="h-8 w-8 animate-spin text-[#006039]" />
      </div>
    )
  }

  if (!settings) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Настройки</h1>
          <p className="text-gray-600 mt-2">
            Управление профилем и настройками аккаунта
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={fetchSettings}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 text-[#006039] ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-[#006039]" />
              Профиль агента
            </CardTitle>
            <CardDescription>
              Основная информация о вашем аккаунте
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Введите ваше имя"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={settings.email}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">Email нельзя изменить</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="commission">Процент комиссии</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="commission"
                  value={`${settings.commissionRate}%`}
                  disabled
                  className="bg-gray-50"
                />
                <div className="text-xs text-gray-500">
                  Устанавливается администрацией
                </div>
              </div>
            </div>

            <Button
              onClick={saveSettings}
              disabled={isSaving}
              className="w-full bg-[#006039] hover:bg-[#006039]/90"
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin text-white" />
              ) : (
                <Save className="h-4 w-4 mr-2 text-white" />
              )}
              Сохранить профиль
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-[#006039]" />
              Настройки выплат
            </CardTitle>
            <CardDescription>
              Кошелек для получения выплат
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="trcWallet">TRC-20 USDT адрес</Label>
              <Input
                id="trcWallet"
                value={formData.trcWallet}
                onChange={(e) => handleInputChange('trcWallet', e.target.value)}
                placeholder="Введите адрес TRC-20 кошелька"
              />
              <p className="text-xs text-gray-500">
                На этот адрес будут приходить выплаты комиссий
              </p>
            </div>

            {settings.trcWallet && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  ✓ Кошелек для выплат настроен
                </p>
              </div>
            )}

            {!settings.trcWallet && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠ Кошелек не настроен. Выплаты невозможны.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Статистика аккаунта</CardTitle>
          <CardDescription>
            Основные показатели вашего аккаунта
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-[#006039]">
                ${(settings.totalEarnings || 0).toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Общий заработок</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold">{settings.teamSize}</div>
              <div className="text-sm text-gray-600">Размер команды</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold">{settings.commissionRate}%</div>
              <div className="text-sm text-gray-600">Процент комиссии</div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm text-gray-500">
              Аккаунт создан: {new Date(settings.createdAt).toLocaleDateString('ru-RU')}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}