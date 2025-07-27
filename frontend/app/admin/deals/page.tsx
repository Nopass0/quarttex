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
  CreditCard, 
  Search, 
  Loader2, 
  Eye,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  MessageSquare,
  RefreshCw
} from 'lucide-react'

interface Transaction {
  id: string
  numericId: number
  amount: number
  status: string
  type: string
  assetOrBank: string
  orderId: string
  clientName: string
  rate?: number
  commission: number
  createdAt: string
  updatedAt: string
  acceptedAt?: string
  expiredAt: string
  error?: string
  merchant?: {
    id: string
    name: string
  }
  trader?: {
    id: string
    numericId: number
    email: string
  }
  method?: {
    name: string
    code: string
  }
  requisites?: {
    cardNumber: string
    bankType: string
    recipientName: string
  }
  dealDispute?: {
    id: string
    status: string
  }
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  CREATED: { label: 'Создана', color: 'bg-blue-100 text-blue-800', icon: Clock },
  IN_PROGRESS: { label: 'В работе', color: 'bg-yellow-100 text-yellow-800', icon: RefreshCw },
  DISPUTE: { label: 'Спор', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
  EXPIRED: { label: 'Истекла', color: 'bg-gray-100 text-gray-800', icon: XCircle },
  READY: { label: 'Готова', color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
  MILK: { label: 'Слив', color: 'bg-purple-100 text-purple-800', icon: AlertCircle },
  CANCELED: { label: 'Отменена', color: 'bg-red-100 text-red-800', icon: XCircle },
}

export default function AdminDealsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    loadTransactions()
  }, [statusFilter, typeFilter, currentPage, activeTab])

  const loadTransactions = async () => {
    setIsLoading(true)
    try {
      const params: any = {
        limit: 20,
        page: currentPage,
      }
      
      // Apply status filter based on active tab
      if (activeTab === 'disputes') {
        params.status = 'DISPUTE'
      } else if (activeTab === 'active') {
        params.status = 'IN_PROGRESS'
      } else if (statusFilter !== 'all') {
        params.status = statusFilter
      }
      
      if (typeFilter !== 'all') {
        params.type = typeFilter
      }
      
      if (search) {
        params.search = search
      }

      const response = await api.getTransactionDeals(params)
      setTransactions(response.data || response.transactions || [])
      setTotalPages(response.meta?.totalPages || response.totalPages || 1)
    } catch (error: any) {
      toast.error('Ошибка загрузки сделок')
      console.error('Failed to load transactions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    loadTransactions()
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

  const handleUpdateStatus = async (transactionId: string, newStatus: string) => {
    try {
      await api.updateTransactionStatus(transactionId, newStatus)
      toast.success('Статус сделки обновлен')
      loadTransactions()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка при обновлении статуса')
    }
  }

  const TransactionDetailsDialog = () => {
    if (!selectedTransaction) return null

    return (
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Детали сделки #{selectedTransaction.numericId}</DialogTitle>
            <DialogDescription>Полная информация о транзакции</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-600">Статус</Label>
                <div className="mt-1">{getStatusBadge(selectedTransaction.status)}</div>
              </div>
              <div>
                <Label className="text-gray-600">Тип</Label>
                <div className="mt-1">
                  <Badge variant={selectedTransaction.type === 'IN' ? 'default' : 'secondary'}>
                    {selectedTransaction.type}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-600">Мерчант</Label>
                <p className="font-medium">{selectedTransaction.merchant?.name || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-gray-600">Трейдер</Label>
                <p className="font-medium">
                  {selectedTransaction.trader ? 
                    `#${selectedTransaction.trader.numericId} (${selectedTransaction.trader.email})` : 
                    'Не назначен'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-600">Сумма</Label>
                <p className="font-medium">{formatAmount(selectedTransaction.amount)} ₽</p>
              </div>
              <div>
                <Label className="text-gray-600">Комиссия</Label>
                <p className="font-medium">{selectedTransaction.commission}%</p>
              </div>
            </div>

            {selectedTransaction.rate && (
              <div>
                <Label className="text-gray-600">Курс</Label>
                <p className="font-medium">{selectedTransaction.rate}</p>
              </div>
            )}

            <div>
              <Label className="text-gray-600">Метод</Label>
              <p className="font-medium">
                {selectedTransaction.method?.name || 'N/A'} ({selectedTransaction.method?.code || 'N/A'})
              </p>
            </div>

            {selectedTransaction.requisites && (
              <div>
                <Label className="text-gray-600">Реквизиты</Label>
                <p className="font-medium">{selectedTransaction.requisites.cardNumber}</p>
                <p className="text-sm text-gray-500">
                  {selectedTransaction.requisites.bankType} • {selectedTransaction.requisites.recipientName}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-600">ID заказа</Label>
                <p className="font-mono text-sm">{selectedTransaction.orderId}</p>
              </div>
              <div>
                <Label className="text-gray-600">Имя клиента</Label>
                <p className="font-medium">{selectedTransaction.clientName}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-600">Создана</Label>
                <p className="font-medium">{formatDate(selectedTransaction.createdAt)}</p>
              </div>
              <div>
                <Label className="text-gray-600">Истекает</Label>
                <p className="font-medium">{formatDate(selectedTransaction.expiredAt)}</p>
              </div>
            </div>

            {selectedTransaction.acceptedAt && (
              <div>
                <Label className="text-gray-600">Принята в работу</Label>
                <p className="font-medium">{formatDate(selectedTransaction.acceptedAt)}</p>
              </div>
            )}

            {selectedTransaction.error && (
              <div>
                <Label className="text-gray-600">Ошибка</Label>
                <p className="text-red-600">{selectedTransaction.error}</p>
              </div>
            )}

            {selectedTransaction.dealDispute && (
              <div className="p-4 bg-orange-50 rounded-lg">
                <Label className="text-gray-600">Информация о споре</Label>
                <div className="mt-2">
                  <Badge className="bg-orange-100 text-orange-800">
                    Статус спора: {selectedTransaction.dealDispute.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-2"
                    onClick={() => window.location.href = `/admin/disputes/deal/${selectedTransaction.dealDispute?.id}`}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Перейти к спору
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              {selectedTransaction.status === 'IN_PROGRESS' && (
                <>
                  <Button
                    variant="outline"
                    className="text-purple-600 hover:text-purple-700"
                    onClick={() => handleUpdateStatus(selectedTransaction.id, 'READY')}
                  >
                    Завершить сделку
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleUpdateStatus(selectedTransaction.id, 'CANCELED')}
                  >
                    Отменить сделку
                  </Button>
                </>
              )}
              {selectedTransaction.status === 'CREATED' && (
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleUpdateStatus(selectedTransaction.id, 'EXPIRED')}
                >
                  Пометить как истекшую
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const TransactionsTable = () => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Мерчант</TableHead>
            <TableHead>Трейдер</TableHead>
            <TableHead>Сумма</TableHead>
            <TableHead>Метод</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Тип</TableHead>
            <TableHead>Создана</TableHead>
            <TableHead>Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell className="font-mono">
                #{transaction.numericId}
              </TableCell>
              <TableCell>
                {transaction.merchant?.name || 'N/A'}
              </TableCell>
              <TableCell>
                {transaction.trader ? (
                  <span className="font-mono">
                    #{transaction.trader.numericId}
                  </span>
                ) : (
                  <span className="text-gray-500">Не назначен</span>
                )}
              </TableCell>
              <TableCell>
                {formatAmount(transaction.amount)} ₽
              </TableCell>
              <TableCell>
                {transaction.method?.name || 'N/A'}
              </TableCell>
              <TableCell>
                {getStatusBadge(transaction.status)}
              </TableCell>
              <TableCell>
                <Badge variant={transaction.type === 'IN' ? 'default' : 'secondary'}>
                  {transaction.type}
                </Badge>
              </TableCell>
              <TableCell>
                {formatDate(transaction.createdAt)}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedTransaction(transaction)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {transaction.dealDispute && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-orange-600 hover:text-orange-700"
                      onClick={() => window.location.href = `/admin/disputes/deal/${transaction.dealDispute.id}`}
                    >
                      <MessageSquare className="h-4 w-4" />
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
              <CreditCard className="h-8 w-8" />
              Управление сделками
            </h1>
            <p className="text-gray-600 mt-2">
              Просмотр и управление всеми транзакциями в системе
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Фильтры</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Поиск по ID, сумме или имени клиента"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
                {activeTab === 'all' && (
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Статус" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все статусы</SelectItem>
                        <SelectItem value="CREATED">Создана</SelectItem>
                        <SelectItem value="IN_PROGRESS">В работе</SelectItem>
                        <SelectItem value="DISPUTE">Спор</SelectItem>
                        <SelectItem value="READY">Готова</SelectItem>
                        <SelectItem value="EXPIRED">Истекла</SelectItem>
                        <SelectItem value="CANCELED">Отменена</SelectItem>
                        <SelectItem value="MILK">Слив</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Тип" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все типы</SelectItem>
                        <SelectItem value="IN">Входящие (IN)</SelectItem>
                        <SelectItem value="OUT">Исходящие (OUT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button type="submit" className="w-full sm:w-auto">
                  <Search className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList>
              <TabsTrigger value="all">Все сделки</TabsTrigger>
              <TabsTrigger value="active">
                Активные
                {transactions.filter(t => t.status === 'IN_PROGRESS').length > 0 && (
                  <Badge className="ml-2 bg-yellow-100 text-yellow-800">
                    {transactions.filter(t => t.status === 'IN_PROGRESS').length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="disputes">
                Споры
                {transactions.filter(t => t.status === 'DISPUTE').length > 0 && (
                  <Badge className="ml-2 bg-orange-100 text-orange-800">
                    {transactions.filter(t => t.status === 'DISPUTE').length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <Card>
                <CardHeader>
                  <CardTitle>Все сделки</CardTitle>
                  <CardDescription>
                    Всего найдено: {transactions.length} сделок
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <TransactionsTable />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="active">
              <Card>
                <CardHeader>
                  <CardTitle>Активные сделки</CardTitle>
                  <CardDescription>
                    Сделки, находящиеся в работе
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <TransactionsTable />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="disputes">
              <Card>
                <CardHeader>
                  <CardTitle>Спорные сделки</CardTitle>
                  <CardDescription>
                    Сделки с открытыми спорами
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <TransactionsTable />
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

        <TransactionDetailsDialog />
      </AuthLayout>
    </ProtectedRoute>
  )
}