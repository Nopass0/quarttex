"use client"

import { useEffect, useState } from "react"
import { useAggregatorAuth } from "@/stores/aggregator-auth"
import { aggregatorApi } from "@/services/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  BookOpen, 
  Copy, 
  Globe, 
  Code,
  Loader2
} from "lucide-react"
import { toast } from "sonner"

export default function AggregatorApiDocs() {
  const aggregator = useAggregatorAuth()
  const [apiEndpoints, setApiEndpoints] = useState<any>(null)
  const [callbackFormat, setCallbackFormat] = useState<any>(null)
  const [constants, setConstants] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("endpoints")

  useEffect(() => {
    fetchApiDocs()
  }, [])

  const fetchApiDocs = async () => {
    try {
      setLoading(true)
      const [endpointsData, callbackData, constantsData] = await Promise.all([
        aggregatorApi.getApiEndpoints(),
        aggregatorApi.getCallbackFormat(),
        aggregatorApi.getApiConstants(),
      ])
      setApiEndpoints(endpointsData)
      setCallbackFormat(callbackData)
      setConstants(constantsData)
    } catch (error) {
      console.error("Error fetching API docs:", error)
      toast.error("Ошибка загрузки документации")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} скопирован`)
  }

  const getMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      GET: "bg-blue-100 text-blue-800",
      POST: "bg-purple-100 text-purple-800",
      PUT: "bg-yellow-100 text-yellow-800",
      DELETE: "bg-red-100 text-red-800",
    }
    return (
      <Badge className={colors[method] || "bg-gray-100 text-gray-800"}>
        {method}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[#006039] mb-2 flex items-center justify-center gap-2">
          <BookOpen className="h-8 w-8" />
          API Документация для агрегаторов
        </h1>
        <p className="text-muted-foreground">
          Техническая документация для интеграции
        </p>
      </div>

      {/* Конфигурация */}
      <Card className="border-[#006039]/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5 text-[#006039]" />
            Ваши данные для интеграции
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Ваш API токен (для исходящих запросов):</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono">
                {aggregator.apiToken}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(aggregator.apiToken, "API токен")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Ваш базовый URL:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted px-3 py-2 rounded text-sm">
                {aggregator.apiBaseUrl || "https://your-api.com"}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(aggregator.apiBaseUrl || "", "URL")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">URL для коллбеков (куда отправлять обновления):</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted px-3 py-2 rounded text-sm">
                https://chasepay.pro/api/aggregators/callback
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard("https://chasepay.pro/api/aggregators/callback", "Callback URL")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Основные табы */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="callbacks">Callbacks</TabsTrigger>
          <TabsTrigger value="banks">Банки</TabsTrigger>
          <TabsTrigger value="statuses">Статусы</TabsTrigger>
        </TabsList>

        {/* Endpoints которые должен реализовать агрегатор */}
        <TabsContent value="endpoints" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Endpoints которые вы должны реализовать
              </CardTitle>
              <CardDescription>
                Все endpoints должны отвечать за ≤ 2 секунды и возвращать HTTP 2xx
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {apiEndpoints?.endpoints?.map((endpoint: any, index: number) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    {getMethodBadge(endpoint.method)}
                    <code className="text-lg font-semibold">{endpoint.path}</code>
                  </div>
                  <p className="text-muted-foreground">{endpoint.description}</p>
                  
                  {/* Headers */}
                  {endpoint.headers && (
                    <div>
                      <h4 className="font-semibold mb-2">Заголовки:</h4>
                      <div className="bg-muted p-3 rounded text-sm">
                        <pre>{JSON.stringify(endpoint.headers, null, 2)}</pre>
                      </div>
                    </div>
                  )}

                  {/* Request Body */}
                  {endpoint.request && (
                    <div>
                      <h4 className="font-semibold mb-2">Тело запроса:</h4>
                      <div className="bg-muted p-3 rounded text-sm">
                        <pre>{JSON.stringify(endpoint.request.example || endpoint.request.body, null, 2)}</pre>
                      </div>
                      {endpoint.request.body && (
                        <div className="mt-2">
                          <h5 className="font-medium mb-1">Описание полей:</h5>
                          <div className="bg-muted p-3 rounded text-sm">
                            <pre>{JSON.stringify(endpoint.request.body, null, 2)}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Response Body */}
                  {endpoint.response && (
                    <div>
                      <h4 className="font-semibold mb-2">Тело ответа:</h4>
                      {endpoint.response.success && (
                        <div className="mb-3">
                          <h5 className="font-medium mb-1 text-purple-600">✅ Успешный ответ (HTTP {endpoint.response.success.status || 200}):</h5>
                          <div className="bg-muted p-3 rounded text-sm">
                            <pre>{JSON.stringify(endpoint.response.success.example || endpoint.response.success.body, null, 2)}</pre>
                          </div>
                        </div>
                      )}
                      {endpoint.response.error && (
                        <div>
                          <h5 className="font-medium mb-1 text-red-600">❌ Ошибка (HTTP {endpoint.response.error.status || 400}):</h5>
                          <div className="bg-muted p-3 rounded text-sm">
                            <pre>{JSON.stringify(endpoint.response.error.body, null, 2)}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Requirements */}
                  {endpoint.requirements && (
                    <div>
                      <h4 className="font-semibold mb-2">Требования:</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {endpoint.requirements.map((requirement: string, i: number) => (
                          <li key={i}>{requirement}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Key Points */}
                  {endpoint.keyPoints && (
                    <div>
                      <h4 className="font-semibold mb-2">Важные моменты:</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {endpoint.keyPoints.map((point: string, i: number) => (
                          <li key={i}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Callbacks */}
        <TabsContent value="callbacks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Как отправлять callbacks</CardTitle>
              <CardDescription>
                Отправляйте обновления статуса сделок на наш endpoint
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">URL:</h4>
                <code className="bg-muted px-3 py-2 rounded text-sm block">
                  POST https://chspay.pro/api/aggregators/callback
                </code>
              </div>

              {callbackFormat?.headers && (
                <div>
                  <h4 className="font-semibold mb-2">Заголовки:</h4>
                  <div className="bg-muted p-3 rounded text-sm">
                    <pre>{JSON.stringify(callbackFormat.headers, null, 2)}</pre>
                  </div>
                </div>
              )}

              {callbackFormat?.requestBody && (
                <div>
                  <h4 className="font-semibold mb-2">Тело запроса:</h4>
                  <div className="bg-muted p-3 rounded text-sm">
                    <pre>{JSON.stringify(callbackFormat.requestBody, null, 2)}</pre>
                  </div>
                </div>
              )}

              {callbackFormat?.examples && (
                <div>
                  <h4 className="font-semibold mb-2">Примеры:</h4>
                  {callbackFormat.examples.map((example: any, index: number) => (
                    <div key={index} className="mb-4">
                      <p className="text-sm text-muted-foreground mb-2">{example.description}</p>
                      <div className="bg-muted p-3 rounded text-sm">
                        <pre>{JSON.stringify(example.data, null, 2)}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Банки */}
        <TabsContent value="banks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Константы банков</CardTitle>
              <CardDescription>
                Все доступные банки в системе
              </CardDescription>
            </CardHeader>
            <CardContent>
              {constants?.banks ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(constants.banks).map(([key, bank]: [string, any]) => (
                    <div key={key} className="border rounded p-3">
                      <div className="font-semibold">{key}</div>
                      <div className="text-sm text-muted-foreground">{bank.name}</div>
                      {bank.code && (
                        <div className="text-xs text-muted-foreground">Код: {bank.code}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Загрузка констант банков...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Статусы */}
        <TabsContent value="statuses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Статусы сделок</CardTitle>
              <CardDescription>
                Все возможные статусы сделок в системе
              </CardDescription>
            </CardHeader>
            <CardContent>
              {constants?.statuses ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(constants.statuses).map(([key, status]: [string, any]) => (
                    <div key={key} className="border rounded p-3">
                      <div className="font-semibold">{key}</div>
                      <div className="text-sm text-muted-foreground">{status.description || status}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Загрузка статусов...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}