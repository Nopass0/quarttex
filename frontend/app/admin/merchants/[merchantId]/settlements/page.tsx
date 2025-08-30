'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAdminAuth } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, DollarSign, Plus, Calendar, FileText } from 'lucide-react'
import { formatAmount } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface Settlement {
  id: string
  amount: number
  createdAt: string
  transactionCount?: number
}

interface Merchant {
  id: string
  name: string
  balanceUsdt: number
  countInRubEquivalent: boolean
}

export default function MerchantSettlementsPage() {
  const router = useRouter()
  const params = useParams()
  const merchantId = params.merchantId as string
  const { token: adminToken } = useAdminAuth()
  
  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSettleDialogOpen, setIsSettleDialogOpen] = useState(false)
  const [pendingAmount, setPendingAmount] = useState(0)

  useEffect(() => {
    fetchMerchantData()
    fetchSettlements()
  }, [merchantId])

  const fetchMerchantData = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/merchant/${merchantId}`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      
      if (!response.ok) throw new Error('Failed to fetch merchant')
      
      const data = await response.json()
      setMerchant(data)
    } catch (error) {
      toast.error('Не удалось загрузить данные мерчанта')
      router.push('/admin/merchants')
    }
  }

  const fetchSettlements = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/merchant/${merchantId}/settlements`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      
      if (!response.ok) throw new Error('Failed to fetch settlements')
      
      const data = await response.json()
      setSettlements(data.settlements || [])
      setPendingAmount(data.pendingAmount || 0)
    } catch (error) {
      toast.error('Не удалось загрузить сеттлы')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateSettlement = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/merchant/settle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({ id: merchantId }),
      })
      
      if (!response.ok) throw new Error('Failed to create settlement')
      
      setIsSettleDialogOpen(false)
      await fetchMerchantData()
      await fetchSettlements()
      toast.success('Сеттл успешно создан')
    } catch (error) {
      toast.error('Не удалось создать сеттл')
    } finally {
      setIsLoading(false)
    }
  }

  if (!merchant) return null

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin/merchants')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад к списку
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Сеттлы мерчанта</h1>
            <p className="text-gray-600 mt-1">{merchant.name}</p>
          </div>
          
          <Button
            onClick={() => setIsSettleDialogOpen(true)}
            className="bg-[#006039] hover:bg-[#005030]"
            disabled={isLoading || pendingAmount === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Создать сеттл
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Текущий баланс</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAmount(merchant.balanceUsdt)} USDT
            </div>
            <p className="text-xs text-muted-foreground">
              Доступно для вывода
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">К выводу</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAmount(pendingAmount)} USDT
            </div>
            <p className="text-xs text-muted-foreground">
              Готово к сеттлу
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего сеттлов</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{settlements.length}</div>
            <p className="text-xs text-muted-foreground">
              За все время
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>История сеттлов</CardTitle>
          <CardDescription>
            Список всех выполненных сеттлов для данного мерчанта
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Загрузка...</div>
          ) : settlements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Сеттлов пока нет
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Дата и время</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Транзакций</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements.map((settlement) => (
                  <TableRow key={settlement.id}>
                    <TableCell className="font-mono text-sm">
                      {settlement.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {format(new Date(settlement.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatAmount(settlement.amount)} USDT
                    </TableCell>
                    <TableCell>
                      {settlement.transactionCount || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Диалог подтверждения сеттла */}
      <Dialog open={isSettleDialogOpen} onOpenChange={setIsSettleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подтверждение сеттла</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите создать сеттл?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Мерчант:</span>
                <span className="font-medium">{merchant.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Сумма к выводу:</span>
                <span className="font-medium text-lg">{formatAmount(pendingAmount)} USDT</span>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mt-4">
              После подтверждения, указанная сумма будет списана с баланса мерчанта.
            </p>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSettleDialogOpen(false)}
              disabled={isLoading}
            >
              Отмена
            </Button>
            <Button
              onClick={handleCreateSettlement}
              className="bg-[#006039] hover:bg-[#005030]"
              disabled={isLoading}
            >
              Подтвердить сеттл
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}