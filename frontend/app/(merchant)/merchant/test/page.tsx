"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, Play, Square, AlertCircle, Plus, DollarSign, CreditCard } from "lucide-react"
import { merchantApi } from "@/services/api"
import { useMerchantAuth } from "@/stores/merchant-auth"

interface Method {
  id: string
  code: string
  name: string
  type: string
  currency: string
  isEnabled: boolean
}

export default function MerchantTestPage() {
  const [methods, setMethods] = useState<Method[]>([])
  const [loading, setLoading] = useState(false)
  const [methodId, setMethodId] = useState("")
  const [amount, setAmount] = useState("")
  const [orderId, setOrderId] = useState("")
  const [callbackUri, setCallbackUri] = useState("")
  const [clientIdentifier, setClientIdentifier] = useState("")
  const [autoCreate, setAutoCreate] = useState({ IN: false, OUT: false })
  const [minDelay, setMinDelay] = useState({ IN: "5", OUT: "10" })
  const [maxDelay, setMaxDelay] = useState({ IN: "15", OUT: "30" })
  const [batchCount, setBatchCount] = useState("5")
  const [traderStats, setTraderStats] = useState<any>(null)
  const { token: merchantToken } = useMerchantAuth()

  useEffect(() => {
    fetchMethods()
    fetchTraderStats()
  }, [])

  const fetchMethods = async () => {
    try {
      const response = await merchantApi.getMethods()
      setMethods(response.filter((m: Method) => m.isEnabled))
      if (response.length > 0 && !methodId) {
        setMethodId(response[0].id)
      }
    } catch (error) {
      toast.error("Не удалось загрузить методы оплаты")
    }
  }

  const fetchTraderStats = async () => {
    try {
      const response = await merchantApi.getTraderStats()
      setTraderStats(response)
    } catch (error) {
      console.error("Failed to fetch trader stats:", error)
    }
  }

  const generateOrderId = () => {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `TEST_${timestamp}_${random}`
  }

  const createPayout = async () => {
    if (!methodId) {
      toast.error("Выберите метод оплаты")
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Введите корректную сумму")
      return
    }

    setLoading(true)
    try {
      const data: any = {
        methodId,
        amount: parseFloat(amount),
        wallet: "4111111111111111", // Тестовая карта
        bank: "SBERBANK",
        isCard: true,
        merchantRate: 95 + Math.random() * 10,
        externalReference: orderId || generateOrderId(),
      }

      if (callbackUri) {
        data.webhookUrl = callbackUri
      }

      if (clientIdentifier) {
        data.clientIdentifier = clientIdentifier
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/merchant/payouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': merchantToken || ''
        },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        const result = await response.json()
        toast.success("Тестовая выплата создана", {
          description: `ID: ${result.payout?.id || result.id}`
        })
        setOrderId("")
        setClientIdentifier("")
      } else {
        const error = await response.json()
        toast.error(error.error || "Ошибка создания выплаты")
      }
    } catch (error) {
      toast.error("Не удалось создать выплату")
    } finally {
      setLoading(false)
    }
  }

  const createTransaction = async (type: 'IN' | 'OUT') => {
    if (!methodId) {
      toast.error("Выберите метод оплаты")
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Введите корректную сумму")
      return
    }

    setLoading(true)
    try {
      const data: any = {
        methodId,
        amount: parseFloat(amount),
        orderId: orderId || generateOrderId(),
        rate: 95 + Math.random() * 10, // Добавляем обязательный параметр rate
        expired_at: new Date(Date.now() + 3600000).toISOString(), // 1 час от текущего времени
        userIp: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      }

      if (callbackUri) {
        data.callbackUri = callbackUri
      }

      if (clientIdentifier) {
        data.clientIdentifier = clientIdentifier
      }

      const endpoint = type === 'IN' ? 'in' : 'out'
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/merchant/transactions/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-merchant-api-key': merchantToken || ''
        },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`Тестовая ${type === 'IN' ? 'сделка' : 'выплата'} создана`, {
          description: `ID: ${result.id}`
        })
        setOrderId("")
      } else {
        const error = await response.json()
        toast.error(error.error || "Ошибка создания транзакции")
      }
    } catch (error) {
      toast.error("Не удалось создать транзакцию")
    } finally {
      setLoading(false)
    }
  }

  const createBatch = async (type: 'IN' | 'OUT') => {
    const count = parseInt(batchCount)
    if (isNaN(count) || count <= 0) {
      toast.error("Введите корректное количество")
      return
    }

    setLoading(true)
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < count; i++) {
      try {
        const data: any = {
          methodId,
          amount: Math.floor(Math.random() * 9000) + 1000,
          orderId: generateOrderId(),
          rate: 95 + Math.random() * 10, // Добавляем обязательный параметр rate
          expired_at: new Date(Date.now() + 3600000).toISOString(), // 1 час от текущего времени
          userIp: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        }

        if (callbackUri) {
          data.callbackUri = callbackUri
        }

        // Для пакетного создания генерируем случайные clientIdentifier
        if (Math.random() > 0.3) { // 70% транзакций будут с clientIdentifier
          data.clientIdentifier = `client_${Math.floor(Math.random() * 1000)}_${i}`;
        }

        const endpoint = type === 'IN' ? 'in' : 'out'
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/merchant/transactions/${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-merchant-api-key': merchantToken || ''
          },
          body: JSON.stringify(data)
        })

        if (response.ok) {
          successCount++
        } else {
          errorCount++
        }

        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        errorCount++
      }
    }

    setLoading(false)
    toast.success('Пакетное создание завершено', {
      description: `Успешно: ${successCount}, Ошибок: ${errorCount}`
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Тестирование API</h1>
        <p className="text-muted-foreground">Создание тестовых транзакций для проверки интеграции</p>
      </div>

      {/* Trader Stats */}
      {traderStats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Доступные трейдеры</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{traderStats.available || 0}</div>
              <p className="text-xs text-muted-foreground">Готовы принимать платежи</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Общий баланс</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{traderStats.totalBalance || 0} USDT</div>
              <p className="text-xs text-muted-foreground">Доступно для выплат</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Страховой депозит</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{traderStats.totalDeposit || 0} USDT</div>
              <p className="text-xs text-muted-foreground">Защита транзакций</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="single" className="space-y-4">
        <TabsList>
          <TabsTrigger value="single">Одиночные транзакции</TabsTrigger>
          <TabsTrigger value="batch">Пакетное создание</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Создание тестовой транзакции</CardTitle>
              <CardDescription>
                Создайте одиночную транзакцию с указанными параметрами
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Метод оплаты</Label>
                  <Select value={methodId} onValueChange={setMethodId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите метод" />
                    </SelectTrigger>
                    <SelectContent>
                      {methods.map((method) => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.name} ({method.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Сумма</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="1000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Order ID (опционально)</Label>
                  <Input
                    placeholder="Автогенерация"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Callback URI (опционально)</Label>
                  <Input
                    placeholder="https://example.com/callback"
                    value={callbackUri}
                    onChange={(e) => setCallbackUri(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Идентификатор клиента (опционально)</Label>
                  <Input
                    placeholder="client_user_12345"
                    value={clientIdentifier}
                    onChange={(e) => setClientIdentifier(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Используется для определения типа трафика (первичный/вторичный/VIP)
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => createTransaction('IN')}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Plus className="mr-2 h-4 w-4" />
                  Создать сделку (IN)
                </Button>
                <Button
                  onClick={createPayout}
                  disabled={loading}
                  variant="outline"
                  className="flex-1"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <CreditCard className="mr-2 h-4 w-4" />
                  Создать выплату (Payouts API)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Пакетное создание</CardTitle>
              <CardDescription>
                Создайте несколько транзакций со случайными параметрами
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Будут созданы транзакции со случайными суммами от 1000 до 10000 ₽
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Количество транзакций</Label>
                <Input
                  type="number"
                  placeholder="5"
                  value={batchCount}
                  onChange={(e) => setBatchCount(e.target.value)}
                  min="1"
                  max="50"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => createBatch('IN')}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Создать {batchCount} сделок
                </Button>
                <Button
                  onClick={() => createBatch('OUT')}
                  disabled={loading}
                  variant="outline"
                  className="flex-1"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Создать {batchCount} выплат
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}