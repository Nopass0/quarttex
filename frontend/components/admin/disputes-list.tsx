'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  AlertCircle,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  User,
  Building2,
  Calendar,
  DollarSign,
} from 'lucide-react'
import { toast } from 'sonner'
import { adminApi } from '@/services/api'
import { cn, formatAmount } from '@/lib/utils'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface DealDispute {
  id: string
  status: string
  reason: string
  resolution: string | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  deal: {
    id: string
    numericId: number
    amount: number
    status: string
    createdAt: string
  }
  trader: {
    id: string
    name: string
    email: string
  }
  merchant: {
    id: string
    name: string
    companyName: string | null
  }
  messagesCount: number
}

interface WithdrawalDispute {
  id: string
  status: string
  reason: string
  resolution: string | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  payout: {
    id: string
    numericId: number
    amount: number
    status: string
    currency: string
    createdAt: string
  }
  trader: {
    id: string
    name: string
    email: string
  }
  merchant: {
    id: string
    name: string
    companyName: string | null
  }
  messagesCount: number
}

export function AdminDisputesList() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('deals')
  const [isLoading, setIsLoading] = useState(false)
  
  // Deal disputes state
  const [dealDisputes, setDealDisputes] = useState<DealDispute[]>([])
  const [dealPagination, setDealPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [dealFilters, setDealFilters] = useState({
    status: 'all',
    traderId: '',
    merchantId: '',
  })
  
  // Withdrawal disputes state
  const [withdrawalDisputes, setWithdrawalDisputes] = useState<WithdrawalDispute[]>([])
  const [withdrawalPagination, setWithdrawalPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [withdrawalFilters, setWithdrawalFilters] = useState({
    status: 'all',
    traderId: '',
    merchantId: '',
  })

  const fetchDealDisputes = async (page = 1) => {
    try {
      setIsLoading(true)
      const response = await adminApi.getDealDisputes({
        page,
        limit: dealPagination.limit,
        ...dealFilters,
      })
      setDealDisputes(response.disputes)
      setDealPagination(response.pagination)
    } catch (error) {
      toast.error('Не удалось загрузить споры по сделкам')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchWithdrawalDisputes = async (page = 1) => {
    try {
      setIsLoading(true)
      const response = await adminApi.getWithdrawalDisputes({
        page,
        limit: withdrawalPagination.limit,
        ...withdrawalFilters,
      })
      setWithdrawalDisputes(response.disputes)
      setWithdrawalPagination(response.pagination)
    } catch (error) {
      toast.error('Не удалось загрузить споры по выплатам')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'deals') {
      fetchDealDisputes()
    } else {
      fetchWithdrawalDisputes()
    }
  }, [activeTab, dealFilters, withdrawalFilters])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="default" className="bg-yellow-500">Открыт</Badge>
      case 'IN_PROGRESS':
        return <Badge variant="default" className="bg-blue-500">В процессе</Badge>
      case 'RESOLVED_SUCCESS':
        return <Badge variant="destructive" className="bg-red-500">Решен (мерчант)</Badge>
      case 'RESOLVED_FAIL':
        return <Badge variant="default" className="bg-green-500">Решен (трейдер)</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMM yyyy HH:mm', { locale: ru })
  }

  const navigateToDispute = (type: 'deal' | 'withdrawal', id: string) => {
    router.push(`/admin/disputes/${type}/${id}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Управление спорами</h1>
          <p className="text-gray-500 mt-1">
            Просматривайте и разрешайте споры между трейдерами и мерчантами
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => activeTab === 'deals' ? fetchDealDisputes() : fetchWithdrawalDisputes()}
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="deals" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Споры по сделкам
          </TabsTrigger>
          <TabsTrigger value="withdrawals" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Споры по выплатам
          </TabsTrigger>
        </TabsList>

        {/* Deal Disputes */}
        <TabsContent value="deals" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Споры по сделкам</CardTitle>
                  <CardDescription>
                    Споры, связанные с входящими транзакциями
                  </CardDescription>
                </div>
                <Select
                  value={dealFilters.status}
                  onValueChange={(value) => setDealFilters({ ...dealFilters, status: value })}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Фильтр по статусу" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="OPEN">Открытые</SelectItem>
                    <SelectItem value="IN_PROGRESS">В процессе</SelectItem>
                    <SelectItem value="RESOLVED_SUCCESS">Решены (мерчант)</SelectItem>
                    <SelectItem value="RESOLVED_FAIL">Решены (трейдер)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID спора</TableHead>
                      <TableHead>Сделка</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Трейдер</TableHead>
                      <TableHead>Мерчант</TableHead>
                      <TableHead>Сумма</TableHead>
                      <TableHead>Сообщения</TableHead>
                      <TableHead>Создан</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dealDisputes.map((dispute) => (
                      <TableRow 
                        key={dispute.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => navigateToDispute('deal', dispute.id)}
                      >
                        <TableCell className="font-mono text-sm">
                          {dispute.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">#{dispute.deal.numericId}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(dispute.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <div>
                              <div className="font-medium">{dispute.trader.name}</div>
                              <div className="text-sm text-gray-500">{dispute.trader.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <div>
                              <div className="font-medium">{dispute.merchant.name}</div>
                              {dispute.merchant.companyName && (
                                <div className="text-sm text-gray-500">{dispute.merchant.companyName}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{formatAmount(dispute.deal.amount)} ₽</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4 text-gray-400" />
                            <span>{dispute.messagesCount}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{formatDate(dispute.createdAt)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigateToDispute('deal', dispute.id)
                            }}
                          >
                            Подробнее
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {dealPagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-600">
                    Показано {dealDisputes.length} из {dealPagination.total} споров
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchDealDisputes(dealPagination.page - 1)}
                      disabled={dealPagination.page === 1 || isLoading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Назад
                    </Button>
                    <span className="text-sm">
                      Страница {dealPagination.page} из {dealPagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchDealDisputes(dealPagination.page + 1)}
                      disabled={dealPagination.page === dealPagination.totalPages || isLoading}
                    >
                      Вперед
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Withdrawal Disputes */}
        <TabsContent value="withdrawals" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Споры по выплатам</CardTitle>
                  <CardDescription>
                    Споры, связанные с исходящими платежами
                  </CardDescription>
                </div>
                <Select
                  value={withdrawalFilters.status}
                  onValueChange={(value) => setWithdrawalFilters({ ...withdrawalFilters, status: value })}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Фильтр по статусу" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="OPEN">Открытые</SelectItem>
                    <SelectItem value="IN_PROGRESS">В процессе</SelectItem>
                    <SelectItem value="RESOLVED_SUCCESS">Решены (мерчант)</SelectItem>
                    <SelectItem value="RESOLVED_FAIL">Решены (трейдер)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID спора</TableHead>
                      <TableHead>Выплата</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Трейдер</TableHead>
                      <TableHead>Мерчант</TableHead>
                      <TableHead>Сумма</TableHead>
                      <TableHead>Сообщения</TableHead>
                      <TableHead>Создан</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawalDisputes.map((dispute) => (
                      <TableRow 
                        key={dispute.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => navigateToDispute('withdrawal', dispute.id)}
                      >
                        <TableCell className="font-mono text-sm">
                          {dispute.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">#{dispute.payout.numericId}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(dispute.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <div>
                              <div className="font-medium">{dispute.trader.name}</div>
                              <div className="text-sm text-gray-500">{dispute.trader.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <div>
                              <div className="font-medium">{dispute.merchant.name}</div>
                              {dispute.merchant.companyName && (
                                <div className="text-sm text-gray-500">{dispute.merchant.companyName}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {formatAmount(dispute.payout.amount)} {dispute.payout.currency}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4 text-gray-400" />
                            <span>{dispute.messagesCount}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{formatDate(dispute.createdAt)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigateToDispute('withdrawal', dispute.id)
                            }}
                          >
                            Подробнее
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {withdrawalPagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-600">
                    Показано {withdrawalDisputes.length} из {withdrawalPagination.total} споров
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchWithdrawalDisputes(withdrawalPagination.page - 1)}
                      disabled={withdrawalPagination.page === 1 || isLoading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Назад
                    </Button>
                    <span className="text-sm">
                      Страница {withdrawalPagination.page} из {withdrawalPagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchWithdrawalDisputes(withdrawalPagination.page + 1)}
                      disabled={withdrawalPagination.page === withdrawalPagination.totalPages || isLoading}
                    >
                      Вперед
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}