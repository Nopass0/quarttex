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
  ArrowLeft, 
  Smartphone, 
  MessageSquare, 
  CreditCard, 
  Receipt,
  AlertCircle,
  Copy,
  Power,
  PowerOff,
  Send,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Building,
  Hash,
  Wifi,
  Battery,
  Shield
} from 'lucide-react'
import { toast } from 'sonner'
import { adminApiInstance } from '@/services/api'
import { formatDateTime, cn } from '@/lib/utils'

interface DeviceDetailProps {
  deviceId: string
}

interface Device {
  id: string
  name: string
  model: string
  manufacturer: string
  fingerprint: string
  androidVersion: string
  token: string
  isConnected: boolean
  isTrusted: boolean
  batteryLevel: number
  networkInfo: string
  lastActivity: string
  createdAt: string
  traderId: string
  trader: {
    id: string
    name: string
    email: string
  }
  bankDetails: Array<{
    id: string
    bankType: string
    cardNumber: string
    recipientName: string
    isActive: boolean
    transactionCount: number
  }>
}

interface Message {
  id: string
  type: 'notification' | 'sms'
  packageName?: string
  appName?: string
  phoneNumber?: string
  sender?: string
  content: string
  timestamp: string
  createdAt: string
  isProcessed: boolean
  matchedTransactionId?: string
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
  rate?: number
  commission: number
  createdAt: string
  updatedAt: string
  acceptedAt?: string
  expired_at: string
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

export function DeviceDetail({ deviceId }: DeviceDetailProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [device, setDevice] = useState<Device | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [activeTab, setActiveTab] = useState('info')

  useEffect(() => {
    fetchDevice()
  }, [deviceId])

  useEffect(() => {
    if (activeTab === 'messages') {
      fetchMessages()
    } else if (activeTab === 'transactions') {
      fetchTransactions()
    }
  }, [activeTab])

  const fetchDevice = async () => {
    try {
      setLoading(true)
      const response = await adminApiInstance.get(`/admin/devices/${deviceId}`)
      setDevice(response.data)
    } catch (error) {
      toast.error('Не удалось загрузить информацию об устройстве')
      router.push('/admin/devices')
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async () => {
    try {
      const response = await adminApiInstance.get(`/admin/devices/${deviceId}/messages`)
      setMessages(response.data)
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  const fetchTransactions = async () => {
    try {
      const response = await adminApiInstance.get(`/admin/devices/${deviceId}/transactions`)
      setTransactions(response.data)
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    }
  }

  const handleCopyToken = () => {
    if (device?.token) {
      navigator.clipboard.writeText(device.token)
      toast.success('Токен устройства скопирован')
    }
  }

  const handleToggleConnection = async () => {
    if (!device) return
    
    try {
      await adminApiInstance.patch(`/admin/devices/${deviceId}/connection`, {
        isConnected: !device.isConnected
      })
      setDevice({ ...device, isConnected: !device.isConnected })
      toast.success(device.isConnected ? 'Устройство отключено' : 'Устройство подключено')
    } catch (error) {
      toast.error('Ошибка изменения статуса подключения')
    }
  }

  const handleToggleTrust = async () => {
    if (!device) return
    
    try {
      await adminApiInstance.patch(`/admin/devices/${deviceId}/trust`, {
        isTrusted: !device.isTrusted
      })
      setDevice({ ...device, isTrusted: !device.isTrusted })
      toast.success(device.isTrusted ? 'Доверие отозвано' : 'Устройство помечено как доверенное')
    } catch (error) {
      toast.error('Ошибка изменения статуса доверия')
    }
  }

  if (loading || !device) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      CREATED: { color: 'bg-blue-100 text-blue-700', icon: Clock, text: 'Создана' },
      IN_PROGRESS: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, text: 'В работе' },
      DISPUTE: { color: 'bg-orange-100 text-orange-700', icon: AlertCircle, text: 'Спор' },
      READY: { color: 'bg-green-100 text-green-700', icon: CheckCircle, text: 'Готова' },
      EXPIRED: { color: 'bg-gray-100 text-gray-700', icon: XCircle, text: 'Истекла' },
      CANCELED: { color: 'bg-red-100 text-red-700', icon: XCircle, text: 'Отменена' },
      MILK: { color: 'bg-purple-100 text-purple-700', icon: AlertCircle, text: 'Слив' },
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/devices')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Устройство {device.name}</h1>
            <p className="text-gray-600">{device.model} • {device.manufacturer}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleConnection}
          >
            {device.isConnected ? (
              <>
                <PowerOff className="w-4 h-4 mr-2" />
                Отключить
              </>
            ) : (
              <>
                <Power className="w-4 h-4 mr-2" />
                Подключить
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleTrust}
          >
            <Shield className={cn("w-4 h-4 mr-2", device.isTrusted && "text-green-600")} />
            {device.isTrusted ? 'Отозвать доверие' : 'Доверять'}
          </Button>
        </div>
      </div>

      {/* Device Phone Mockup and Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Phone Mockup */}
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div className="relative mx-auto w-[280px] h-[580px] bg-gray-900 rounded-[3rem] shadow-xl">
              {/* Phone Frame */}
              <div className="absolute inset-[3px] bg-white rounded-[2.8rem] overflow-hidden">
                {/* Status Bar */}
                <div className="bg-gray-900 text-white px-6 py-2 text-xs flex justify-between items-center">
                  <span>{new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                  <div className="flex items-center gap-2">
                    <Wifi className="w-3 h-3" />
                    <Battery className="w-4 h-3" />
                    <span>{device.batteryLevel}%</span>
                  </div>
                </div>
                
                {/* Screen Content */}
                <div className="p-4 h-full bg-gray-50">
                  <div className="text-center mt-8">
                    <Smartphone className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 font-medium">{device.model}</p>
                    <p className="text-sm text-gray-500">Android {device.androidVersion}</p>
                    
                    <div className="mt-8 space-y-2">
                      <Badge className={device.isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {device.isConnected ? 'Подключено' : 'Отключено'}
                      </Badge>
                      {device.isTrusted && (
                        <Badge className="bg-blue-100 text-blue-700">
                          <Shield className="w-3 h-3 mr-1" />
                          Доверенное
                        </Badge>
                      )}
                    </div>
                    
                    <div className="mt-8 text-xs text-gray-500">
                      <p>Сеть: {device.networkInfo}</p>
                      <p>Батарея: {device.batteryLevel}%</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Notch */}
              <div className="absolute top-[3px] left-1/2 transform -translate-x-1/2 w-40 h-7 bg-gray-900 rounded-b-3xl"></div>
            </div>
          </CardContent>
        </Card>

        {/* Device Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Информация об устройстве</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">ID устройства</p>
                  <p className="font-mono text-sm">{device.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fingerprint</p>
                  <p className="font-mono text-sm">{device.fingerprint}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Токен</p>
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
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Трейдер</p>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="font-medium">{device.trader.name}</p>
                      <p className="text-sm text-gray-500">{device.trader.email}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Последняя активность</p>
                  <p className="text-sm">{formatDateTime(device.lastActivity)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Дата добавления</p>
                  <p className="text-sm">{formatDateTime(device.createdAt)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="info">
            <CreditCard className="w-4 h-4 mr-2" />
            Реквизиты ({device.bankDetails.length})
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="w-4 h-4 mr-2" />
            Сообщения
          </TabsTrigger>
          <TabsTrigger value="transactions">
            <Receipt className="w-4 h-4 mr-2" />
            Сделки
          </TabsTrigger>
          <TabsTrigger value="disputes">
            <AlertCircle className="w-4 h-4 mr-2" />
            Споры
          </TabsTrigger>
        </TabsList>

        {/* Bank Details Tab */}
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Привязанные реквизиты</CardTitle>
            </CardHeader>
            <CardContent>
              {device.bankDetails.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Банк</TableHead>
                        <TableHead>Номер карты</TableHead>
                        <TableHead>Получатель</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Количество сделок</TableHead>
                        <TableHead>Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {device.bankDetails.map((bank) => (
                        <TableRow key={bank.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">{bank.bankType}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">
                            •••• {bank.cardNumber.slice(-4)}
                          </TableCell>
                          <TableCell>{bank.recipientName}</TableCell>
                          <TableCell>
                            <Badge variant={bank.isActive ? "default" : "secondary"}>
                              {bank.isActive ? 'Активен' : 'Неактивен'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {bank.transactionCount} сделок
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => router.push(`/admin/bank-details/${bank.id}`)}
                            >
                              Подробнее
                            </Button>
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

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {messages.length > 0 ? (
                <div className="divide-y">
                  {messages.map((message) => (
                    <div key={message.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {message.type === 'notification' ? (
                              <>
                                <MessageSquare className="w-4 h-4 text-blue-500" />
                                <span className="font-medium text-sm">{message.appName || message.packageName}</span>
                              </>
                            ) : (
                              <>
                                <Hash className="w-4 h-4 text-green-500" />
                                <span className="font-medium text-sm">{message.phoneNumber}</span>
                              </>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {message.type === 'notification' ? 'Уведомление' : 'SMS'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{message.content}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDateTime(message.timestamp)}
                            </span>
                            {message.isProcessed && (
                              <Badge variant="outline" className="text-xs">
                                Обработано
                              </Badge>
                            )}
                            {message.matchedTransactionId && (
                              <Button
                                size="sm"
                                variant="link"
                                className="text-xs p-0 h-auto"
                                onClick={() => router.push(`/admin/transactions/${message.matchedTransactionId}`)}
                              >
                                Перейти к сделке →
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Нет сообщений</p>
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
              {transactions.length > 0 ? (
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
                            {transaction.dealDispute && (
                              <Badge className="bg-orange-100 text-orange-700">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Спор
                              </Badge>
                            )}
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
                              <span className="text-gray-500">Метод:</span>
                              <span className="ml-2 font-medium">{transaction.method?.name || 'N/A'}</span>
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
                            onClick={() => router.push(`/admin/deals?id=${transaction.id}`)}
                          >
                            Подробнее
                          </Button>
                          {transaction.dealDispute && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-orange-600 hover:text-orange-700"
                              onClick={() => router.push(`/admin/disputes/deal/${transaction.dealDispute?.id}`)}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Нет сделок</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Disputes Tab */}
        <TabsContent value="disputes" className="space-y-4">
          <Card>
            <CardContent className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Нет споров</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}