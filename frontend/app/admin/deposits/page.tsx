"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { adminApi } from "@/services/api"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, CheckCircle, XCircle, Clock, AlertCircle, Copy, Check } from "lucide-react"

interface Deposit {
  id: string
  traderId: string
  amountUSDT: number
  address: string
  status: 'PENDING' | 'CHECKING' | 'CONFIRMED' | 'FAILED' | 'EXPIRED'
  type: 'BALANCE' | 'INSURANCE'
  txHash: string | null
  confirmations: number
  createdAt: string
  confirmedAt: string | null
  processedAt: string | null
  trader: {
    id: string
    name: string
    email: string
    trustBalance: number
  }
}

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [stats, setStats] = useState({
    totalDeposits: 0,
    pendingDeposits: 0,
    confirmedDeposits: 0,
    totalAmount: 0
  })
  
  // Dialog states
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; deposit: Deposit | null }>({ open: false, deposit: null })
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; deposit: Deposit | null }>({ open: false, deposit: null })
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [copiedTxHash, setCopiedTxHash] = useState<string | null>(null)

  useEffect(() => {
    fetchDeposits()
    fetchStats()
  }, [filter, typeFilter])

  const fetchDeposits = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (filter !== 'all') params.status = filter
      if (typeFilter !== 'all') params.type = typeFilter
      const response = await adminApi.getDepositRequests(params)
      setDeposits(response.data)
    } catch (error) {
      console.error('Failed to fetch deposits:', error)
      toast.error('Не удалось загрузить заявки на пополнение')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await adminApi.getDepositRequests({ status: undefined })
      if (response.data) {
        // Calculate stats from the data
        const pending = response.data.filter((d: Deposit) => d.status === 'PENDING' || d.status === 'CHECKING').length
        const confirmed = response.data.filter((d: Deposit) => d.status === 'CONFIRMED').length
        const totalAmount = response.data
          .filter((d: Deposit) => d.status === 'CONFIRMED')
          .reduce((sum: number, d: Deposit) => sum + d.amountUSDT, 0)
        
        setStats({
          totalDeposits: response.data.length,
          pendingDeposits: pending,
          confirmedDeposits: confirmed,
          totalAmount
        })
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const copyToClipboard = (text: string, type: 'address' | 'txHash') => {
    navigator.clipboard.writeText(text)
    if (type === 'address') {
      setCopiedAddress(text)
      setTimeout(() => setCopiedAddress(null), 2000)
    } else {
      setCopiedTxHash(text)
      setTimeout(() => setCopiedTxHash(null), 2000)
    }
    toast.success('Скопировано в буфер обмена')
  }

  const handleConfirm = async () => {
    if (!confirmDialog.deposit) return
    
    try {
      setProcessing(true)
      await adminApi.confirmDeposit(confirmDialog.deposit.id, confirmDialog.deposit.txHash || '')
      toast.success('Депозит успешно подтвержден')
      setConfirmDialog({ open: false, deposit: null })
      fetchDeposits()
      fetchStats()
    } catch (error) {
      console.error('Failed to confirm deposit:', error)
      toast.error('Не удалось подтвердить депозит')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!rejectDialog.deposit || !rejectReason) return
    
    try {
      setProcessing(true)
      await adminApi.rejectDeposit(rejectDialog.deposit.id, rejectReason)
      toast.success('Депозит отклонен')
      setRejectDialog({ open: false, deposit: null })
      setRejectReason('')
      fetchDeposits()
      fetchStats()
    } catch (error) {
      console.error('Failed to reject deposit:', error)
      toast.error('Не удалось отклонить депозит')
    } finally {
      setProcessing(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
      case 'CHECKING':
        return <Clock className="h-4 w-4" />
      case 'CONFIRMED':
        return <CheckCircle className="h-4 w-4" />
      case 'FAILED':
        return <XCircle className="h-4 w-4" />
      case 'EXPIRED':
        return <AlertCircle className="h-4 w-4" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; label: string }> = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Ожидает' },
      CHECKING: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Проверка' },
      CONFIRMED: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Подтвержден' },
      FAILED: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Отклонен' },
      EXPIRED: { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Истек' },
    }
    
    const variant = variants[status] || variants.PENDING
    
    return (
      <Badge className={`${variant.color} flex items-center gap-1`}>
        {getStatusIcon(status)}
        {variant.label}
      </Badge>
    )
  }

  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Заявки на пополнение</h1>
          </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Всего заявок</p>
            <p className="text-2xl font-bold">{stats.totalDeposits}</p>
          </div>
        </Card>
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Ожидают подтверждения</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pendingDeposits}</p>
          </div>
        </Card>
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Подтверждено</p>
            <p className="text-2xl font-bold text-green-600">{stats.confirmedDeposits}</p>
          </div>
        </Card>
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Общая сумма</p>
            <p className="text-2xl font-bold">${stats.totalAmount.toFixed(2)}</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label>Фильтр по статусу:</Label>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Выберите статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="PENDING">Ожидают</SelectItem>
                <SelectItem value="CHECKING">Проверка</SelectItem>
                <SelectItem value="CONFIRMED">Подтверждены</SelectItem>
                <SelectItem value="FAILED">Отклонены</SelectItem>
                <SelectItem value="EXPIRED">Истекли</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label>Тип:</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Выберите тип" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="BALANCE">Баланс</SelectItem>
                <SelectItem value="INSURANCE">Депозит</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Deposits Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Статус</TableHead>
              <TableHead>Трейдер</TableHead>
              <TableHead>Сумма / Адрес</TableHead>
              <TableHead>TX Hash</TableHead>
              <TableHead>Дата создания</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : deposits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Заявки не найдены
                </TableCell>
              </TableRow>
            ) : (
              deposits.map((deposit) => (
                <TableRow key={deposit.id}>
                  {/* Status Icon */}
                  <TableCell>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      deposit.status === 'PENDING' ? 'bg-yellow-100' :
                      deposit.status === 'CHECKING' ? 'bg-blue-100' :
                      deposit.status === 'CONFIRMED' ? 'bg-green-100' :
                      deposit.status === 'FAILED' ? 'bg-red-100' :
                      'bg-gray-100'
                    }`}>
                      {getStatusIcon(deposit.status)}
                    </div>
                  </TableCell>
                  
                  {/* Trader */}
                  <TableCell>
                    <div>
                      <p className="font-medium">{deposit.trader.name}</p>
                      <p className="text-sm text-gray-500">{deposit.trader.email}</p>
                    </div>
                  </TableCell>
                  
                  {/* Amount & Address */}
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-lg">${deposit.amountUSDT.toFixed(2)}</p>
                        <Badge variant="outline" className="text-xs">
                          {deposit.type === 'INSURANCE' ? 'Депозит' : 'Баланс'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-sm text-gray-500 font-mono">
                          {deposit.address.slice(0, 10)}...{deposit.address.slice(-8)}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 hover:bg-gray-100"
                          onClick={() => copyToClipboard(deposit.address, 'address')}
                        >
                          {copiedAddress === deposit.address ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                  
                  {/* TX Hash */}
                  <TableCell>
                    {deposit.txHash ? (
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-sm">{deposit.txHash}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 hover:bg-gray-100"
                          onClick={() => copyToClipboard(deposit.txHash!, 'txHash')}
                        >
                          {copiedTxHash === deposit.txHash ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  
                  {/* Date */}
                  <TableCell>
                    {format(new Date(deposit.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru })}
                  </TableCell>
                  
                  {/* Actions */}
                  <TableCell>
                    {(deposit.status === 'PENDING' || deposit.status === 'CHECKING') && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700"
                          onClick={() => setConfirmDialog({ open: true, deposit })}
                        >
                          Подтвердить
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => setRejectDialog({ open: true, deposit })}
                        >
                          Отклонить
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ open, deposit: confirmDialog.deposit })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подтвердить депозит</DialogTitle>
            <DialogDescription>
              Подтвердите получение {confirmDialog.deposit?.amountUSDT} USDT от {confirmDialog.deposit?.trader.name}
            </DialogDescription>
          </DialogHeader>
          {confirmDialog.deposit && (
            <div className="space-y-4">
              <div>
                <Label>Тип пополнения</Label>
                <p className="font-medium">{confirmDialog.deposit.type === 'INSURANCE' ? 'Депозитный баланс' : 'Баланс'}</p>
              </div>
              <div>
                <Label>Сумма</Label>
                <p className="text-lg font-semibold">${confirmDialog.deposit.amountUSDT.toFixed(2)} USDT</p>
              </div>
              <div>
                <Label>Адрес кошелька</Label>
                <p className="font-mono text-sm break-all">{confirmDialog.deposit.address}</p>
              </div>
              <div>
                <Label>Transaction Hash</Label>
                <p className="font-mono text-sm break-all">{confirmDialog.deposit.txHash || '—'}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, deposit: null })}
              disabled={processing}
            >
              Отмена
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Подтверждение...
                </>
              ) : (
                'Подтвердить'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ open, deposit: rejectDialog.deposit })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отклонить депозит</DialogTitle>
            <DialogDescription>
              Отклонить заявку на {rejectDialog.deposit?.amountUSDT} USDT от {rejectDialog.deposit?.trader.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Причина отклонения</Label>
              <Textarea
                id="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Укажите причину отклонения"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialog({ open: false, deposit: null })}
              disabled={processing}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason || processing}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Отклонение...
                </>
              ) : (
                'Отклонить'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
      </AuthLayout>
    </ProtectedRoute>
  )
}