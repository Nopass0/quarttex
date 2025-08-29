'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, RefreshCw, Users, TrendingUp } from 'lucide-react'
import { useAdminAuth } from '@/stores/auth'
import { formatAmount } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"

type Trader = {
  id: string
  numericId: number
  email: string
  name: string
  balanceUsdt: number
  balanceRub: number
  activeRequisitesCount: number
  turnover: number
}

type Team = {
  id: string
  name: string
  agentId: string
  agent: {
    id: string
    name: string
    email: string
  }
  traders: Trader[]
  statistics: {
    totalTurnover: number
    totalActiveRequisites: number
    totalBalance: number
  }
  createdAt: string
}

function TeamDetailsContent() {
  const params = useParams()
  const router = useRouter()
  const { agentId, teamId } = params as { agentId: string; teamId: string }
  const { token: adminToken } = useAdminAuth()
  
  const [team, setTeam] = useState<Team | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchTeam()
  }, [teamId])

  const fetchTeam = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/agents/teams/${teamId}`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch team')
      const data = await response.json()
      setTeam(data)
    } catch (error) {
      toast.error('Не удалось загрузить данные команды')
      router.push(`/admin/agents/${agentId}`)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && !team) {
    return (
      <div className="flex justify-center items-center py-8">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!team) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/admin/agents/${agentId}`)}
        >
          <ArrowLeft className="h-4 w-4 text-[#006039]" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Команда: {team.name}</h1>
          <p className="text-gray-600 mt-1">
            Агент: {team.agent.name} ({team.agent.email})
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Трейдеров в команде</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#006039]" />
              <span className="text-2xl font-bold">{team.traders.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Общий оборот</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#006039]" />
              <span className="text-2xl font-bold">₽{formatAmount(team.statistics.totalTurnover)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Активные реквизиты</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="text-lg font-bold">
              {team.statistics.totalActiveRequisites}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Общий баланс</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">${formatAmount(team.statistics.totalBalance)}</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Трейдеры в команде</CardTitle>
          <CardDescription>
            Все трейдеры, входящие в команду {team.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>Список трейдеров команды</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Трейдер</TableHead>
                <TableHead>Баланс</TableHead>
                <TableHead>Оборот</TableHead>
                <TableHead>Реквизиты</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.traders.map((trader) => (
                <TableRow key={trader.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {trader.name} <span className="text-gray-400 text-sm">ID: {trader.numericId}</span>
                      </div>
                      <div className="text-sm text-gray-500">{trader.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm">${formatAmount(trader.balanceUsdt)}</div>
                      <div className="text-sm text-gray-500">₽{formatAmount(trader.balanceRub)}</div>
                    </div>
                  </TableCell>
                  <TableCell>₽{formatAmount(trader.turnover)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono">
                      {trader.activeRequisitesCount}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/admin/traders/${trader.id}`)}
                    >
                      Подробнее
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default function TeamDetailsPage() {
  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <TeamDetailsContent />
      </AuthLayout>
    </ProtectedRoute>
  )
}