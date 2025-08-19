'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  ArrowLeft, 
  Smartphone, 
  MessageSquare, 
  CreditCard, 
  Receipt,
  AlertCircle,
  Copy,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Building,
  Wifi,
  Battery,
  Shield,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Loader2,
  Edit,
  Trash2,
  MoreVertical,
  Plus
} from 'lucide-react'
import { toast } from 'sonner'
import { traderApi } from '@/services/api'
import { getBankIcon } from '@/lib/bank-utils'
import { formatDateTime, cn } from '@/lib/utils'
import { DeviceRequisitesSheet } from '@/components/trader/device-requisites-sheet'

interface DeviceDetailProps {
  deviceId: string
}

interface Device {
  id: string
  name: string
  isOnline: boolean
  isWorking: boolean
  lastSeen: string
  energy: number
  notifications: number
  token?: string
  linkedBankDetails?: Array<{
    id: string
    bankType: string
    cardNumber: string
    recipientName: string
    isArchived: boolean
    isActive?: boolean
    turnoverDay: number
    turnoverTotal: number
    dailyLimit: number
    monthlyLimit: number
    minAmount?: number
    maxAmount?: number
    maxCountTransactions?: number
    transactionsReady?: number
    transactionsInProgress?: number
    method?: { type: string }
    methodType?: string
  }>
  recentNotifications?: Array<{
    id: string
    type: string
    text: string
    createdAt: string
  }>
}

interface Transaction {
  id: string
  numericId: number
  amount: number
  status: string
  type: string
  assetOrBank: string
  orderId: string
  clientName: string
  commission: number
  createdAt: string
  updatedAt: string
  acceptedAt?: string
  expired_at: string
  merchant?: {
    id: string
    name: string
  }
  requisites?: {
    id: string
    cardNumber: string
    bankType: string
    recipientName: string
  }
}

export function DeviceDetail({ deviceId }: DeviceDetailProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [device, setDevice] = useState<Device | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [activeTab, setActiveTab] = useState('info')
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [showRequisitesSheet, setShowRequisitesSheet] = useState(false)
  const [editingRequisite, setEditingRequisite] = useState<any>(null)

  useEffect(() => {
    fetchDevice()
  }, [deviceId])

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions()
    }
  }, [activeTab])

  const fetchDevice = async () => {
    try {
      setLoading(true)
      const response = await traderApi.getDevice(deviceId)
      setDevice(response)
    } catch (error) {
      toast.error('Не удалось загрузить информацию об устройстве')
      router.push('/trader/requisites')
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactions = async () => {
    if (!device) return
    
    try {
      setTransactionsLoading(true)
      // Fetch all transactions and filter by bank details linked to this device
      const response = await traderApi.getTransactions({ limit: 1000 })
      const allTransactions = response.data || response.transactions || []
      
      // Get all requisites (bank details) linked to this device
      const deviceRequisiteIds = device.linkedBankDetails?.map(bd => bd.id) || []
      
      console.log('Device ID:', deviceId)
      console.log('Device requisite IDs:', deviceRequisiteIds)
      console.log('All transactions:', allTransactions.length)
      console.log('Sample transaction:', allTransactions[0])
      
      // Filter transactions that used requisites (bank details) from this device
      const deviceTransactions = allTransactions.filter((tx: Transaction) => {
        // Check if transaction has requisites and if those requisites belong to this device
        if (!tx.requisites) return false
        
        // Check by requisite ID
        const matchByRequisiteId = deviceRequisiteIds.includes(tx.requisites.id)
        
        // Also check by deviceId if available in transaction
        const matchByDeviceId = tx.deviceId === deviceId
        
        const match = matchByRequisiteId || matchByDeviceId
        
        console.log(`Transaction ${tx.id}: requisiteId=${tx.requisites.id}, deviceId=${tx.deviceId}, matchByRequisite=${matchByRequisiteId}, matchByDevice=${matchByDeviceId}`)
        
        return match
      })
      
      console.log('Filtered transactions:', deviceTransactions.length)
      setTransactions(deviceTransactions)
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
      toast.error('Не удалось загрузить транзакции')
    } finally {
      setTransactionsLoading(false)
    }
  }

  const handleCopyToken = () => {
    if (device?.token) {
      navigator.clipboard.writeText(device.token)
      toast.success('Токен устройства скопирован')
    }
  }

  const regenerateToken = async () => {
    try {
      const response = await traderApi.regenerateDeviceToken(deviceId)
      setDevice({ ...device!, token: response.token })
      toast.success('Токен обновлен')
    } catch (error) {
      toast.error('Не удалось обновить токен')
    }
  }

  const handleEdit = (requisite: any) => {
    setEditingRequisite(requisite)
    setShowRequisitesSheet(true)
  }

  if (loading || !device) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-gray-600" />
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      CREATED: { color: 'bg-blue-100 text-blue-700', icon: Clock, text: 'Создана' },
      IN_PROGRESS: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, text: 'В работе' },
      READY: { color: 'bg-green-100 text-green-700', icon: CheckCircle, text: 'Выполнена' },
      EXPIRED: { color: 'bg-gray-100 text-gray-700', icon: XCircle, text: 'Истекла' },
      CANCELED: { color: 'bg-red-100 text-red-700', icon: XCircle, text: 'Отменена' },
    }
    
    const config = statusConfig[status] || statusConfig.CREATED
    const Icon = config.icon
    
    return (
      <Badge className={cn(config.color, 'gap-1')}>
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    )
  }

  // Calculate device statistics
  const totalTransactions = transactions.length
  const completedTransactions = transactions.filter(tx => tx.status === 'READY').length
  const totalVolume = transactions
    .filter(tx => tx.status === 'READY')
    .reduce((sum, tx) => sum + tx.amount, 0)
  const totalCommission = transactions
    .filter(tx => tx.status === 'READY')
    .reduce((sum, tx) => sum + tx.commission, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/trader/requisites')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Устройство {device.name}</h1>
            <div className="flex items-center gap-4 mt-1">
              <Badge className={device.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                {device.isOnline ? 'Онлайн' : 'Оффлайн'}
              </Badge>
              <Badge className={device.isWorking ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}>
                {device.isWorking ? 'Работает' : 'Остановлено'}
              </Badge>
              <span className="text-sm text-gray-500">
                Последняя активность: {formatDateTime(device.lastSeen)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Всего сделок</p>
                <p className="text-2xl font-bold">{totalTransactions}</p>
              </div>
              <Receipt className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Выполнено</p>
                <p className="text-2xl font-bold text-green-600">{completedTransactions}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Оборот</p>
                <p className="text-2xl font-bold">{totalVolume.toLocaleString('ru-RU')} ₽</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Комиссия</p>
                <p className="text-2xl font-bold text-green-600">{totalCommission.toLocaleString('ru-RU')} ₽</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="info">
            <CreditCard className="w-4 h-4 mr-2" />
            Реквизиты ({device.linkedBankDetails?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <MessageSquare className="w-4 h-4 mr-2" />
            Уведомления
          </TabsTrigger>
          <TabsTrigger value="transactions">
            <Receipt className="w-4 h-4 mr-2" />
            Сделки ({totalTransactions})
          </TabsTrigger>
        </TabsList>

        {/* Bank Details Tab */}
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Информация об устройстве</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">ID устройства</p>
                  <p className="font-mono text-sm">{device.id}</p>
                </div>
                {device.token && (
                  <div>
                    <p className="text-sm text-gray-500">Токен устройства</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm">
                        {device.token.substring(0, 20)}...
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCopyToken}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={regenerateToken}
                      >
                        Обновить токен
                      </Button>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Заряд батареи</p>
                  <div className="flex items-center gap-2">
                    <Battery className="w-4 h-4 text-gray-400" />
                    <span>{device.energy}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Привязанные реквизиты</CardTitle>
                <Button
                  size="default"
                  variant="outline"
                  onClick={() => setShowRequisitesSheet(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Управление реквизитами
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {device.linkedBankDetails && device.linkedBankDetails.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Метод/Банк</TableHead>
                        <TableHead>Номер карты/телефона</TableHead>
                        <TableHead>Получатель</TableHead>
                        <TableHead>Лимиты</TableHead>
                        <TableHead>Транзакции</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {device.linkedBankDetails.map((bank) => (
                        <TableRow key={bank.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-xs text-gray-500">
                                {bank.method?.type || bank.methodType || 'N/A'}
                              </div>
                              <div className="flex items-center gap-2">
                                {React.createElement(getBankIcon(bank.bankType), { className: "w-4 h-4" })}
                                <span className="font-medium">{bank.bankType}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {bank.cardNumber}
                          </TableCell>
                          <TableCell>{bank.recipientName}</TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              <div>
                                <span className="text-gray-500">День:</span> {bank.turnoverDay.toLocaleString('ru-RU')} / {bank.dailyLimit.toLocaleString('ru-RU')} ₽
                              </div>
                              <div>
                                <span className="text-gray-500">Лимит:</span> {bank.minAmount.toLocaleString('ru-RU')} - {bank.maxAmount.toLocaleString('ru-RU')} ₽
                              </div>
                              <div>
                                <span className="text-gray-500">Макс. транзакций:</span> {bank.maxCountTransactions || '∞'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="text-gray-500">Готовых:</span> <span className="font-medium text-green-600">{bank.transactionsReady || 0}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">В процессе:</span> <span className="font-medium text-blue-600">{bank.transactionsInProgress || 0}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={bank.isActive ? "default" : "secondary"}>
                              {bank.isActive ? 'Активен' : 'Неактивен'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleEdit(bank)}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Редактировать
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      await traderApi.unlinkDevice(deviceId, bank.id)
                                      toast.success('Реквизит отвязан от устройства')
                                      fetchDevice()
                                    } catch (error) {
                                      toast.error('Не удалось отвязать реквизит')
                                    }
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Отвязать
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Нет привязанных реквизитов</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {device.recentNotifications && device.recentNotifications.length > 0 ? (
                <div className="divide-y">
                  {device.recentNotifications.map((notification) => (
                    <div key={notification.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="w-4 h-4 text-blue-500" />
                            <Badge variant="outline" className="text-xs">
                              {notification.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700">{notification.text}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDateTime(notification.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Нет уведомлений</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Сделки устройства</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {transactionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : transactions.length > 0 ? (
                <div className="divide-y">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <span className="font-mono text-sm">#{transaction.numericId}</span>
                            {getStatusBadge(transaction.status)}
                            <Badge variant={transaction.type === 'IN' ? 'default' : 'secondary'}>
                              {transaction.type}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Мерчант:</span>
                              <span className="ml-2 font-medium">{transaction.merchant?.name || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Клиент:</span>
                              <span className="ml-2 font-medium">{transaction.clientName}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Сумма:</span>
                              <span className="ml-2 font-medium">{transaction.amount.toLocaleString('ru-RU')} ₽</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Комиссия:</span>
                              <span className="ml-2 font-medium">{transaction.commission.toLocaleString('ru-RU')} ₽</span>
                            </div>
                          </div>
                          
                          {transaction.requisites && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                              <CreditCard className="w-4 h-4 inline mr-2 text-gray-400" />
                              <span>{transaction.requisites.cardNumber}</span>
                              <span className="mx-2">•</span>
                              <span>{transaction.requisites.bankType}</span>
                              <span className="mx-2">•</span>
                              <span>{transaction.requisites.recipientName}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDateTime(transaction.createdAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Истекает: {formatDateTime(transaction.expired_at)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/trader/deals/${transaction.id}`)}
                          >
                            Подробнее
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Нет сделок</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Сделки появятся здесь когда будут обработаны через реквизиты этого устройства
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Device Requisites Sheet */}
      <DeviceRequisitesSheet
        open={showRequisitesSheet}
        onOpenChange={(open) => {
          setShowRequisitesSheet(open);
          if (!open) {
            setEditingRequisite(null);
          }
        }}
        deviceId={device.id}
        existingRequisite={editingRequisite}
        onSuccess={() => {
          fetchDevice();
          setEditingRequisite(null);
        }}
      />
    </div>
  )
}