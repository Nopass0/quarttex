'use client'

import { useState, useEffect } from 'react'
import { useAdminAuth } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Trash2, RefreshCw, Send, Smartphone, Bell, DollarSign, FileText, Copy, Play } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'

interface TestMerchant {
  id: string
  name: string
  token: string
  apiKeyPublic?: string
}

interface Method {
  id: string
  code: string
  name: string
  type: 'BANK_CARD' | 'BANK_TRANSFER'
}

interface Device {
  id: string
  name: string
  token: string
  isOnline: boolean
  userId: string
}

interface BankDetail {
  id: string
  cardNumber: string
  bankType: string
  deviceId?: string
  userId: string
}

interface Transaction {
  id: string
  numericId: number
  merchantId: string
  amount: number
  status: string
  type: 'IN' | 'OUT'
  orderId: string
  bankDetailId?: string
  traderId?: string
  createdAt: string
  isMock?: boolean
  // Все остальные поля
  [key: string]: any
}

interface Payout {
  id: string
  amount: number
  status: string
  merchantId: string
  traderId?: string
  createdAt: string
  isMock?: boolean
  // Все остальные поля
  [key: string]: any
}

export default function TestTransactionsPage() {
  const { token: adminToken } = useAdminAuth()
  const [isLoading, setIsLoading] = useState(false)
  
  // Test data
  const [testMerchants, setTestMerchants] = useState<TestMerchant[]>([])
  const [methods, setMethods] = useState<Method[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [bankDetails, setBankDetails] = useState<BankDetail[]>([])
  const [mockTransactions, setMockTransactions] = useState<Transaction[]>([])
  const [mockPayouts, setMockPayouts] = useState<Payout[]>([])
  
  // Transaction creation form
  const [selectedMerchant, setSelectedMerchant] = useState<string>('')
  const [selectedMethod, setSelectedMethod] = useState<string>('')
  const [transactionAmount, setTransactionAmount] = useState<string>('1000')
  const [transactionCount, setTransactionCount] = useState<string>('1')
  const [useRandomData, setUseRandomData] = useState(true)
  const [orderId, setOrderId] = useState<string>('')
  const [callbackUrl, setCallbackUrl] = useState<string>('')
  
  // Payout creation form
  const [payoutAmount, setPayoutAmount] = useState<string>('5000')
  const [payoutWallet, setPayoutWallet] = useState<string>('')
  const [payoutCount, setPayoutCount] = useState<string>('1')
  
  // Device emulation
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const [emulatedDevices, setEmulatedDevices] = useState<Set<string>>(new Set())
  
  // Notification simulation
  const [selectedTransaction, setSelectedTransaction] = useState<string>('')
  const [notificationDialog, setNotificationDialog] = useState(false)

  useEffect(() => {
    fetchTestData()
  }, [])

  const fetchTestData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch test merchants
      const merchantsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/merchants`, {
        headers: { 'x-admin-key': adminToken || '' }
      })
      const merchantsData = await merchantsRes.json()
      setTestMerchants(merchantsData.merchants.filter((m: any) => m.name.includes('Test') || m.name.includes('test')))
      
      // Fetch methods
      const methodsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/methods`, {
        headers: { 'x-admin-key': adminToken || '' }
      })
      const methodsData = await methodsRes.json()
      setMethods(methodsData)
      
      // Fetch devices
      const devicesRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/devices`, {
        headers: { 'x-admin-key': adminToken || '' }
      })
      const devicesData = await devicesRes.json()
      setDevices(devicesData)
      
      // Fetch mock transactions
      await fetchMockTransactions()
      await fetchMockPayouts()
      
    } catch (error) {
      toast.error('Ошибка загрузки тестовых данных')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMockTransactions = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/test/transactions`, {
        headers: { 'x-admin-key': adminToken || '' }
      })
      const data = await res.json()
      setMockTransactions(data)
    } catch (error) {
      console.error('Error fetching mock transactions:', error)
    }
  }

  const fetchMockPayouts = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/test/payouts`, {
        headers: { 'x-admin-key': adminToken || '' }
      })
      const data = await res.json()
      setMockPayouts(data)
    } catch (error) {
      console.error('Error fetching mock payouts:', error)
    }
  }

  const createMockTransaction = async () => {
    try {
      setIsLoading(true)
      const merchant = testMerchants.find(m => m.id === selectedMerchant)
      if (!merchant) {
        toast.error('Выберите тестового мерчанта')
        return
      }

      const count = parseInt(transactionCount) || 1
      
      for (let i = 0; i < count; i++) {
        const orderIdToUse = useRandomData ? `TEST-${Date.now()}-${i}` : orderId
        const amountToUse = useRandomData ? Math.floor(Math.random() * 10000) + 1000 : parseFloat(transactionAmount)
        
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/merchant/transactions/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${merchant.token}`
          },
          body: JSON.stringify({
            amount: amountToUse,
            orderId: orderIdToUse,
            methodId: selectedMethod,
            rate: 95.5,
            expired_at: new Date(Date.now() + 86400000).toISOString(),
            callbackUri: callbackUrl || undefined,
            isMock: true // Флаг для пометки как тестовой
          })
        })
        
        if (!res.ok) throw new Error('Ошибка создания транзакции')
      }
      
      toast.success(`Создано ${count} тестовых транзакций`)
      await fetchMockTransactions()
    } catch (error) {
      toast.error('Ошибка создания транзакции')
    } finally {
      setIsLoading(false)
    }
  }

  const createMockPayout = async () => {
    try {
      setIsLoading(true)
      const merchant = testMerchants.find(m => m.id === selectedMerchant)
      if (!merchant) {
        toast.error('Выберите тестового мерчанта')
        return
      }

      const count = parseInt(payoutCount) || 1
      
      for (let i = 0; i < count; i++) {
        const walletToUse = useRandomData ? `4111111111111${(1000 + i).toString().slice(-3)}` : payoutWallet
        const amountToUse = useRandomData ? Math.floor(Math.random() * 20000) + 1000 : parseFloat(payoutAmount)
        
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/merchant/payouts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${merchant.token}`
          },
          body: JSON.stringify({
            amount: amountToUse,
            wallet: walletToUse,
            bank: 'SBERBANK',
            isCard: true,
            merchantRate: 96.5,
            externalReference: `PAYOUT-TEST-${Date.now()}-${i}`,
            isMock: true
          })
        })
        
        if (!res.ok) throw new Error('Ошибка создания выплаты')
      }
      
      toast.success(`Создано ${count} тестовых выплат`)
      await fetchMockPayouts()
    } catch (error) {
      toast.error('Ошибка создания выплаты')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteAllMockData = async () => {
    if (!confirm('Удалить все тестовые транзакции и выплаты?')) return
    
    try {
      setIsLoading(true)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/test/delete-all`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminToken || '' }
      })
      
      if (!res.ok) throw new Error('Ошибка удаления')
      
      toast.success('Все тестовые данные удалены')
      await fetchMockTransactions()
      await fetchMockPayouts()
    } catch (error) {
      toast.error('Ошибка удаления данных')
    } finally {
      setIsLoading(false)
    }
  }

  const emulateDevice = async (deviceId: string) => {
    try {
      const device = devices.find(d => d.id === deviceId)
      if (!device) return
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/test/emulate-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || ''
        },
        body: JSON.stringify({ deviceToken: device.token })
      })
      
      if (!res.ok) throw new Error('Ошибка эмуляции')
      
      setEmulatedDevices(prev => new Set(prev).add(deviceId))
      toast.success('Устройство подключено к эмуляции')
    } catch (error) {
      toast.error('Ошибка эмуляции устройства')
    }
  }

  const simulateNotification = async () => {
    try {
      const transaction = mockTransactions.find(t => t.id === selectedTransaction)
      if (!transaction) {
        toast.error('Выберите транзакцию')
        return
      }
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/test/simulate-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || ''
        },
        body: JSON.stringify({
          transactionId: transaction.id,
          amount: transaction.amount,
          bankType: transaction.bankType || 'SBERBANK'
        })
      })
      
      if (!res.ok) throw new Error('Ошибка симуляции')
      
      toast.success('Уведомление отправлено')
      setNotificationDialog(false)
      await fetchMockTransactions()
    } catch (error) {
      toast.error('Ошибка симуляции уведомления')
    }
  }

  const renderTransactionDetails = (transaction: Transaction) => {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">Детали</Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Детали транзакции #{transaction.numericId}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="space-y-4">
              {Object.entries(transaction).map(([key, value]) => (
                <div key={key} className="grid grid-cols-2 gap-2 p-2 rounded bg-gray-50">
                  <span className="font-medium">{key}:</span>
                  <span className="font-mono text-sm">
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Тестирование транзакций</h1>
        <Button
          variant="destructive"
          onClick={deleteAllMockData}
          disabled={isLoading}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Удалить все тестовые данные
        </Button>
      </div>

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="transactions">Транзакции</TabsTrigger>
          <TabsTrigger value="payouts">Выплаты</TabsTrigger>
          <TabsTrigger value="devices">Устройства</TabsTrigger>
          <TabsTrigger value="history">История</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Создание тестовых транзакций</CardTitle>
              <CardDescription>
                Используйте реальные API мерчанта для создания транзакций
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Тестовый мерчант</Label>
                  <Select value={selectedMerchant} onValueChange={setSelectedMerchant}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите мерчанта" />
                    </SelectTrigger>
                    <SelectContent>
                      {testMerchants.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Метод оплаты</Label>
                  <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите метод" />
                    </SelectTrigger>
                    <SelectContent>
                      {methods.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Сумма (RUB)</Label>
                  <Input
                    type="number"
                    value={transactionAmount}
                    onChange={(e) => setTransactionAmount(e.target.value)}
                    disabled={useRandomData}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Количество</Label>
                  <Input
                    type="number"
                    value={transactionCount}
                    onChange={(e) => setTransactionCount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Order ID</Label>
                  <Input
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="TEST-123"
                    disabled={useRandomData}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Callback URL</Label>
                  <Input
                    value={callbackUrl}
                    onChange={(e) => setCallbackUrl(e.target.value)}
                    placeholder="https://example.com/callback"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={useRandomData}
                  onCheckedChange={setUseRandomData}
                />
                <Label>Использовать случайные данные</Label>
              </div>

              <Button
                onClick={createMockTransaction}
                disabled={isLoading || !selectedMerchant || !selectedMethod}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                Создать транзакции
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Тестовые транзакции</CardTitle>
              <CardDescription>
                Все транзакции созданные через эту страницу
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Мерчант</TableHead>
                    <TableHead>Трейдер</TableHead>
                    <TableHead>Создана</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockTransactions.map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono">#{tx.numericId}</TableCell>
                      <TableCell>{tx.amount} ₽</TableCell>
                      <TableCell>
                        <Badge variant={tx.status === 'READY' ? 'success' : 'default'}>
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{tx.merchantId?.slice(0, 8)}...</TableCell>
                      <TableCell>{tx.traderId?.slice(0, 8) || '-'}</TableCell>
                      <TableCell>{new Date(tx.createdAt).toLocaleString('ru')}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {renderTransactionDetails(tx)}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTransaction(tx.id)
                              setNotificationDialog(true)
                            }}
                          >
                            <Bell className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Создание тестовых выплат</CardTitle>
              <CardDescription>
                Создание выплат через API мерчанта
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Сумма (RUB)</Label>
                  <Input
                    type="number"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    disabled={useRandomData}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Количество</Label>
                  <Input
                    type="number"
                    value={payoutCount}
                    onChange={(e) => setPayoutCount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Номер карты</Label>
                  <Input
                    value={payoutWallet}
                    onChange={(e) => setPayoutWallet(e.target.value)}
                    placeholder="4111111111111111"
                    disabled={useRandomData}
                  />
                </div>
              </div>

              <Button
                onClick={createMockPayout}
                disabled={isLoading || !selectedMerchant}
                className="w-full"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Создать выплаты
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Тестовые выплаты</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Трейдер</TableHead>
                    <TableHead>Профит</TableHead>
                    <TableHead>Создана</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockPayouts.map(payout => (
                    <TableRow key={payout.id}>
                      <TableCell className="font-mono">{payout.id.slice(0, 8)}...</TableCell>
                      <TableCell>{payout.amount} ₽</TableCell>
                      <TableCell>
                        <Badge>{payout.status}</Badge>
                      </TableCell>
                      <TableCell>{payout.traderId?.slice(0, 8) || '-'}</TableCell>
                      <TableCell>{payout.profit || '-'} USDT</TableCell>
                      <TableCell>{new Date(payout.createdAt).toLocaleString('ru')}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">Детали</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Эмуляция устройств</CardTitle>
              <CardDescription>
                Подключите устройства для тестирования уведомлений
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {devices.map(device => (
                  <div key={device.id} className="flex items-center justify-between p-4 border rounded">
                    <div>
                      <p className="font-medium">{device.name}</p>
                      <p className="text-sm text-gray-500">Token: {device.token.slice(0, 20)}...</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={device.isOnline ? 'success' : 'secondary'}>
                        {device.isOnline ? 'Онлайн' : 'Офлайн'}
                      </Badge>
                      <Button
                        variant={emulatedDevices.has(device.id) ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => emulateDevice(device.id)}
                        disabled={emulatedDevices.has(device.id)}
                      >
                        <Smartphone className="h-4 w-4 mr-2" />
                        {emulatedDevices.has(device.id) ? 'Эмулируется' : 'Эмулировать'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>История всех операций</CardTitle>
              <CardDescription>
                Полная информация о всех тестовых транзакциях
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {[...mockTransactions, ...mockPayouts]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map(item => (
                      <div key={item.id} className="border rounded p-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium">
                            {item.type === 'IN' ? 'Транзакция' : 'Выплата'} #{item.numericId || item.id}
                          </span>
                          <Badge>{item.status}</Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>Сумма: {item.amount} ₽</p>
                          <p>Создана: {new Date(item.createdAt).toLocaleString('ru')}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Диалог симуляции уведомления */}
      <Dialog open={notificationDialog} onOpenChange={setNotificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Симуляция банковского уведомления</DialogTitle>
            <DialogDescription>
              Отправить уведомление для выбранной транзакции
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <p>Будет создано уведомление для транзакции:</p>
            {selectedTransaction && (
              <div className="bg-gray-50 p-4 rounded">
                <p>ID: {mockTransactions.find(t => t.id === selectedTransaction)?.numericId}</p>
                <p>Сумма: {mockTransactions.find(t => t.id === selectedTransaction)?.amount} ₽</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotificationDialog(false)}>
              Отмена
            </Button>
            <Button onClick={simulateNotification}>
              <Bell className="h-4 w-4 mr-2" />
              Отправить уведомление
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}