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
import { toast } from 'sonner'
import { useAdminAuth } from '@/stores/auth'
import { Loader2 } from 'lucide-react'
import { TraderSettingsTabs, type TraderSettings, type DisplayRate } from '@/components/admin/trader-settings-tabs'

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

// Types are now imported from TraderSettingsTabs

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
  const [displayRates, setDisplayRates] = useState<DisplayRate[]>([
    { stakePercent: 0, amountFrom: 0, amountTo: 0 }
  ])

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
    // Загружаем отображаемые ставки
    if (formData?.displayRates && formData.displayRates.length > 0) {
      setDisplayRates(formData.displayRates)
    } else if (formData?.displayStakePercent || formData?.displayAmountFrom || formData?.displayAmountTo) {
      // Миграция со старой системы
      setDisplayRates([{
        stakePercent: formData.displayStakePercent || 0,
        amountFrom: formData.displayAmountFrom || 0,
        amountTo: formData.displayAmountTo || 0
      }])
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
          minPayoutAmount: formData.minPayoutAmount,
          maxPayoutAmount: formData.maxPayoutAmount,
          payoutRateDelta: formData.payoutRateDelta,
          payoutFeePercent: formData.payoutFeePercent,
          payoutAcceptanceTime: formData.payoutAcceptanceTime,
          teamId: formData.teamId,
          telegramChatId: formData.telegramChatId,
          telegramDisputeChatId: formData.telegramDisputeChatId,
          telegramBotToken: formData.telegramBotToken,
          rateSourceConfigId: formData.rateSourceConfigId,
          displayStakePercent: formData.displayStakePercent ?? null,
          displayAmountFrom: formData.displayAmountFrom ?? null,
          displayAmountTo: formData.displayAmountTo ?? null,
          minCheckAmount: formData.minCheckAmount,
          maxCheckAmount: formData.maxCheckAmount,
          displayRates: displayRates.filter(rate => rate.stakePercent > 0 && rate.amountFrom > 0 && rate.amountTo > 0),
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

  // Functions are now handled by TraderSettingsTabs component

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

        <TraderSettingsTabs
          settings={formData}
          onSettingsChange={setFormData}
          displayRates={displayRates}
          onDisplayRatesChange={setDisplayRates}
          agents={agents}
          onSave={handleSave}
          isSaving={isSaving}
          isLoading={isLoading}
        />

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}