'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useAdminAuth } from '@/stores/auth'
import { Loader2 } from 'lucide-react'

type Agent = {
  id: string
  name: string
  email: string
  teams: Team[]
}

type Team = {
  id: string
  name: string
  agentId: string
}

type TraderSettings = {
  id: string
  email: string
  name: string
  minInsuranceDeposit: number
  maxInsuranceDeposit: number
  minAmountPerRequisite: number
  maxAmountPerRequisite: number
  disputeLimit: number
  maxSimultaneousPayouts: number
  teamId: string | null
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

interface TraderSettingsDialogProps {
  traderId: string
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export function TraderSettingsDialog({ traderId, isOpen, onClose, onUpdate }: TraderSettingsDialogProps) {
  const { token: adminToken } = useAdminAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [formData, setFormData] = useState<TraderSettings | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchTraderSettings()
      fetchAgents()
    }
  }, [isOpen, traderId])

  useEffect(() => {
    if (formData?.team?.agentId) {
      setSelectedAgentId(formData.team.agentId)
    }
  }, [formData])

  const fetchTraderSettings = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/traders/${traderId}/full`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch trader settings')
      const data = await response.json()
      setFormData(data)
    } catch (error) {
      toast.error('Не удалось загрузить настройки трейдера')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAgents = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/agents/teams`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch agents')
      const data = await response.json()
      setAgents(data)
    } catch (error) {
      toast.error('Не удалось загрузить список агентов')
    }
  }

  const handleSave = async () => {
    if (!formData) return

    try {
      setIsSaving(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/traders/${traderId}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          minInsuranceDeposit: formData.minInsuranceDeposit,
          maxInsuranceDeposit: formData.maxInsuranceDeposit,
          minAmountPerRequisite: formData.minAmountPerRequisite,
          maxAmountPerRequisite: formData.maxAmountPerRequisite,
          disputeLimit: formData.disputeLimit,
          maxSimultaneousPayouts: formData.maxSimultaneousPayouts,
          teamId: formData.teamId,
        }),
      })

      if (!response.ok) throw new Error('Failed to update settings')

      toast.success('Настройки успешно обновлены')
      onUpdate()
      onClose()
    } catch (error) {
      toast.error('Не удалось обновить настройки')
    } finally {
      setIsSaving(false)
    }
  }

  const selectedAgent = agents.find(a => a.id === selectedAgentId)
  const availableTeams = selectedAgent?.teams || []

  if (!formData) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Настройки трейдера</DialogTitle>
          <DialogDescription>
            Изменение основных параметров и лимитов трейдера
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Имя</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Страховые депозиты</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minInsuranceDeposit">Минимальный депозит ($)</Label>
                  <Input
                    id="minInsuranceDeposit"
                    type="number"
                    step="0.01"
                    value={formData.minInsuranceDeposit}
                    onChange={(e) => setFormData({ ...formData, minInsuranceDeposit: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxInsuranceDeposit">Максимальный депозит ($)</Label>
                  <Input
                    id="maxInsuranceDeposit"
                    type="number"
                    step="0.01"
                    value={formData.maxInsuranceDeposit}
                    onChange={(e) => setFormData({ ...formData, maxInsuranceDeposit: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Лимиты на реквизит</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minAmountPerRequisite">Минимальная сумма (₽)</Label>
                  <Input
                    id="minAmountPerRequisite"
                    type="number"
                    step="0.01"
                    value={formData.minAmountPerRequisite}
                    onChange={(e) => setFormData({ ...formData, minAmountPerRequisite: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxAmountPerRequisite">Максимальная сумма (₽)</Label>
                  <Input
                    id="maxAmountPerRequisite"
                    type="number"
                    step="0.01"
                    value={formData.maxAmountPerRequisite}
                    onChange={(e) => setFormData({ ...formData, maxAmountPerRequisite: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="disputeLimit">Лимит одновременных споров</Label>
              <Input
                id="disputeLimit"
                type="number"
                min="0"
                value={formData.disputeLimit}
                onChange={(e) => setFormData({ ...formData, disputeLimit: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-gray-500">
                При достижении этого количества споров, новые сделки не будут назначаться трейдеру
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxSimultaneousPayouts">Максимальное количество выплат для проверки</Label>
              <Input
                id="maxSimultaneousPayouts"
                type="number"
                min="1"
                value={formData.maxSimultaneousPayouts}
                onChange={(e) => setFormData({ ...formData, maxSimultaneousPayouts: parseInt(e.target.value) || 5 })}
              />
              <p className="text-xs text-gray-500">
                Максимальное количество выплат, которые можно брать на проверку одновременно
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Команда и агент</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agent">Агент (тим-лид)</Label>
                  <Select
                    value={selectedAgentId || 'none'}
                    onValueChange={(value) => {
                      const agentId = value === 'none' ? '' : value
                      setSelectedAgentId(agentId)
                      setFormData({ ...formData, teamId: null })
                    }}
                  >
                    <SelectTrigger>
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
                    value={formData.teamId || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, teamId: value === 'none' ? null : value })}
                    disabled={!selectedAgentId}
                  >
                    <SelectTrigger>
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
              {formData.team && (
                <p className="text-sm text-gray-500">
                  Текущая команда: {formData.team.name} (Агент: {formData.team.agent.name})
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              'Сохранить'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
