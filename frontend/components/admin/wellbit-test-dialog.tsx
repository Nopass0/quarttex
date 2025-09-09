'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Copy, Send, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface WellbitTestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiKeyPublic: string | null
  apiKeyPrivate: string | null
}

export function WellbitTestDialog({ open, onOpenChange, apiKeyPublic, apiKeyPrivate }: WellbitTestDialogProps) {
  const [endpoint, setEndpoint] = useState('/payment/create')
  const [requestBody, setRequestBody] = useState('')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [signature, setSignature] = useState('')

  // Sample request bodies for different endpoints
  const sampleRequests = {
    '/payment/create': {
      payment_id: Math.floor(Math.random() * 1000000),
      payment_amount: 1000,
      payment_amount_usdt: 10.5,
      payment_amount_profit: 50,
      payment_amount_profit_usdt: 0.5,
      payment_fee_percent_profit: 5,
      payment_type: 'card',
      payment_bank: 'SBERBANK',
      payment_course: 95.24,
      payment_lifetime: 3600,
      payment_status: 'new'
    },
    '/payment/get': {
      payment_id: 123456
    },
    '/payment/status': {
      payment_id: 123456,
      payment_status: 'complete'
    }
  }

  useEffect(() => {
    // Set sample request when endpoint changes
    const sample = sampleRequests[endpoint as keyof typeof sampleRequests]
    setRequestBody(JSON.stringify(sample, null, 2))
  }, [endpoint])

  useEffect(() => {
    // Generate signature when request body changes
    if (apiKeyPrivate && requestBody) {
      generateSignature()
    }
  }, [requestBody, apiKeyPrivate])

  const generateSignature = async () => {
    if (!apiKeyPrivate || !requestBody) {
      setSignature('')
      return
    }

    try {
      const data = JSON.parse(requestBody)
      
      // Recursively sort object keys to match backend canonicalJson
      const sortKeys = (value: any): any => {
        if (Array.isArray(value)) {
          return value.map(sortKeys)
        }
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          return Object.keys(value)
            .sort()
            .reduce((acc, key) => {
              acc[key] = sortKeys(value[key])
              return acc
            }, {} as any)
        }
        return value
      }
      
      const sortedData = sortKeys(data)
      const dataString = JSON.stringify(sortedData)
      
      // Use Web Crypto API for HMAC generation
      const encoder = new TextEncoder()
      const keyData = encoder.encode(apiKeyPrivate)
      const msgData = encoder.encode(dataString)
      
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      )
      
      const signature = await crypto.subtle.sign('HMAC', key, msgData)
      const hashArray = Array.from(new Uint8Array(signature))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      
      setSignature(hashHex)
    } catch (err) {
      console.error('Failed to generate signature:', err)
      setSignature('')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Скопировано в буфер обмена')
  }

  const sendRequest = async () => {
    if (!apiKeyPublic || !apiKeyPrivate) {
      toast.error('Сначала сгенерируйте API ключи')
      return
    }

    try {
      setIsLoading(true)
      setResponse('')

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
      const url = `${baseUrl}/wellbit${endpoint}`

      // Parse and re-stringify without formatting for canonical JSON
      const bodyData = JSON.parse(requestBody)
      const canonicalBody = JSON.stringify(bodyData)
      
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKeyPublic,
          'x-api-token': signature
        },
        body: canonicalBody
      })

      const responseText = await res.text()
      let formattedResponse = responseText

      try {
        const json = JSON.parse(responseText)
        formattedResponse = JSON.stringify(json, null, 2)
      } catch {}

      setResponse(`HTTP ${res.status} ${res.statusText}\n${res.headers.get('content-type')}\n\n${formattedResponse}`)
    } catch (error: any) {
      setResponse(`Ошибка: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Тестирование Wellbit API</DialogTitle>
          <DialogDescription>
            Отправьте тестовый запрос к Wellbit API с автоматической генерацией HMAC подписи
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {(!apiKeyPublic || !apiKeyPrivate) && (
            <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                API ключи не установлены. Сначала сгенерируйте ключи для тестирования.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>API Key (x-api-key)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input value={apiKeyPublic || 'Не установлен'} readOnly className="font-mono text-sm" />
                {apiKeyPublic && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(apiKeyPublic)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            <div>
              <Label>Private Key (для подписи)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input value={apiKeyPrivate || 'Не установлен'} readOnly className="font-mono text-sm" />
                {apiKeyPrivate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(apiKeyPrivate)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div>
            <Label>Endpoint</Label>
            <Select value={endpoint} onValueChange={setEndpoint}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="/payment/create">POST /payment/create</SelectItem>
                <SelectItem value="/payment/get">POST /payment/get</SelectItem>
                <SelectItem value="/payment/status">POST /payment/status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Request Body (JSON)</Label>
            <Textarea
              value={requestBody}
              onChange={(e) => setRequestBody(e.target.value)}
              className="mt-1 font-mono text-sm"
              rows={10}
              placeholder="JSON тело запроса"
            />
          </div>

          <div>
            <Label>HMAC-SHA256 подпись (x-api-token)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input value={signature} readOnly className="font-mono text-sm" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(signature)}
                disabled={!signature}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Автоматически генерируется на основе тела запроса и приватного ключа
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={sendRequest}
              disabled={isLoading || !apiKeyPublic || !apiKeyPrivate}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="h-4 w-4 mr-2" />
              {isLoading ? 'Отправка...' : 'Отправить запрос'}
            </Button>
          </div>

          {response && (
            <div>
              <Label>Response</Label>
              <div className="mt-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                <pre className="text-sm font-mono whitespace-pre-wrap break-all">{response}</pre>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}