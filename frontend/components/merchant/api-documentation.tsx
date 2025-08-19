'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useMerchantAuth } from '@/stores/merchant-auth'
import { Copy, Play, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Parameter {
  name: string
  type: string
  required: boolean
  description: string
}

interface Response {
  status: number
  description: string
  example: any
}

interface ApiDocumentationProps {
  title: string
  description: string
  endpoint: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Parameter[]
  parameters: Parameter[]
  responses: Response[]
  exampleRequest?: any
}

const methodColors = {
  GET: 'bg-blue-500',
  POST: 'bg-green-500',
  PUT: 'bg-orange-500',
  DELETE: 'bg-red-500',
  PATCH: 'bg-purple-500',
}

export function ApiDocumentation({
  title,
  description,
  endpoint,
  method,
  headers = [],
  parameters,
  responses,
  exampleRequest = {},
}: ApiDocumentationProps) {
  const { token } = useMerchantAuth()
  const [requestBody, setRequestBody] = useState(JSON.stringify(exampleRequest, null, 2))
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedEndpoint, setCopiedEndpoint] = useState(false)

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
  const fullEndpoint = `${baseUrl}${endpoint}`

  const copyEndpoint = async () => {
    await navigator.clipboard.writeText(fullEndpoint)
    setCopiedEndpoint(true)
    toast.success('Endpoint скопирован')
    setTimeout(() => setCopiedEndpoint(false), 2000)
  }

  const executeRequest = async () => {
    try {
      setIsLoading(true)
      setResponse('')

      const headers: any = {
        'x-api-key': token,
      }

      if (method !== 'GET') {
        headers['Content-Type'] = 'application/json'
      }

      const options: RequestInit = {
        method,
        headers,
      }

      if (method !== 'GET' && requestBody) {
        try {
          options.body = JSON.stringify(JSON.parse(requestBody))
        } catch (e) {
          toast.error('Неверный формат JSON')
          return
        }
      }

      const res = await fetch(fullEndpoint, options)
      const data = await res.json()

      setResponse(JSON.stringify(data, null, 2))

      if (res.ok) {
        toast.success('Запрос выполнен успешно')
      } else {
        toast.error(`Ошибка: ${res.status}`)
      }
    } catch (error) {
      toast.error('Ошибка выполнения запроса')
      setResponse(JSON.stringify({ error: error.message }, null, 2))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        <p className="text-gray-600 mt-1">{description}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Badge className={cn(methodColors[method], 'text-white')}>
              {method}
            </Badge>
            <div className="flex-1 flex items-center gap-2">
              <code className="text-sm bg-gray-100 px-3 py-1 rounded">{fullEndpoint}</code>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyEndpoint}
                className="h-8 w-8"
              >
                {copiedEndpoint ? (
                  <Check className="h-4 w-4 text-[#006039]" />
                ) : (
                  <Copy className="h-4 w-4 text-[#006039]" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="parameters" className="space-y-4">
        <TabsList>
          <TabsTrigger value="parameters">Параметры</TabsTrigger>
          <TabsTrigger value="responses">Ответы</TabsTrigger>
          <TabsTrigger value="try">Попробовать</TabsTrigger>
        </TabsList>

        <TabsContent value="parameters" className="space-y-4">
          {headers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Заголовки</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {headers.map((header) => (
                    <div key={header.name} className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-medium">{header.name}</code>
                          {header.required && (
                            <Badge variant="destructive" className="text-xs">
                              Обязательный
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{header.description}</p>
                      </div>
                      <Badge variant="outline">{header.type}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Параметры запроса</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {parameters.map((param) => (
                  <div key={param.name} className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-medium">{param.name}</code>
                        {param.required && (
                          <Badge variant="destructive" className="text-xs">
                            Обязательный
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{param.description}</p>
                    </div>
                    <Badge variant="outline">{param.type}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responses" className="space-y-4">
          {responses.map((res) => (
            <Card key={res.status}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {res.status} - {res.description}
                  </CardTitle>
                  <Badge
                    variant={res.status < 300 ? 'default' : res.status < 400 ? 'secondary' : 'destructive'}
                  >
                    {res.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
                  <code className="text-sm">{JSON.stringify(res.example, null, 2)}</code>
                </pre>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="try" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Тестирование API</CardTitle>
              <CardDescription>
                Отправьте тестовый запрос с вашим API ключом
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {method !== 'GET' && (
                <div className="space-y-2">
                  <Label>Тело запроса (JSON)</Label>
                  <Textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    className="font-mono text-sm"
                    rows={10}
                  />
                </div>
              )}

              <Button
                onClick={executeRequest}
                disabled={isLoading}
                className="w-full"
              >
                <Play className="mr-2 h-4 w-4" />
                {isLoading ? 'Выполнение...' : 'Выполнить запрос'}
              </Button>

              {response && (
                <div className="space-y-2">
                  <Label>Ответ</Label>
                  <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
                    <code className="text-sm">{response}</code>
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}