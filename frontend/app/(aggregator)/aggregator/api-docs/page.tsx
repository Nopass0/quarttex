"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { toast } from "sonner"
import { aggregatorApi } from "@/services/api"
import { useAggregatorAuth } from "@/stores/aggregator-auth"
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle,
  Code,
  Copy,
  FileJson,
  Globe,
  Info,
  Loader2,
  Server,
  Webhook,
} from "lucide-react"

interface ApiEndpoint {
  method: string
  path: string
  url: string
  description: string
  headers: Record<string, string>
  requestBody?: any
  responseBody?: any
  errors?: Record<string, string>
}

interface ApiDocs {
  baseUrl: string
  description: string
  endpoints: ApiEndpoint[]
}

interface ApiConstants {
  description: string
  bankTypes: { description: string; values: string[] }
  methodTypes: { description: string; values: string[] }
  transactionStatuses: { description: string; values: string[] }
  currencies: { description: string; values: string[] }
}

interface CallbackFormat {
  description: string
  callbackUrl: string
  method: string
  headers: Record<string, string>
  requestBody: any
  expectedResponse: any
  notes: string[]
}

interface IntegrationFlow {
  description: string
  steps: Array<{ step: number; title: string; description: string }>
  errorHandling: Record<string, string>
  bestPractices: string[]
}

export default function AggregatorApiDocs() {
  const aggregator = useAggregatorAuth()
  const [apiDocs, setApiDocs] = useState<ApiDocs | null>(null)
  const [constants, setConstants] = useState<ApiConstants | null>(null)
  const [callbackFormat, setCallbackFormat] = useState<CallbackFormat | null>(null)
  const [integrationFlow, setIntegrationFlow] = useState<IntegrationFlow | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("endpoints")

  useEffect(() => {
    fetchApiDocs()
  }, [])

  const fetchApiDocs = async () => {
    try {
      setLoading(true)
      const [endpointsData, constantsData, callbackData, flowData] = await Promise.all([
        aggregatorApi.getApiEndpoints(),
        aggregatorApi.getApiConstants(),
        aggregatorApi.getCallbackFormat(),
        aggregatorApi.getIntegrationFlow(),
      ])
      setApiDocs(endpointsData)
      setConstants(constantsData)
      setCallbackFormat(callbackData)
      setIntegrationFlow(flowData)
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
      PATCH: "bg-orange-100 text-orange-800",
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-[purple-600]" />
          API Документация
        </h1>
        <p className="text-muted-foreground">
          Документация для интеграции с нашей платформой
        </p>
      </div>

      {/* Base URL Card */}
      <Card className="border-[purple-600]/20 bg-gradient-to-r from-[purple-600]/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5 text-[purple-600]" />
            Конфигурация интеграции
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <p className="text-sm text-muted-foreground mb-2">API токен для авторизации:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono">
                {aggregator.apiToken ? `${aggregator.apiToken.substring(0, 20)}...` : "Не установлен"}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(aggregator.apiToken || "", "API токен")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="endpoints">Эндпоинты</TabsTrigger>
          <TabsTrigger value="constants">Константы</TabsTrigger>
          <TabsTrigger value="callbacks">Колбэки</TabsTrigger>
          <TabsTrigger value="flow">Схема работы</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Эндпоинты</CardTitle>
              <CardDescription>
                Эндпоинты, которые должен реализовать ваш агрегатор
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {apiDocs?.endpoints.map((endpoint, index) => (
                  <AccordionItem key={index} value={`endpoint-${index}`}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-3">
                        {getMethodBadge(endpoint.method)}
                        <code className="text-sm font-mono">{endpoint.path}</code>
                        <span className="text-sm text-muted-foreground">
                          {endpoint.description}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-4">
                        <div>
                          <h4 className="font-semibold mb-2">URL:</h4>
                          <code className="block bg-muted p-3 rounded text-sm">
                            {endpoint.url}
                          </code>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">Headers:</h4>
                          <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                            {JSON.stringify(endpoint.headers, null, 2)}
                          </pre>
                        </div>

                        {endpoint.requestBody && (
                          <div>
                            <h4 className="font-semibold mb-2">Request Body:</h4>
                            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                              {JSON.stringify(endpoint.requestBody, null, 2)}
                            </pre>
                          </div>
                        )}

                        {endpoint.responseBody && (
                          <div>
                            <h4 className="font-semibold mb-2">Response Body:</h4>
                            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                              {JSON.stringify(endpoint.responseBody, null, 2)}
                            </pre>
                          </div>
                        )}

                        {endpoint.errors && (
                          <div>
                            <h4 className="font-semibold mb-2">Коды ошибок:</h4>
                            <div className="space-y-2">
                              {Object.entries(endpoint.errors).map(([code, message]) => (
                                <div key={code} className="flex items-center gap-2">
                                  <Badge variant="destructive">{code}</Badge>
                                  <span className="text-sm">{message}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="constants" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Константы и справочники</CardTitle>
              <CardDescription>
                {constants?.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Типы банков</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {constants?.bankTypes.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {constants?.bankTypes.values.map((bank) => (
                    <Badge key={bank} variant="outline">
                      {bank}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Типы методов платежа</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {constants?.methodTypes.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {constants?.methodTypes.values.map((method) => (
                    <Badge key={method} variant="outline">
                      {method}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Статусы транзакций</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {constants?.transactionStatuses.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {constants?.transactionStatuses.values.map((status) => (
                    <Badge key={status} variant="outline">
                      {status}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Поддерживаемые валюты</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {constants?.currencies.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {constants?.currencies.values.map((currency) => (
                    <Badge key={currency} variant="outline">
                      {currency.toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="callbacks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Формат колбэков</CardTitle>
              <CardDescription>
                {callbackFormat?.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">URL для колбэков:</h4>
                <code className="block bg-muted p-3 rounded text-sm">
                  {callbackFormat?.callbackUrl}
                </code>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Метод:</h4>
                <Badge className="bg-purple-100 text-purple-800">
                  {callbackFormat?.method}
                </Badge>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Headers:</h4>
                <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                  {JSON.stringify(callbackFormat?.headers, null, 2)}
                </pre>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Request Body:</h4>
                <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                  {JSON.stringify(callbackFormat?.requestBody, null, 2)}
                </pre>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Ожидаемый ответ:</h4>
                <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                  {JSON.stringify(callbackFormat?.expectedResponse, null, 2)}
                </pre>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Важные замечания:
                </h4>
                <div className="space-y-2">
                  {callbackFormat?.notes.map((note, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-purple-600 mt-0.5" />
                      <span className="text-sm">{note}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Схема интеграции</CardTitle>
              <CardDescription>
                {integrationFlow?.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-4">Поток данных</h3>
                <div className="space-y-4">
                  {integrationFlow?.steps.map((step) => (
                    <div key={step.step} className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-[purple-600] text-white flex items-center justify-center text-sm font-semibold">
                          {step.step}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{step.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Обработка ошибок</h3>
                <div className="space-y-2">
                  {integrationFlow?.errorHandling &&
                    Object.entries(integrationFlow.errorHandling).map(([code, description]) => (
                      <div key={code} className="flex items-start gap-3">
                        <Badge variant="destructive">{code}</Badge>
                        <span className="text-sm">{description}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Лучшие практики</h3>
                <div className="space-y-2">
                  {integrationFlow?.bestPractices.map((practice, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-purple-600 mt-0.5" />
                      <span className="text-sm">{practice}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
