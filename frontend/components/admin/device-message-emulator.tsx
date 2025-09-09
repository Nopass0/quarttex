"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { adminApi } from "@/services/api"
import { toast } from "sonner"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { MessageSquare, Phone, Bell, Send } from "lucide-react"

interface DeviceMessageEmulatorProps {
  deviceId: string
  deviceName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeviceMessageEmulator({ 
  deviceId, 
  deviceName, 
  open, 
  onOpenChange 
}: DeviceMessageEmulatorProps) {
  const [messageType, setMessageType] = useState<"notification" | "sms">("notification")
  const [packageName, setPackageName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Введите текст сообщения")
      return
    }

    if (messageType === "notification" && !packageName.trim()) {
      toast.error("Введите название пакета")
      return
    }

    if (messageType === "sms" && !phoneNumber.trim()) {
      toast.error("Введите номер телефона")
      return
    }

    setLoading(true)
    try {
      const data = {
        deviceId,
        type: messageType,
        packageName: messageType === "notification" ? packageName : undefined,
        phoneNumber: messageType === "sms" ? phoneNumber : undefined,
        message,
        timestamp: new Date().toISOString()
      }

      await adminApi.sendDeviceMessage(data)
      
      toast.success(`${messageType === "notification" ? "Уведомление" : "SMS"} отправлено`)
      
      // Reset form
      setMessage("")
      setPackageName("")
      setPhoneNumber("")
      onOpenChange(false)
    } catch (error) {
      console.error("Error sending message:", error)
      toast.error("Не удалось отправить сообщение")
    } finally {
      setLoading(false)
    }
  }

  const exampleMessages = {
    notification: [
      { package: "com.sberbank.online", text: "Перевод 15 000 ₽ от Иван И." },
      { package: "com.tinkoff.bank", text: "Пополнение +25 000 ₽. Баланс: 45 320 ₽" },
      { package: "com.vtb24.mobilebanking", text: "Зачисление 10 000 ₽. Отправитель: ООО КОМПАНИЯ" },
      { package: "ru.alfabank.mobile", text: "Поступление 5 000 ₽ на карту *1234" }
    ],
    sms: [
      { phone: "900", text: "СБЕРБАНК. Перевод 15000р от ИВАН И. Баланс: 25000р" },
      { phone: "2273", text: "Пополнение +25000. Доступно: 45320р. Тинькофф" },
      { phone: "1134", text: "ВТБ: зачисление 10000р. Отправитель: ООО КОМПАНИЯ" },
      { phone: "+79001234567", text: "Перевод 5000 руб. успешно получен" }
    ]
  }

  const setExample = (example: any) => {
    if (messageType === "notification") {
      setPackageName(example.package)
      setMessage(example.text)
    } else {
      setPhoneNumber(example.phone)
      setMessage(example.text)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Эмулятор сообщений</DialogTitle>
          <DialogDescription>
            Отправка тестовых сообщений на устройство {deviceName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Message Type */}
          <div className="space-y-2">
            <Label>Тип сообщения</Label>
            <Select value={messageType} onValueChange={(value: any) => setMessageType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="notification">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Уведомление приложения
                  </div>
                </SelectItem>
                <SelectItem value="sms">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    SMS сообщение
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Package Name or Phone Number */}
          {messageType === "notification" ? (
            <div className="space-y-2">
              <Label>Название пакета приложения</Label>
              <Input
                placeholder="com.sberbank.online"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Например: com.sberbank.online, com.tinkoff.bank
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Номер телефона отправителя</Label>
              <Input
                placeholder="900"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Может быть коротким (900) или полным (+79001234567)
              </p>
            </div>
          )}

          {/* Message Text */}
          <div className="space-y-2">
            <Label>Текст сообщения</Label>
            <Textarea
              placeholder={messageType === "notification" 
                ? "Перевод 15 000 ₽ от Иван И." 
                : "СБЕРБАНК. Перевод 15000р от ИВАН И. Баланс: 25000р"
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>

          {/* Example Messages */}
          <div className="space-y-2">
            <Label>Примеры сообщений</Label>
            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
              {exampleMessages[messageType].map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="justify-start text-left h-auto py-2 px-3"
                  onClick={() => setExample(example)}
                >
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex items-center gap-2">
                      {messageType === "notification" ? (
                        <>
                          <Bell className="h-3 w-3 flex-shrink-0" />
                          <span className="text-xs font-mono">{example.package}</span>
                        </>
                      ) : (
                        <>
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span className="text-xs font-medium">{example.phone}</span>
                        </>
                      )}
                    </div>
                    <span className="text-xs text-gray-600 line-clamp-1">{example.text}</span>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Предпросмотр</Label>
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-start gap-3">
                {messageType === "notification" ? (
                  <Bell className="h-5 w-5 text-gray-600 mt-0.5" />
                ) : (
                  <MessageSquare className="h-5 w-5 text-gray-600 mt-0.5" />
                )}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {messageType === "notification" ? packageName || "Приложение" : phoneNumber || "Отправитель"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(), "HH:mm")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">
                    {message || "Текст сообщения"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button 
            onClick={handleSend}
            disabled={loading || !message.trim()}
            className="bg-[#1B5E3F] hover:bg-[#1B5E3F]/90"
          >
            {loading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Отправка...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Отправить
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}