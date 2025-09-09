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
  const [callbacksDoc, setCallbacksDoc] = useState<any>(null)
  const [constants, setConstants] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("endpoints")

  useEffect(() => {
    fetchApiDocs()
  }, [])

  const fetchApiDocs = async () => {
    try {
      setLoading(true)
      const [endpointsData, callbackData, callbacksDocData, constantsData] = await Promise.all([
        aggregatorApi.getApiEndpoints(),
        aggregatorApi.getCallbackFormat(),
        aggregatorApi.getCallbacks(),
        aggregatorApi.getApiConstants(),
      ])
      setApiEndpoints(endpointsData)
      setCallbackFormat(callbackData)
      setCallbacksDoc(callbacksDocData)
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
      POST: "bg-green-100 text-green-800",
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
                          <h5 className="font-medium mb-1 text-green-600">✅ Успешный ответ (HTTP {endpoint.response.success.status || 200}):</h5>
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
          {callbacksDoc && (
            <>
              {/* Обзор */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📞 {callbacksDoc.title}
                  </CardTitle>
                  <CardDescription>
                    {callbacksDoc.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <h4 className="font-semibold mb-2">Назначение:</h4>
                      <p className="text-muted-foreground">{callbacksDoc.overview?.purpose}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Частота:</h4>
                      <p className="text-muted-foreground">{callbacksDoc.overview?.frequency}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Надежность:</h4>
                      <p className="text-muted-foreground">{callbacksDoc.overview?.reliability}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Авторизация */}
              <Card>
                <CardHeader>
                  <CardTitle>🔐 Авторизация</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Метод:</h4>
                    <Badge variant="outline">{callbacksDoc.authentication?.method}</Badge>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Заголовок:</h4>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted px-3 py-2 rounded text-sm flex-1">
                        {callbacksDoc.authentication?.header}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(callbacksDoc.authentication?.token, "Callback Token")}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Ваш Callback Token:</h4>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted px-3 py-2 rounded text-sm flex-1 font-mono">
                        {callbacksDoc.authentication?.token}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(callbacksDoc.authentication?.token, "Callback Token")}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      ⚠️ {callbacksDoc.authentication?.security}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Endpoints */}
              {callbacksDoc.endpoints?.map((endpoint: any, index: number) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {getMethodBadge(endpoint.method)}
                      {endpoint.title}
                    </CardTitle>
                    <CardDescription>{endpoint.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">URL:</h4>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-3 py-2 rounded text-sm flex-1">
                          {endpoint.method} {endpoint.url}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(endpoint.url, "URL")}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {endpoint.headers && (
                      <div>
                        <h4 className="font-semibold mb-2">Заголовки:</h4>
                        <div className="bg-muted p-3 rounded text-sm">
                          <pre>{JSON.stringify(endpoint.headers, null, 2)}</pre>
                        </div>
                      </div>
                    )}

                    {endpoint.requestBody && (
                      <div>
                        <h4 className="font-semibold mb-2">Формат запроса:</h4>
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">{endpoint.requestBody.description}</p>
                          
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium">Поля:</h5>
                            <div className="grid gap-2">
                              {Object.entries(endpoint.requestBody.properties || {}).map(([key, prop]: [string, any]) => (
                                <div key={key} className="flex items-start gap-3 p-2 bg-muted/50 rounded">
                                  <code className="text-sm font-mono bg-white px-2 py-1 rounded">{key}</code>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <Badge variant={prop.required ? "default" : "secondary"} className="text-xs">
                                        {prop.type}
                                      </Badge>
                                      {prop.required && <Badge variant="destructive" className="text-xs">обязательно</Badge>}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{prop.description}</p>
                                    {prop.example && (
                                      <code className="text-xs bg-white px-1 py-0.5 rounded mt-1 inline-block">
                                        {typeof prop.example === 'string' ? prop.example : JSON.stringify(prop.example)}
                                      </code>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {endpoint.requestBody.examples && (
                            <div>
                              <h5 className="text-sm font-medium mb-2">Примеры:</h5>
                              <div className="space-y-3">
                                {endpoint.requestBody.examples.map((example: any, exIndex: number) => (
                                  <div key={exIndex} className="border rounded-lg p-3">
                                    <h6 className="font-medium text-sm mb-1">{example.title}</h6>
                                    <p className="text-xs text-muted-foreground mb-2">{example.description}</p>
                                    <div className="bg-muted p-3 rounded text-sm">
                                      <pre>{JSON.stringify(example.body, null, 2)}</pre>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {endpoint.responses && (
                      <div>
                        <h4 className="font-semibold mb-2">Ответы:</h4>
                        <div className="space-y-3">
                          {Object.entries(endpoint.responses).map(([type, response]: [string, any]) => (
                            <div key={type} className="border rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={type === 'success' ? 'default' : type === 'error' ? 'destructive' : 'secondary'}>
                                  {response.status}
                                </Badge>
                                <span className="text-sm font-medium">{response.description}</span>
                              </div>
                              <div className="bg-muted p-3 rounded text-sm">
                                <pre>{JSON.stringify(response.body, null, 2)}</pre>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Переходы статусов */}
              {callbacksDoc.statusTransitions && (
                <Card>
                  <CardHeader>
                    <CardTitle>🔄 {callbacksDoc.statusTransitions.title}</CardTitle>
                    <CardDescription>{callbacksDoc.statusTransitions.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {Object.entries(callbacksDoc.statusTransitions.transitions).map(([status, transition]: [string, any]) => (
                        <div key={status} className="border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge>{status}</Badge>
                            <span className="text-sm text-muted-foreground">{transition.description}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Можно изменить на:</span>
                            {transition.allowed.length > 0 ? (
                              <div className="flex gap-1 flex-wrap">
                                {transition.allowed.map((allowedStatus: string) => (
                                  <Badge key={allowedStatus} variant="outline" className="text-xs">
                                    {allowedStatus}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Финальный статус</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Лучшие практики */}
              {callbacksDoc.bestPractices && (
                <Card>
                  <CardHeader>
                    <CardTitle>✅ {callbacksDoc.bestPractices.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {callbacksDoc.bestPractices.recommendations.map((practice: any, index: number) => (
                        <div key={index} className="border rounded-lg p-3">
                          <h5 className="font-medium text-sm mb-1">{practice.title}</h5>
                          <p className="text-sm text-muted-foreground">{practice.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Решение проблем */}
              {callbacksDoc.troubleshooting && (
                <Card>
                  <CardHeader>
                    <CardTitle>🔧 {callbacksDoc.troubleshooting.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {callbacksDoc.troubleshooting.commonIssues.map((issue: any, index: number) => (
                        <div key={index} className="border rounded-lg p-3">
                          <h5 className="font-medium text-sm mb-1 text-red-600">{issue.issue}</h5>
                          <p className="text-sm text-muted-foreground">{issue.solution}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Тестирование */}
              {callbacksDoc.testing && (
                <Card>
                  <CardHeader>
                    <CardTitle>🧪 {callbacksDoc.testing.title}</CardTitle>
                    <CardDescription>{callbacksDoc.testing.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {callbacksDoc.testing.tools.map((tool: any, index: number) => (
                        <div key={index} className="border rounded-lg p-3">
                          <h5 className="font-medium text-sm mb-2">{tool.name}</h5>
                          {tool.example && (
                            <div className="bg-muted p-3 rounded text-sm">
                              <pre className="whitespace-pre-wrap">{tool.example}</pre>
                            </div>
                          )}
                          {tool.description && (
                            <p className="text-sm text-muted-foreground mt-2">{tool.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
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