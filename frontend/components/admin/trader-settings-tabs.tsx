'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RefreshCw, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export type DisplayRate = {
  id?: string
  stakePercent: number
  amountFrom: number
  amountTo: number
  sortOrder?: number
  isNew?: boolean
}

export type TraderSettings = {
  id: string
  email: string
  name: string
  minInsuranceDeposit: number
  maxInsuranceDeposit: number
  minAmountPerRequisite: number
  maxAmountPerRequisite: number
  disputeLimit: number
  maxSimultaneousPayouts: number
  minPayoutAmount: number
  maxPayoutAmount: number
  payoutRateDelta: number
  payoutFeePercent: number
  payoutAcceptanceTime: number
  teamId: string | null
  telegramChatId: string | null
  telegramDisputeChatId: string | null
  telegramBotToken: string | null
  rateSourceConfigId: string | null
  displayStakePercent?: number | null
  displayAmountFrom?: number | null
  displayAmountTo?: number | null
  displayRates?: DisplayRate[]
  team: {
    id: string
    name: string
    agentId: string
    agent: {
      id: string
      name: string
    }
  } | null
}

type Agent = {
  id: string
  name: string
  email: string
  teams?: Array<{
    id: string
    name: string
    agentId: string
  }>
}

interface TraderSettingsTabsProps {
  settings: TraderSettings | null
  onSettingsChange: (settings: TraderSettings) => void
  displayRates: DisplayRate[]
  onDisplayRatesChange: (rates: DisplayRate[]) => void
  agents: Agent[]
  onSave: () => Promise<void>
  isSaving: boolean
  isLoading: boolean
}

export function TraderSettingsTabs({
  settings,
  onSettingsChange,
  displayRates,
  onDisplayRatesChange,
  agents,
  onSave,
  isSaving,
  isLoading
}: TraderSettingsTabsProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(settings?.team?.agentId || '')

  if (!settings) return null

  const updateSettings = (updates: Partial<TraderSettings>) => {
    onSettingsChange({ ...settings, ...updates })
  }

  const addDisplayRate = () => {
    const newRate: DisplayRate = {
      stakePercent: 0,
      amountFrom: 0,
      amountTo: 0,
      isNew: true
    }
    onDisplayRatesChange([...displayRates, newRate])
  }

  const removeDisplayRate = (index: number) => {
    if (displayRates.length > 1) {
      onDisplayRatesChange(displayRates.filter((_, i) => i !== index))
    }
  }

  const updateDisplayRate = (index: number, field: keyof DisplayRate, value: number) => {
    const updated = [...displayRates]
    updated[index] = { ...updated[index], [field]: value }
    onDisplayRatesChange(updated)
  }

  const selectedAgent = agents.find(a => a.id === selectedAgentId)
  const availableTeams = selectedAgent?.teams || []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Настройки трейдера</CardTitle>
        <CardDescription>
          Изменение основных параметров и лимитов трейдера
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <Tabs defaultValue="basic" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Основные</TabsTrigger>
              <TabsTrigger value="limits">Лимиты</TabsTrigger>
              <TabsTrigger value="payouts">Выплаты</TabsTrigger>
              <TabsTrigger value="display">Отображение</TabsTrigger>
              <TabsTrigger value="telegram">Telegram</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    onChange={(e) => updateSettings({ email: e.target.value })}
                    className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Имя</Label>
                  <Input
                    id="name"
                    value={settings.name}
                    onChange={(e) => updateSettings({ name: e.target.value })}
                    className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Команда и агент</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="agent">Агент (тим-лид)</Label>
                    <Select
                      value={selectedAgentId || 'none'}
                      onValueChange={(value) => {
                        const agentId = value === 'none' ? '' : value
                        setSelectedAgentId(agentId)
                        updateSettings({ teamId: null })
                      }}
                    >
                      <SelectTrigger className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Выберите агента" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Без агента</SelectItem>
                        {agents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name} ({agent.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="team">Команда</Label>
                    <Select
                      value={settings.teamId || 'none'}
                      onValueChange={(value) => updateSettings({ teamId: value === 'none' ? null : value })}
                      disabled={!selectedAgentId}
                    >
                      <SelectTrigger className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Выберите команду" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Без команды</SelectItem>
                        {availableTeams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {settings.team && (
                  <p className="text-sm text-gray-500">
                    Текущая команда: {settings.team.name} (Агент: {settings.team.agent.name})
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="disputeLimit">Лимит одновременных споров</Label>
                <Input
                  id="disputeLimit"
                  type="number"
                  min="0"
                  value={settings.disputeLimit}
                  onChange={(e) => updateSettings({ disputeLimit: parseInt(e.target.value) || 0 })}
                  className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500">
                  При достижении этого количества споров, новые сделки не будут назначаться трейдеру
                </p>
              </div>
            </TabsContent>

            <TabsContent value="limits" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Страховые депозиты</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minInsuranceDeposit">Минимальный депозит ($)</Label>
                    <Input
                      id="minInsuranceDeposit"
                      type="number"
                      step="0.01"
                      value={settings.minInsuranceDeposit}
                      onChange={(e) => updateSettings({ minInsuranceDeposit: parseFloat(e.target.value) || 0 })}
                      className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxInsuranceDeposit">Максимальный депозит ($)</Label>
                    <Input
                      id="maxInsuranceDeposit"
                      type="number"
                      step="0.01"
                      value={settings.maxInsuranceDeposit}
                      onChange={(e) => updateSettings({ maxInsuranceDeposit: parseFloat(e.target.value) || 0 })}
                      className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Лимиты на реквизит</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minAmountPerRequisite">Минимальная сумма (₽)</Label>
                    <Input
                      id="minAmountPerRequisite"
                      type="number"
                      step="0.01"
                      value={settings.minAmountPerRequisite}
                      onChange={(e) => updateSettings({ minAmountPerRequisite: parseFloat(e.target.value) || 0 })}
                      className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxAmountPerRequisite">Максимальная сумма (₽)</Label>
                    <Input
                      id="maxAmountPerRequisite"
                      type="number"
                      step="0.01"
                      value={settings.maxAmountPerRequisite}
                      onChange={(e) => updateSettings({ maxAmountPerRequisite: parseFloat(e.target.value) || 0 })}
                      className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="payouts" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Настройки выплат</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minPayoutAmount">Минимальная сумма выплаты (₽)</Label>
                    <Input
                      id="minPayoutAmount"
                      type="number"
                      step="0.01"
                      value={settings.minPayoutAmount || 100}
                      onChange={(e) => updateSettings({ minPayoutAmount: parseFloat(e.target.value) || 100 })}
                      className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxPayoutAmount">Максимальная сумма выплаты (₽)</Label>
                    <Input
                      id="maxPayoutAmount"
                      type="number"
                      step="0.01"
                      value={settings.maxPayoutAmount || 1000000}
                      onChange={(e) => updateSettings({ maxPayoutAmount: parseFloat(e.target.value) || 1000000 })}
                      className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxSimultaneousPayouts">Макс. одновременных выплат</Label>
                    <Input
                      id="maxSimultaneousPayouts"
                      type="number"
                      min="1"
                      max="100"
                      value={settings.maxSimultaneousPayouts || 5}
                      onChange={(e) => updateSettings({ maxSimultaneousPayouts: parseInt(e.target.value) || 5 })}
                      className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500">
                      Количество активных выплат, которые трейдер может обрабатывать одновременно
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payoutAcceptanceTime">Время на принятие выплаты (мин)</Label>
                    <Input
                      id="payoutAcceptanceTime"
                      type="number"
                      min="1"
                      max="60"
                      value={settings.payoutAcceptanceTime || 5}
                      onChange={(e) => updateSettings({ payoutAcceptanceTime: parseInt(e.target.value) || 5 })}
                      className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Настройки ставок для выплат</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payoutRateDelta">Дельта курса (%)</Label>
                    <Input
                      id="payoutRateDelta"
                      type="number"
                      step="0.01"
                      min="-100"
                      max="100"
                      value={settings.payoutRateDelta || 0}
                      onChange={(e) => updateSettings({ payoutRateDelta: parseFloat(e.target.value) || 0 })}
                      className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500">
                      Процент изменения курса для выплат. Положительное значение увеличивает курс.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payoutFeePercent">Комиссия за выплаты (%)</Label>
                    <Input
                      id="payoutFeePercent"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={settings.payoutFeePercent || 0}
                      onChange={(e) => updateSettings({ payoutFeePercent: parseFloat(e.target.value) || 0 })}
                      className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500">
                      Комиссия с трейдера за каждую выплату
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="display" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Отображаемые ставки для трейдера</h3>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onDisplayRatesChange([{ stakePercent: 0, amountFrom: 0, amountTo: 0 }])
                        toast.info("Данные очищены")
                      }}
                      className="text-xs text-gray-600"
                    >
                      Очистить
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addDisplayRate}
                      className="text-xs"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Добавить ставку
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  {displayRates.map((rate, index) => (
                    <div key={index} className="grid grid-cols-4 gap-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 relative">
                      <div className="space-y-1">
                        <Label className="text-xs">Ставка (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={rate.stakePercent || ''}
                          onChange={(e) => updateDisplayRate(index, 'stakePercent', parseFloat(e.target.value) || 0)}
                          placeholder="2.5"
                          className="text-sm bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">От (₽)</Label>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          value={rate.amountFrom || ''}
                          onChange={(e) => updateDisplayRate(index, 'amountFrom', parseFloat(e.target.value) || 0)}
                          placeholder="5000"
                          className="text-sm bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">До (₽)</Label>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          value={rate.amountTo || ''}
                          onChange={(e) => updateDisplayRate(index, 'amountTo', parseFloat(e.target.value) || 0)}
                          placeholder="100000"
                          className="text-sm bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeDisplayRate(index)}
                          disabled={displayRates.length === 1}
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Эти значения отображаются в ЛК трейдера в таблице с курсами и лимитами.
                  <br />
                  <span className="text-green-600">💾 Данные автоматически сохраняются локально и восстанавливаются при перезагрузке</span>
                  <br />
                  <span className="text-blue-600">🔄 Нажмите "Сохранить настройки" для синхронизации с сервером</span>
                </p>
              </div>
            </TabsContent>

            <TabsContent value="telegram" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Telegram настройки</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telegramChatId">Telegram Chat ID</Label>
                    <Input
                      id="telegramChatId"
                      type="text"
                      placeholder="Например: -100123456789"
                      value={settings.telegramChatId || ""}
                      onChange={(e) => updateSettings({ telegramChatId: e.target.value })}
                      className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500">
                      ID чата для уведомлений о сделках
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telegramDisputeChatId">Telegram Dispute Chat ID</Label>
                    <Input
                      id="telegramDisputeChatId"
                      type="text"
                      placeholder="Например: -100987654321"
                      value={settings.telegramDisputeChatId || ""}
                      onChange={(e) => updateSettings({ telegramDisputeChatId: e.target.value })}
                      className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500">
                      ID чата для уведомлений о спорах
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telegramBotToken">Telegram Bot Token</Label>
                  <Input
                    id="telegramBotToken"
                    type="text"
                    placeholder="Например: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                    value={settings.telegramBotToken || ""}
                    onChange={(e) => updateSettings({ telegramBotToken: e.target.value })}
                    className="bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500">
                    Токен бота для отправки уведомлений
                  </p>
                </div>
              </div>
            </TabsContent>

            <div className="flex justify-end pt-6">
              <Button
                onClick={onSave}
                disabled={isSaving}
                className="bg-[#006039] hover:bg-[#006039]/90"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  "Сохранить настройки"
                )}
              </Button>
            </div>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}

