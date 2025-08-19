'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { adminApi } from '@/services/api'
import { Loader2, Save, Wallet, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface SystemConfig {
  key: string
  value: string
}

const CONFIG_LABELS: Record<string, string> = {
  deposit_wallet_address: 'Адрес кошелька для пополнений (USDT TRC-20)',
  min_deposit_amount: 'Минимальная сумма пополнения (USDT)',
  deposit_confirmations_required: 'Количество подтверждений для депозита',
  deposit_expiry_minutes: 'Время действия заявки на пополнение (минуты)',
  min_withdrawal_amount: 'Минимальная сумма вывода (USDT)',
  kkk_percent: 'Процент ККК',
  rate_margin: 'Маржа курса (%)',
  default_rate: 'Курс по умолчанию (RUB/USDT)',
  maintenance_mode: 'Режим обслуживания',
  registration_enabled: 'Регистрация новых пользователей',
}

const CONFIG_DESCRIPTIONS: Record<string, string> = {
  deposit_wallet_address: 'Адрес кошелька, на который трейдеры будут отправлять USDT для пополнения баланса',
  min_deposit_amount: 'Минимальная сумма, которую можно внести на баланс',
  deposit_confirmations_required: 'Количество подтверждений в блокчейне для зачисления средств',
  deposit_expiry_minutes: 'Время, в течение которого действует заявка на пополнение',
  min_withdrawal_amount: 'Минимальная сумма, которую можно вывести с баланса',
  kkk_percent: 'Коэффициент корректировки курса для всех транзакций',
  rate_margin: 'Дополнительная маржа к курсу обмена',
  default_rate: 'Используется, если не удается получить курс от источника',
  maintenance_mode: 'Отключает все операции для проведения технических работ',
  registration_enabled: 'Разрешить регистрацию новых трейдеров и мерчантов',
}

export function SystemSettingsList() {
  const [configs, setConfigs] = useState<SystemConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editedValues, setEditedValues] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchConfigs()
  }, [])

  const fetchConfigs = async () => {
    try {
      const response = await adminApi.getSystemConfigs()
      const configsData = response.data || response
      
      // Ensure all expected configs exist
      const existingKeys = configsData.map((c: SystemConfig) => c.key)
      const allConfigs = Object.keys(CONFIG_LABELS).map(key => {
        const existing = configsData.find((c: SystemConfig) => c.key === key)
        return existing || { key, value: getDefaultValue(key) }
      })
      
      setConfigs(allConfigs)
      
      // Initialize edited values
      const values: Record<string, string> = {}
      allConfigs.forEach(config => {
        values[config.key] = config.value
      })
      setEditedValues(values)
    } catch (error) {
      console.error('Failed to fetch configs:', error)
      toast.error('Не удалось загрузить настройки')
    } finally {
      setLoading(false)
    }
  }

  const getDefaultValue = (key: string): string => {
    switch (key) {
      case 'min_deposit_amount': return '50'
      case 'deposit_confirmations_required': return '1'
      case 'deposit_expiry_minutes': return '30'
      case 'min_withdrawal_amount': return '50'
      case 'kkk_percent': return '5'
      case 'rate_margin': return '0'
      case 'default_rate': return '100'
      case 'maintenance_mode': return 'false'
      case 'registration_enabled': return 'true'
      default: return ''
    }
  }

  const handleSave = async (key: string) => {
    setSaving(key)
    try {
      await adminApi.updateSystemConfig({
        key,
        value: editedValues[key]
      })
      
      // Update local state
      setConfigs(configs.map(c => 
        c.key === key ? { ...c, value: editedValues[key] } : c
      ))
      
      toast.success('Настройка сохранена')
    } catch (error: any) {
      console.error('Failed to save config:', error)
      toast.error(error.response?.data?.error || 'Ошибка сохранения настройки')
    } finally {
      setSaving(null)
    }
  }

  const handleChange = (key: string, value: string) => {
    setEditedValues({ ...editedValues, [key]: value })
  }

  const renderInput = (config: SystemConfig) => {
    const isBooleanField = ['maintenance_mode', 'registration_enabled'].includes(config.key)
    const hasChanged = editedValues[config.key] !== config.value

    if (isBooleanField) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{CONFIG_LABELS[config.key]}</Label>
              <p className="text-sm text-muted-foreground">
                {CONFIG_DESCRIPTIONS[config.key]}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={editedValues[config.key] === 'true'}
                onCheckedChange={(checked) => handleChange(config.key, checked.toString())}
              />
              {hasChanged && (
                <Button
                  size="sm"
                  onClick={() => handleSave(config.key)}
                  disabled={saving === config.key}
                >
                  {saving === config.key ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-2">
        <Label>{CONFIG_LABELS[config.key]}</Label>
        <p className="text-sm text-muted-foreground">
          {CONFIG_DESCRIPTIONS[config.key]}
        </p>
        <div className="flex gap-2">
          <Input
            value={editedValues[config.key] || ''}
            onChange={(e) => handleChange(config.key, e.target.value)}
            placeholder={getDefaultValue(config.key)}
            className="font-mono"
          />
          {hasChanged && (
            <Button
              size="sm"
              onClick={() => handleSave(config.key)}
              disabled={saving === config.key}
            >
              {saving === config.key ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </Card>
    )
  }

  // Filter configs by category
  const walletConfigs = configs.filter(c => c.key.includes('deposit'))
  const withdrawalConfigs = configs.filter(c => c.key.includes('withdrawal'))
  const otherConfigs = configs.filter(c => !c.key.includes('deposit') && !c.key.includes('withdrawal'))

  return (
    <div className="space-y-6">
      {/* Wallet Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-semibold">Настройки кошелька для пополнений</h2>
        </div>
        
        {editedValues.deposit_wallet_address && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Убедитесь, что адрес кошелька указан правильно. Неверный адрес приведет к потере средств.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-4">
          {walletConfigs.map(config => (
            <div key={config.key}>
              {renderInput(config)}
            </div>
          ))}
        </div>
      </Card>

      {/* Withdrawal Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Настройки вывода средств</h2>
        </div>
        
        <div className="space-y-4">
          {withdrawalConfigs.map(config => (
            <div key={config.key}>
              {renderInput(config)}
            </div>
          ))}
        </div>
      </Card>

    </div>
  )
}