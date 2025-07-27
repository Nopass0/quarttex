'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AuthLayout } from '@/components/layouts/auth-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { adminApi as api } from '@/services/api'
import { formatAmount, formatDate } from '@/lib/utils'
import { 
  DollarSign, 
  Search, 
  Loader2, 
  Download,
  Eye,
  Settings,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Check,
  X
} from 'lucide-react'

interface Payout {
  id: string
  numericId: number
  amount: number
  amountUsdt: number
  total: number
  totalUsdt: number
  rate: number
  rateDelta: number
  feePercent: number
  wallet: string
  bank: string
  isCard: boolean
  status: string
  direction: string
  expireAt: string
  createdAt: string
  acceptedAt?: string
  confirmedAt?: string
  cancelledAt?: string
  traderId?: string
  merchantId: string
  externalReference?: string
  cancelReason?: string
  disputeMessage?: string
  proofFiles?: string[]
  cancellationHistory?: Array<{
    id: string
    reason: string
    reasonCode?: string | null
    files: string[]
    createdAt: string
    trader: {
      id: string
      name: string
      email: string
    }
  }>
  merchant?: {
    name: string
  }
  trader?: {
    numericId: number
    email: string
  }
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  CREATED: { label: 'Создан', color: 'bg-blue-100 text-blue-800', icon: Clock },
  ACTIVE: { label: 'Активен', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  CHECKING: { label: 'Проверка', color: 'bg-purple-100 text-purple-800', icon: Eye },
  COMPLETED: { label: 'Завершен', color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
  CANCELLED: { label: 'Отменен', color: 'bg-red-100 text-red-800', icon: XCircle },
  EXPIRED: { label: 'Истек', color: 'bg-gray-100 text-gray-800', icon: Clock },
  DISPUTED: { label: 'Спор', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
}

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [directionFilter, setDirectionFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [reviewDialog, setReviewDialog] = useState<{open: boolean, payout: Payout | null, action: 'approve' | 'reject'}>({
    open: false,
    payout: null,
    action: 'approve'
  })
  const [rejectReason, setRejectReason] = useState('')
  const [testPayoutDialog, setTestPayoutDialog] = useState(false)
  const [testPayoutLoading, setTestPayoutLoading] = useState(false)

  useEffect(() => {
    loadPayouts()
  }, [statusFilter, directionFilter, currentPage, activeTab])

  const loadPayouts = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        limit: '20',
        page: currentPage.toString(),
      })
      
      // Apply status filter based on active tab
      let status = statusFilter
      if (activeTab === 'checking') {
        status = 'CHECKING'
      } else if (activeTab === 'disputed') {
        status = 'DISPUTED'
      } else if (activeTab === 'history') {
        status = 'COMPLETED,CANCELLED'
      } else if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      
      if (status !== 'all' && status) {
        params.append('status', status)
      }
      
      if (directionFilter !== 'all') {
        params.append('direction', directionFilter)
      }
      
      if (search) {
        params.append('search', search)
      }

      const response = await api.getPayouts(Object.fromEntries(params))
      console.log('Payouts response:', response) // Debug log
      setPayouts(response.data || [])
      setTotalPages(response.meta?.totalPages || 1)
    } catch (error: any) {
      toast.error('Ошибка загрузки выплат')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    loadPayouts()
  }

  const getStatusIcon = (status: string) => {
    const config = statusConfig[status]
    const Icon = config?.icon || FileText
    return <Icon className="h-4 w-4" />
  }

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
    return (
      <Badge className={`${config.color} gap-1`}>
        {getStatusIcon(status)}
        {config.label}
      </Badge>
    )
  }

  const handleCreateTestPayouts = async (count: number = 5) => {
    setTestPayoutLoading(true)
    try {
      // First, check if test merchant exists and get its countInRubEquivalent setting
      const testMerchant = await adminApiInstance.get('/admin/merchants', {
        params: { search: 'test' }
      })
      
      const merchant = testMerchant.data?.data?.find((m: any) => m.name === 'test')
      const countInRubEquivalent = merchant?.countInRubEquivalent || false
      
      // Prepare request data based on merchant setting
      const requestData: any = {
        count,
        direction: 'OUT',
        isCard: true,
      }
      
      // Only include rate if countInRubEquivalent is false
      if (!countInRubEquivalent) {
        requestData.rate = 95 + Math.random() * 5
      }
      
      const result = await api.createTestPayouts(requestData)
      
      if (result.success) {
        toast.success(`Создано ${result.created} тестовых выплат`, {
          description: result.failed > 0 ? `Не удалось создать: ${result.failed}` : undefined
        })
        loadPayouts()
        setTestPayoutDialog(false)
      } else {
        throw new Error(result.error || 'Ошибка создания выплат')
      }
    } catch (error: any) {
      console.error('Test payouts error:', error)
      toast.error(error.response?.data?.error || error.message || 'Ошибка создания тестовых выплат')
    } finally {
      setTestPayoutLoading(false)
    }
  }

  const handleReviewPayout = async (payoutId: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await api.approvePayout(payoutId)
        toast.success('Выплата одобрена')
      } else {
        if (!rejectReason) {
          toast.error('Укажите причину отклонения')
          return
        }
        await api.rejectPayout(payoutId, { reason: rejectReason })
        toast.success('Выплата отклонена')
      }
      
      setReviewDialog({ open: false, payout: null, action: 'approve' })
      setRejectReason('')
      loadPayouts()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка при обработке выплаты')
    }
  }

  const PayoutDetailsDialog = () => {
    if (!selectedPayout) return null

    return (
      <Dialog open={!!selectedPayout} onOpenChange={() => setSelectedPayout(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Детали выплаты ${selectedPayout.numericId}</DialogTitle>
            <DialogDescription>Полная информация о выплате</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-600">Статус</Label>
                <div className="mt-1">{getStatusBadge(selectedPayout.status)}</div>
              </div>
              <div>
                <Label className="text-gray-600">Направление</Label>
                <div className="mt-1">
                  <Badge variant={selectedPayout.direction === 'IN' ? 'default' : 'secondary'}>
                    {selectedPayout.direction}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-600">Мерчант</Label>
                <p className="font-medium">{selectedPayout.merchant?.name || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-gray-600">Трейдер</Label>
                <p className="font-medium">
                  {selectedPayout.trader ? `${selectedPayout.trader.numericId}` : 'Не назначен'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-600">Сумма</Label>
                <p className="font-medium">{formatAmount(selectedPayout.amount)} ₽</p>
                <p className="text-sm text-gray-500">{selectedPayout.amountUsdt.toFixed(2)} USDT</p>
              </div>
              <div>
                <Label className="text-gray-600">Итого к списанию</Label>
                <p className="font-medium">{formatAmount(selectedPayout.total)} ₽</p>
                <p className="text-sm text-gray-500">{selectedPayout.totalUsdt.toFixed(2)} USDT</p>
              </div>
            </div>

            <div>
              <Label className="text-gray-600">Реквизиты</Label>
              <p className="font-medium">{selectedPayout.wallet}</p>
              <p className="text-sm text-gray-500">
                {selectedPayout.bank} {selectedPayout.isCard ? '(Карта)' : ''}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-600">Курс</Label>
                <p className="font-medium">{selectedPayout.rate}</p>
              </div>
              <div>
                <Label className="text-gray-600">Дельта курса</Label>
                <p className="font-medium">{selectedPayout.rateDelta}%</p>
              </div>
              <div>
                <Label className="text-gray-600">Комиссия</Label>
                <p className="font-medium">{selectedPayout.feePercent}%</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-600">Создана</Label>
                <p className="font-medium">{formatDate(selectedPayout.createdAt)}</p>
              </div>
              <div>
                <Label className="text-gray-600">Истекает</Label>
                <p className="font-medium">{formatDate(selectedPayout.expireAt)}</p>
              </div>
            </div>

            {selectedPayout.acceptedAt && (
              <div>
                <Label className="text-gray-600">Принята в работу</Label>
                <p className="font-medium">{formatDate(selectedPayout.acceptedAt)}</p>
              </div>
            )}

            {selectedPayout.confirmedAt && (
              <div>
                <Label className="text-gray-600">Подтверждена</Label>
                <p className="font-medium">{formatDate(selectedPayout.confirmedAt)}</p>
              </div>
            )}

            {selectedPayout.cancelledAt && (
              <div>
                <Label className="text-gray-600">Отменена</Label>
                <p className="font-medium">{formatDate(selectedPayout.cancelledAt)}</p>
                {selectedPayout.cancelReason && (
                  <p className="text-sm text-gray-500 mt-1">Причина: {selectedPayout.cancelReason}</p>
                )}
              </div>
            )}

            {selectedPayout.proofFiles && selectedPayout.proofFiles.length > 0 && (
              <div>
                <Label className="text-gray-600">Файлы подтверждения</Label>
                <div className="mt-2 space-y-2">
                  {selectedPayout.proofFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <FileText className="h-4 w-4 text-gray-600" />
                      <span className="text-sm flex-1">{file.includes('-') ? file.split('-').slice(1).join('-') : file}</span>
                      <Button size="sm" variant="ghost" onClick={() => {
                        window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/uploads/payouts/${file}`, '_blank')
                      }}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedPayout.cancellationHistory && selectedPayout.cancellationHistory.length > 0 && (
              <div>
                <Label className="text-gray-600">История отмен</Label>
                <div className="mt-2 space-y-3">
                  {selectedPayout.cancellationHistory.map((cancellation, index) => (
                    <div key={index} className="p-3 bg-yellow-50 rounded border-l-4 border-yellow-400">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium">
                            Трейдер: {cancellation.trader.email} (#{cancellation.trader.id.slice(-6)})
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDate(cancellation.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Причина:</strong> {cancellation.reason}
                      </p>
                      {cancellation.files && cancellation.files.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-600 mb-1">Файлы:</p>
                          {cancellation.files.map((file, fileIndex) => (
                            <div key={fileIndex} className="flex items-center gap-2 p-2 bg-white rounded">
                              <FileText className="h-4 w-4 text-gray-600" />
                              <span className="text-xs flex-1">{file.includes('-') ? file.split('-').slice(1).join('-') : file}</span>
                              <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => {
                                window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/uploads/payouts/${file}`, '_blank')
                              }}>
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedPayout.status === 'CHECKING' && (
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => setReviewDialog({ 
                    open: true, 
                    payout: selectedPayout, 
                    action: 'reject' 
                  })}
                >
                  <X className="h-4 w-4 mr-2" />
                  Отклонить
                </Button>
                <Button
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={() => setReviewDialog({ 
                    open: true, 
                    payout: selectedPayout, 
                    action: 'approve' 
                  })}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Одобрить
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const ReviewActionDialog = () => {
    const { open, payout, action } = reviewDialog
    if (!payout) return null

    return (
      <Dialog open={open} onOpenChange={(open) => !open && setReviewDialog({ open: false, payout: null, action: 'approve' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Одобрить выплату' : 'Отклонить выплату'}
            </DialogTitle>
            <DialogDescription>
              {payout.numericId} на сумму {formatAmount(payout.amount)} ₽
            </DialogDescription>
          </DialogHeader>
          
          {action === 'reject' && (
            <div className="space-y-2">
              <Label>Причина отклонения</Label>
              <textarea
                className="w-full min-h-[100px] px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Укажите причину отклонения..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog({ open: false, payout: null, action: 'approve' })}>
              Отмена
            </Button>
            <Button
              onClick={() => handleReviewPayout(payout.id, action)}
              className={action === 'approve' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {action === 'approve' ? 'Одобрить' : 'Отклонить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  const PayoutsTable = () => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Мерчант</TableHead>
            <TableHead>Трейдер</TableHead>
            <TableHead>Сумма</TableHead>
            <TableHead>Кошелек</TableHead>
            <TableHead>Банк</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Направление</TableHead>
            <TableHead>Создан</TableHead>
            <TableHead>Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payouts.map((payout) => (
            <TableRow key={payout.id}>
              <TableCell className="font-mono">
                ${payout.numericId}
              </TableCell>
              <TableCell>
                {payout.merchant?.name || 'N/A'}
              </TableCell>
              <TableCell>
                {payout.trader ? (
                  <span className="font-mono">
                    {payout.trader.numericId}
                  </span>
                ) : (
                  <span className="text-gray-500">Не назначен</span>
                )}
              </TableCell>
              <TableCell>
                <div>
                  <div>{formatAmount(payout.amount)} ₽</div>
                  <div className="text-xs text-gray-500">
                    {payout.amountUsdt.toFixed(2)} USDT
                  </div>
                </div>
              </TableCell>
              <TableCell className="font-mono text-sm">
                {payout.wallet}
              </TableCell>
              <TableCell>
                {payout.bank} {payout.isCard ? '(Карта)' : ''}
              </TableCell>
              <TableCell>
                {getStatusBadge(payout.status)}
              </TableCell>
              <TableCell>
                <Badge variant={payout.direction === 'IN' ? 'default' : 'secondary'}>
                  {payout.direction}
                </Badge>
              </TableCell>
              <TableCell>
                {formatDate(payout.createdAt)}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedPayout(payout)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {payout.status === 'CHECKING' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-purple-600 hover:text-purple-700"
                      onClick={() => setReviewDialog({ 
                        open: true, 
                        payout, 
                        action: 'approve' 
                      })}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <div className="space-y-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <DollarSign className="h-8 w-8" />
              Управление выплатами
            </h1>
            <p className="text-gray-600 mt-2">
              Просмотр и управление всеми выплатами в системе
            </p>
          </div>

          <div className="mb-6 flex gap-4">
            <Button 
              onClick={() => window.location.href = '/admin/payout-settings'}
              variant="outline"
            >
              <Settings className="h-4 w-4 mr-2" />
              Настройки лимитов
            </Button>
            <Button 
              onClick={() => window.location.href = '/admin/rate-settings'}
              variant="outline"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Настройки ставок
            </Button>
            <Button 
              onClick={() => setTestPayoutDialog(true)}
              variant="outline"
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Создать тестовые выплаты
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Фильтры</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Поиск по ID, кошельку или сумме"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
                {activeTab === 'all' && (
                  <>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Статус" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все статусы</SelectItem>
                        <SelectItem value="CREATED">Создан</SelectItem>
                        <SelectItem value="ACTIVE">Активен</SelectItem>
                        <SelectItem value="CHECKING">Проверка</SelectItem>
                        <SelectItem value="COMPLETED">Завершен</SelectItem>
                        <SelectItem value="CANCELLED">Отменен</SelectItem>
                        <SelectItem value="EXPIRED">Истек</SelectItem>
                        <SelectItem value="DISPUTED">Спор</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={directionFilter} onValueChange={setDirectionFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Направление" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все направления</SelectItem>
                        <SelectItem value="IN">Входящие (IN)</SelectItem>
                        <SelectItem value="OUT">Исходящие (OUT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
                <Button type="submit">
                  <Search className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList>
              <TabsTrigger value="all">Все выплаты</TabsTrigger>
              <TabsTrigger value="checking">
                На проверке
                {payouts.filter(p => p.status === 'CHECKING').length > 0 && (
                  <Badge className="ml-2 bg-purple-100 text-purple-800">
                    {payouts.filter(p => p.status === 'CHECKING').length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="disputed">
                Споры
                {payouts.filter(p => p.status === 'DISPUTED').length > 0 && (
                  <Badge className="ml-2 bg-orange-100 text-orange-800">
                    {payouts.filter(p => p.status === 'DISPUTED').length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history">
                История
                {payouts.filter(p => p.status === 'COMPLETED' || p.status === 'CANCELLED').length > 0 && (
                  <Badge className="ml-2 bg-gray-100 text-gray-800">
                    {payouts.filter(p => p.status === 'COMPLETED' || p.status === 'CANCELLED').length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <Card>
                <CardHeader>
                  <CardTitle>Все выплаты</CardTitle>
                  <CardDescription>
                    Всего найдено: {payouts.length} выплат
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <PayoutsTable />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="checking">
              <Card>
                <CardHeader>
                  <CardTitle>Выплаты на проверке</CardTitle>
                  <CardDescription>
                    Выплаты, ожидающие проверки администратором
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <PayoutsTable />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="disputed">
              <Card>
                <CardHeader>
                  <CardTitle>Спорные выплаты</CardTitle>
                  <CardDescription>
                    Выплаты с открытыми спорами
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <PayoutsTable />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>История выплат</CardTitle>
                  <CardDescription>
                    Завершенные и отмененные выплаты
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <PayoutsTable />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Назад
              </Button>
              <span className="flex items-center px-4">
                Страница {currentPage} из {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Вперед
              </Button>
            </div>
          )}
        </div>

        <PayoutDetailsDialog />
        <ReviewActionDialog />
        
        {/* Test Payouts Dialog */}
        <Dialog open={testPayoutDialog} onOpenChange={setTestPayoutDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Создать тестовые выплаты</DialogTitle>
              <DialogDescription>
                Выберите количество тестовых выплат для создания. 
                Выплаты будут созданы с случайными параметрами для тестового мерчанта.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="text-sm text-gray-600">
                <p className="mb-2">ℹ️ Курс будет определен автоматически в зависимости от настроек тестового мерчанта:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Если "Расчеты в рублях" включены - курс берется из системы</li>
                  <li>Если "Расчеты в рублях" выключены - используется случайный курс</li>
                </ul>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  onClick={() => handleCreateTestPayouts(1)}
                  disabled={testPayoutLoading}
                  className="h-20 flex flex-col items-center justify-center gap-2"
                >
                  <span className="text-2xl font-bold">1</span>
                  <span className="text-sm">выплата</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleCreateTestPayouts(5)}
                  disabled={testPayoutLoading}
                  className="h-20 flex flex-col items-center justify-center gap-2 border-blue-300 bg-blue-50 hover:bg-blue-100"
                >
                  <span className="text-2xl font-bold text-blue-700">5</span>
                  <span className="text-sm text-blue-700">выплат</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleCreateTestPayouts(10)}
                  disabled={testPayoutLoading}
                  className="h-20 flex flex-col items-center justify-center gap-2"
                >
                  <span className="text-2xl font-bold">10</span>
                  <span className="text-sm">выплат</span>
                </Button>
              </div>
              
              {testPayoutLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Создание выплат...</span>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setTestPayoutDialog(false)}>
                Отмена
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AuthLayout>
    </ProtectedRoute>
  )
}