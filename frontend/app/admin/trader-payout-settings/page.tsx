'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AuthLayout } from '@/components/layouts/auth-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { adminApi as api } from '@/services/api'
import { Settings, Save, Loader2, AlertCircle, Search, Edit2, Users } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatAmount } from '@/lib/utils'

interface Trader {
  id: string
  numericId: number
  email: string
  maxSimultaneousPayouts: number
  payoutBalance: number
  frozenPayoutBalance: number
  activePayouts: number
  trafficEnabled: boolean
  banned: boolean
}

export default function TraderPayoutSettingsPage() {
  const [traders, setTraders] = useState<Trader[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedTrader, setSelectedTrader] = useState<Trader | null>(null)
  const [newLimit, setNewLimit] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadTraders()
  }, [])

  const loadTraders = async () => {
    setIsLoading(true)
    try {
      const response = await api.get('/admin/traders')
      const tradersData = response.data.traders || []
      
      // Load payout stats for each trader
      const tradersWithStats = await Promise.all(
        tradersData.map(async (trader: any) => {
          try {
            const statsResponse = await api.get(`/admin/traders/${trader.id}/payout-stats`)
            return {
              ...trader,
              activePayouts: statsResponse.data.activePayouts || 0
            }
          } catch {
            return {
              ...trader,
              activePayouts: 0
            }
          }
        })
      )
      
      setTraders(tradersWithStats)
    } catch (error: any) {
      toast.error('Ошибка загрузки трейдеров')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditLimit = (trader: Trader) => {
    setSelectedTrader(trader)
    setNewLimit(trader.maxSimultaneousPayouts.toString())
  }

  const handleSaveLimit = async () => {
    if (!selectedTrader) return

    const limit = parseInt(newLimit)
    if (isNaN(limit) || limit < 1) {
      toast.error('Лимит должен быть положительным числом')
      return
    }

    setIsSaving(true)
    try {
      await api.put(`/admin/traders/${selectedTrader.id}/payout-limit`, {
        maxSimultaneousPayouts: limit
      })
      
      toast.success('Лимит выплат обновлен')
      setSelectedTrader(null)
      loadTraders()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка сохранения')
    } finally {
      setIsSaving(false)
    }
  }

  const filteredTraders = traders.filter(trader => 
    trader.email.toLowerCase().includes(search.toLowerCase()) ||
    trader.numericId.toString().includes(search)
  )

  if (isLoading) {
    return (
      <ProtectedRoute variant="admin">
        <AuthLayout variant="admin">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </AuthLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <div className="space-y-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="h-8 w-8" />
              Настройки лимитов выплат трейдеров
            </h1>
            <p className="text-gray-600 mt-2">
              Управление индивидуальными лимитами выплат для каждого трейдера
            </p>
          </div>

          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Важно:</strong> Лимит определяет максимальное количество одновременных активных выплат (статус ACTIVE) для трейдера. 
              Если трейдер достиг лимита, он не сможет принять новые выплаты, и они не будут ему показаны.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Фильтр</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Поиск по email или ID"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button variant="outline">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Трейдеры</CardTitle>
              <CardDescription>
                Всего трейдеров: {filteredTraders.length}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Баланс выплат</TableHead>
                      <TableHead>Заморожено</TableHead>
                      <TableHead>Активных выплат</TableHead>
                      <TableHead>Лимит выплат</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTraders.map((trader) => (
                      <TableRow key={trader.id}>
                        <TableCell className="font-mono">
                          {trader.numericId}
                        </TableCell>
                        <TableCell>{trader.email}</TableCell>
                        <TableCell>
                          {formatAmount(trader.payoutBalance)} ₽
                        </TableCell>
                        <TableCell>
                          {formatAmount(trader.frozenPayoutBalance)} ₽
                        </TableCell>
                        <TableCell>
                          <Badge variant={trader.activePayouts >= trader.maxSimultaneousPayouts ? 'destructive' : 'default'}>
                            {trader.activePayouts} / {trader.maxSimultaneousPayouts}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {trader.maxSimultaneousPayouts}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {trader.banned && (
                              <Badge variant="destructive">Забанен</Badge>
                            )}
                            {!trader.trafficEnabled && (
                              <Badge variant="secondary">Трафик выкл</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditLimit(trader)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Dialog open={!!selectedTrader} onOpenChange={() => setSelectedTrader(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Изменить лимит выплат</DialogTitle>
                <DialogDescription>
                  Трейдер: {selectedTrader?.email} ({selectedTrader?.numericId})
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="limit">Максимум одновременных активных выплат</Label>
                  <Input
                    id="limit"
                    type="number"
                    min="1"
                    max="100"
                    value={newLimit}
                    onChange={(e) => setNewLimit(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Текущий лимит: {selectedTrader?.maxSimultaneousPayouts}
                  </p>
                  <p className="text-xs text-gray-500">
                    Активных выплат сейчас: {selectedTrader?.activePayouts}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedTrader(null)}>
                  Отмена
                </Button>
                <Button onClick={handleSaveLimit} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Сохранить
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </AuthLayout>
    </ProtectedRoute>
  )
}