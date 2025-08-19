'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Users, TrendingUp, Wallet } from 'lucide-react'
import { useAgentAuth } from '@/stores/agent-auth'
import agentApi from '@/services/agent-api'
import { formatAmount } from '@/lib/utils'
import { toast } from 'sonner'

type ProfileData = {
  agent: {
    id: string
    email: string
    name: string
    commissionRate: number
    trcWallet: string | null
    createdAt: string
  }
  teamSize: number
  teamVolume: number
  totalEarnings: number
  traders: Array<{
    id: string
    email: string
    name: string
    balanceUsdt: number
    balanceRub: number
    joinedAt: string
  }>
}

export default function AgentDashboard() {
  const { agent } = useAgentAuth()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setIsLoading(true)
      const response = await agentApi.get('/agent/profile')
      setProfileData(response.data)
    } catch (error) {
      toast.error('Не удалось загрузить данные профиля')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !profileData) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <RefreshCw className="h-8 w-8 animate-spin text-[#006039]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Обзор</h1>
          <p className="text-gray-600 mt-2">
            Обзор вашей команды и заработка
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={fetchProfile}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 text-[#006039] ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Процент комиссии</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#006039]">{profileData.agent.commissionRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Размер команды</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#006039]" />
              <span className="text-2xl font-bold">{profileData.teamSize}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Объем команды</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#006039]" />
              <span className="text-2xl font-bold">₽{formatAmount(profileData.teamVolume || 0)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Общий заработок</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-[#006039]" />
              <span className="text-2xl font-bold text-[#006039]">${formatAmount(profileData.totalEarnings || 0)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Информация о кошельке</CardTitle>
          <CardDescription>
            Ваш TRC-20 USDT кошелек для получения выплат
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profileData.agent.trcWallet ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">TRC-20 USDT адрес:</p>
              <p className="font-mono text-sm bg-gray-100 p-3 rounded">{profileData.agent.trcWallet}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Кошелек не указан</p>
              <Button 
                variant="outline" 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.href = '/agent/settings'
                  }
                }}
              >
                Указать кошелек
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ваша команда</CardTitle>
          <CardDescription>
            Трейдеры, привязанные к вашему аккаунту
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {profileData.traders.map((trader) => (
              <div key={trader.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">{trader.name}</div>
                  <div className="text-sm text-gray-500">{trader.email}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Присоединился: {new Date(trader.joinedAt).toLocaleDateString('ru-RU')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm">
                    <span className="text-gray-600">USDT:</span> ${formatAmount(trader.balanceUsdt || 0)}
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">RUB:</span> ₽{formatAmount(trader.balanceRub || 0)}
                  </div>
                </div>
              </div>
            ))}
            {profileData.traders.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                У вас пока нет трейдеров в команде
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}