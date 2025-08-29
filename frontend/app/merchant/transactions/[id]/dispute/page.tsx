'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ArrowLeft, Upload, Send, Loader2, AlertCircle } from 'lucide-react'
import { useMerchantAuth } from '@/stores/merchant-auth'
import { formatAmount, formatDate } from '@/lib/utils'

interface Transaction {
  id: string
  numericId: number
  orderId: string
  amount: number
  status: string
  type: string
  createdAt: string
  method: {
    name: string
    code: string
  }
  trader?: {
    id: string
    name: string
  }
}

export default function DisputePage() {
  const router = useRouter()
  const params = useParams()
  const { sessionToken } = useMerchantAuth()
  const transactionId = params.id as string
  
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchTransaction()
  }, [transactionId])

  const fetchTransaction = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/merchant/dashboard/transactions/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
        }
      )

      if (!response.ok) throw new Error('Failed to fetch transaction')

      const data = await response.json()
      setTransaction(data)
    } catch (error) {
      toast.error('Не удалось загрузить данные транзакции')
      router.push('/merchant/transactions')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      if (files.length + newFiles.length > 10) {
        toast.error('Максимум 10 файлов')
        return
      }
      setFiles([...files, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error('Введите описание проблемы')
      return
    }

    try {
      setIsSubmitting(true)
      
      const formData = new FormData()
      formData.append('message', message)
      files.forEach(file => {
        formData.append('files', file)
      })

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/merchant/deal-disputes/deal/${transactionId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
          body: formData,
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create dispute')
      }

      const result = await response.json()
      toast.success('Спор успешно создан')
      router.push(`/merchant/disputes/${result.dispute.id}`)
    } catch (error: any) {
      toast.error(error.message || 'Не удалось создать спор')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-[#006039]" />
      </div>
    )
  }

  if (!transaction) return null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/merchant/transactions')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад
        </Button>
        <h1 className="text-2xl font-semibold">Открыть спор по транзакции</h1>
      </div>

      {/* Transaction Details */}
      <Card>
        <CardHeader>
          <CardTitle>Детали транзакции</CardTitle>
          <CardDescription>Информация о транзакции, по которой открывается спор</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">ID транзакции</p>
              <p className="font-medium">{transaction.numericId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Внешний ID</p>
              <p className="font-medium font-mono text-sm">{transaction.orderId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Статус</p>
              <Badge variant="default">{transaction.status}</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-500">Сумма</p>
              <p className="font-medium">₽{formatAmount(transaction.amount)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Метод</p>
              <p className="font-medium">{transaction.method.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Дата создания</p>
              <p className="font-medium">{formatDate(transaction.createdAt)}</p>
            </div>
            {transaction.trader && (
              <div>
                <p className="text-sm text-gray-500">Трейдер</p>
                <p className="font-medium">{transaction.trader.name}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dispute Form */}
      <Card>
        <CardHeader>
          <CardTitle>Описание проблемы</CardTitle>
          <CardDescription>Опишите причину открытия спора и приложите доказательства</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="message">Сообщение *</Label>
            <Textarea
              id="message"
              placeholder="Опишите проблему подробно..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Приложить файлы</Label>
            <div className="border-2 border-dashed rounded-lg p-4">
              <Input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">Нажмите для загрузки файлов</p>
                <p className="text-xs text-gray-500 mt-1">Максимум 10 файлов, до 20MB каждый</p>
              </label>
            </div>

            {files.length > 0 && (
              <div className="space-y-2 mt-3">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm truncate">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      Удалить
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Важная информация</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Спор может быть открыт только по активным транзакциям</li>
                  <li>Приложите все доказательства (скриншоты, документы)</li>
                  <li>После открытия спора транзакция будет заморожена до разрешения</li>
                  <li>Решение по спору принимается администрацией платформы</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => router.push('/merchant/transactions')}
        >
          Отмена
        </Button>
        <Button
          className="bg-[#006039] hover:bg-[#006039]/90"
          onClick={handleSubmit}
          disabled={isSubmitting || !message.trim()}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Отправка...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Открыть спор
            </>
          )}
        </Button>
      </div>
    </div>
  )
}