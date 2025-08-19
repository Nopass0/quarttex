'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Send, Check, AlertCircle, Loader2 } from 'lucide-react'
import { traderApi } from '@/services/api'
import { useTraderAuth } from '@/stores/auth'

export default function TelegramPage() {
  const { trader } = useTraderAuth()
  const [telegramChatId, setTelegramChatId] = useState('')
  const [telegramBotToken, setBotToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLinked, setIsLinked] = useState(false)

  const handleLinkTelegram = async () => {
    if (!telegramChatId || !telegramBotToken) {
      toast.error('Заполните все поля')
      return
    }

    setIsLoading(true)
    try {
      const response = await traderApi.post('/telegram/link', {
        userId: trader?.id,
        telegramChatId,
        telegramBotToken,
      })

      if (response.data.success) {
        setIsLinked(true)
        toast.success('Telegram успешно подключен!')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка подключения')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnlinkTelegram = async () => {
    setIsLoading(true)
    try {
      await traderApi.delete(`/telegram/link/${trader?.id}`)
      setIsLinked(false)
      setTelegramChatId('')
      setBotToken('')
      toast.success('Telegram отключен')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка отключения')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Telegram уведомления</h1>
        <p className="text-gray-600 mt-2">
          Настройте уведомления о выплатах через Telegram бота
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Подключение Telegram
          </CardTitle>
          <CardDescription>
            Получайте мгновенные уведомления о новых выплатах в Telegram
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isLinked ? (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Как подключить:</strong>
                  <ol className="mt-2 space-y-1 list-decimal list-inside">
                    <li>Создайте бота через @BotFather в Telegram</li>
                    <li>Скопируйте токен бота (формат: 123456:ABC-DEF1234...)</li>
                    <li>Начните диалог с ботом и отправьте любое сообщение</li>
                    <li>Перейдите на https://api.telegram.org/bot{'<ВАШ_ТОКЕН>'}/getUpdates</li>
                    <li>Найдите ваш chat ID в поле "chat": {"{ \"id\": 123456789 }"}</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="chatId">Chat ID</Label>
                  <Input
                    id="chatId"
                    type="text"
                    placeholder="123456789"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ваш ID чата с ботом
                  </p>
                </div>

                <div>
                  <Label htmlFor="botToken">Bot Token</Label>
                  <Input
                    id="botToken"
                    type="text"
                    placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                    value={telegramBotToken}
                    onChange={(e) => setBotToken(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Токен вашего бота от @BotFather
                  </p>
                </div>

                <Button
                  onClick={handleLinkTelegram}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Подключить Telegram
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="bg-green-50 p-6 rounded-lg">
                <Check className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Telegram подключен
                </h3>
                <p className="text-gray-600">
                  Вы будете получать уведомления о новых выплатах
                </p>
              </div>
              
              <Button
                variant="outline"
                onClick={handleUnlinkTelegram}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Отключить Telegram
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Типы уведомлений</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 p-2 rounded">
                <Send className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium">Новые выплаты</h4>
                <p className="text-sm text-gray-600">
                  Мгновенное уведомление когда появляется новая выплата
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-yellow-100 p-2 rounded">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <h4 className="font-medium">Изменение статуса</h4>
                <p className="text-sm text-gray-600">
                  Уведомления при изменении статуса выплаты
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-red-100 p-2 rounded">
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <h4 className="font-medium">Споры</h4>
                <p className="text-sm text-gray-600">
                  Отдельные уведомления о спорах по выплатам
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}