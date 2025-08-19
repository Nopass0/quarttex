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

interface Withdrawal {
  id: string
  traderId: string
  amountUSDT: number
  walletAddress: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  balanceType: 'TRUST' | 'COMPENSATION' | 'PROFIT_DEALS' | 'PROFIT_PAYOUTS' | 'REFERRAL' | 'WORKING'
  txHash: string | null
  createdAt: string
  processedAt: string | null
  trader: {
    id: string
    name: string
    email: string
    trustBalance?: number
    deposit?: number
  }
}

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [stats, setStats] = useState({
    totalWithdrawals: 0,
    pendingWithdrawals: 0,
    completedWithdrawals: 0,
    totalAmount: 0
  })
  
  // Dialog states
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; withdrawal: Withdrawal | null }>({ open: false, withdrawal: null })
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; withdrawal: Withdrawal | null }>({ open: false, withdrawal: null })
  const [txHashInput, setTxHashInput] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [copiedTxHash, setCopiedTxHash] = useState<string | null>(null)

  useEffect(() => {
    fetchWithdrawals()
    fetchStats()
  }, [filter, typeFilter])

  const fetchWithdrawals = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (filter !== 'all') params.status = filter
      if (typeFilter !== 'all') params.balanceType = typeFilter
      const response = await adminApi.getWithdrawalRequests(params)
      setWithdrawals(response.data || [])
    } catch (error) {
      console.error('Failed to fetch withdrawals:', error)
      toast.error('Не удалось загрузить заявки на вывод')
      setWithdrawals([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await adminApi.getWithdrawalRequests({ status: undefined })
      if (response.data) {
        // Calculate stats from the data
        const pending = response.data.filter((w: Withdrawal) => w.status === 'PENDING' || w.status === 'PROCESSING').length
        const completed = response.data.filter((w: Withdrawal) => w.status === 'COMPLETED').length
        const totalAmount = response.data
          .filter((w: Withdrawal) => w.status === 'COMPLETED')
          .reduce((sum: number, w: Withdrawal) => sum + w.amountUSDT, 0)
        
        setStats({
          totalWithdrawals: response.data.length,
          pendingWithdrawals: pending,
          completedWithdrawals: completed,
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
    if (!confirmDialog.withdrawal || !txHashInput) return
    
    try {
      setProcessing(true)
      await adminApi.approveWithdrawal(confirmDialog.withdrawal.id, txHashInput)
      toast.success('Вывод успешно обработан')
      setConfirmDialog({ open: false, withdrawal: null })
      setTxHashInput('')
      fetchWithdrawals()
      fetchStats()
    } catch (error) {
      console.error('Failed to approve withdrawal:', error)
      toast.error('Не удалось обработать вывод')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!rejectDialog.withdrawal || !rejectReason) return
    
    try {
      setProcessing(true)
      await adminApi.rejectWithdrawal(rejectDialog.withdrawal.id, rejectReason)
      toast.success('Вывод отклонен')
      setRejectDialog({ open: false, withdrawal: null })
      setRejectReason('')
      fetchWithdrawals()
      fetchStats()
    } catch (error) {
      console.error('Failed to reject withdrawal:', error)
      toast.error('Не удалось отклонить вывод')
    } finally {
      setProcessing(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
      case 'PROCESSING':
        return <Clock className="h-4 w-4" />
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />
      case 'FAILED':
      case 'CANCELLED':
        return <XCircle className="h-4 w-4" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; label: string }> = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Ожидает' },
      PROCESSING: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Обработка' },
      COMPLETED: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Выполнен' },
      FAILED: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Ошибка' },
      CANCELLED: { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Отменен' },
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
            <h1 className="text-2xl font-semibold">Заявки на вывод</h1>
          </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Всего заявок</p>
            <p className="text-2xl font-bold">{stats.totalWithdrawals}</p>
          </div>
        </Card>
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Ожидают обработки</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pendingWithdrawals}</p>
          </div>
        </Card>
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Выполнено</p>
            <p className="text-2xl font-bold text-green-600">{stats.completedWithdrawals}</p>
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
                <SelectItem value="PROCESSING">В обработке</SelectItem>
                <SelectItem value="COMPLETED">Выполнены</SelectItem>
                <SelectItem value="FAILED">Ошибка</SelectItem>
                <SelectItem value="CANCELLED">Отменены</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label>Тип баланса:</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Выберите тип" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="TRUST">Основной баланс</SelectItem>
                <SelectItem value="COMPENSATION">Компенсация</SelectItem>
                <SelectItem value="PROFIT_DEALS">Прибыль со сделок</SelectItem>
                <SelectItem value="PROFIT_PAYOUTS">Прибыль с выплат</SelectItem>
                <SelectItem value="REFERRAL">Реферальный</SelectItem>
                <SelectItem value="WORKING">Рабочий</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Withdrawals Table */}
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
            ) : withdrawals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Заявки не найдены
                </TableCell>
              </TableRow>
            ) : (
              withdrawals.map((withdrawal) => (
                <TableRow key={withdrawal.id}>
                  {/* Status Icon */}
                  <TableCell>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      withdrawal.status === 'PENDING' ? 'bg-yellow-100' :
                      withdrawal.status === 'PROCESSING' ? 'bg-blue-100' :
                      withdrawal.status === 'COMPLETED' ? 'bg-green-100' :
                      withdrawal.status === 'FAILED' ? 'bg-red-100' :
                      'bg-gray-100'
                    }`}>
                      {getStatusIcon(withdrawal.status)}
                    </div>
                  </TableCell>
                  
                  {/* Trader */}
                  <TableCell>
                    <div>
                      <p className="font-medium">{withdrawal.trader.name}</p>
                      <p className="text-sm text-gray-500">{withdrawal.trader.email}</p>
                    </div>
                  </TableCell>
                  
                  {/* Amount & Address */}
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-lg">${withdrawal.amountUSDT.toFixed(2)}</p>
                        <Badge variant="outline" className="text-xs">
                          {withdrawal.balanceType === 'TRUST' ? 'Основной' : 
                           withdrawal.balanceType === 'COMPENSATION' ? 'Компенсация' :
                           withdrawal.balanceType === 'PROFIT_DEALS' ? 'Прибыль сделок' :
                           withdrawal.balanceType === 'PROFIT_PAYOUTS' ? 'Прибыль выплат' :
                           withdrawal.balanceType === 'REFERRAL' ? 'Реферальный' : 'Рабочий'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-sm text-gray-500 font-mono">
                          {withdrawal.walletAddress ? `${withdrawal.walletAddress.slice(0, 10)}...${withdrawal.walletAddress.slice(-8)}` : '—'}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 hover:bg-gray-100"
                          onClick={() => copyToClipboard(withdrawal.walletAddress, 'address')}
                        >
                          {copiedAddress === withdrawal.walletAddress ? (
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
                    {withdrawal.txHash ? (
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-sm">
                          {withdrawal.txHash.slice(0, 10)}...{withdrawal.txHash.slice(-8)}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 hover:bg-gray-100"
                          onClick={() => copyToClipboard(withdrawal.txHash!, 'txHash')}
                        >
                          {copiedTxHash === withdrawal.txHash ? (
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
                    {format(new Date(withdrawal.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru })}
                  </TableCell>
                  
                  {/* Actions */}
                  <TableCell>
                    {(withdrawal.status === 'PENDING' || withdrawal.status === 'PROCESSING') && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700"
                          onClick={() => setConfirmDialog({ open: true, withdrawal })}
                        >
                          Обработать
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => setRejectDialog({ open: true, withdrawal })}
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
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ open, withdrawal: confirmDialog.withdrawal })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Обработать вывод</DialogTitle>
            <DialogDescription>
              Подтвердите отправку {confirmDialog.withdrawal?.amountUSDT} USDT для {confirmDialog.withdrawal?.trader.name}
            </DialogDescription>
          </DialogHeader>
          {confirmDialog.withdrawal && (
            <div className="space-y-4">
              <div>
                <Label>Тип баланса</Label>
                <p className="font-medium">
                  {confirmDialog.withdrawal.balanceType === 'TRUST' ? 'Основной баланс' : 
                   confirmDialog.withdrawal.balanceType === 'COMPENSATION' ? 'Компенсационный баланс' :
                   confirmDialog.withdrawal.balanceType === 'PROFIT_DEALS' ? 'Прибыль со сделок' :
                   confirmDialog.withdrawal.balanceType === 'PROFIT_PAYOUTS' ? 'Прибыль с выплат' :
                   confirmDialog.withdrawal.balanceType === 'REFERRAL' ? 'Реферальный баланс' : 'Рабочий баланс'}
                </p>
              </div>
              <div>
                <Label>Сумма</Label>
                <p className="text-lg font-semibold">${confirmDialog.withdrawal.amountUSDT.toFixed(2)} USDT</p>
              </div>
              <div>
                <Label>Адрес получателя</Label>
                <p className="font-mono text-sm break-all">{confirmDialog.withdrawal.walletAddress}</p>
              </div>
              <div>
                <Label htmlFor="txHash">Transaction Hash *</Label>
                <Input
                  id="txHash"
                  value={txHashInput}
                  onChange={(e) => setTxHashInput(e.target.value)}
                  placeholder="Введите хеш транзакции"
                  className="font-mono"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDialog({ open: false, withdrawal: null })
                setTxHashInput('')
              }}
              disabled={processing}
            >
              Отмена
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!txHashInput || processing}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Обработка...
                </>
              ) : (
                'Подтвердить'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ open, withdrawal: rejectDialog.withdrawal })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отклонить вывод</DialogTitle>
            <DialogDescription>
              Отклонить заявку на вывод {rejectDialog.withdrawal?.amountUSDT} USDT от {rejectDialog.withdrawal?.trader.name}
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
              onClick={() => {
                setRejectDialog({ open: false, withdrawal: null })
                setRejectReason('')
              }}
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