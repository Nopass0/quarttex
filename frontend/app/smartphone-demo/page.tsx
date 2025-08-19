"use client"

import { useState } from "react"
import { Smartphone } from "@/components/Smartphone"
import { ConnectionError } from "@/components/ConnectionError"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Logo } from "@/components/ui/logo"
import BankCard from "@/components/BankCard"
import { AlertCircle, Check, Home, CreditCard, Settings, User } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "sonner"

export default function SmartphoneDemoPage() {
  const [networkType, setNetworkType] = useState<"none" | "2G" | "3G" | "4G" | "5G" | "wifi">("4G")
  const [signalStrength, setSignalStrength] = useState(4)
  const [batteryLevel, setBatteryLevel] = useState(65)
  const [currentScreen, setCurrentScreen] = useState("error")

  const screens = {
    error: (
      <ConnectionError 
        onRetry={() => {
          toast("Повторная попытка подключения...")
          setTimeout(() => {
            setCurrentScreen("home")
            setNetworkType("4G")
            setSignalStrength(4)
          }, 2000)
        }}
      />
    ),
    home: (
      <div className="h-full bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Главная</h1>
            <Logo className="h-8 w-auto" />
          </div>
          
          <Card className="mb-4">
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 mb-1">Общий баланс</p>
              <p className="text-3xl font-bold">₽245,680.50</p>
              <p className="text-sm text-green-600 mt-2">+12.5% за месяц</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <Button
              variant="outline"
              className="flex flex-col items-center p-4 h-auto"
              onClick={() => setCurrentScreen("cards")}
            >
              <CreditCard className="h-6 w-6 mb-2" />
              <span className="text-xs">Карты</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center p-4 h-auto"
              onClick={() => setCurrentScreen("profile")}
            >
              <User className="h-6 w-6 mb-2" />
              <span className="text-xs">Профиль</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center p-4 h-auto"
            >
              <Settings className="h-6 w-6 mb-2" />
              <span className="text-xs">Настройки</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center p-4 h-auto"
              onClick={() => setCurrentScreen("error")}
            >
              <AlertCircle className="h-6 w-6 mb-2" />
              <span className="text-xs">Ошибка</span>
            </Button>
          </div>

          <h2 className="text-lg font-semibold mb-3">Последние операции</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
              <div>
                <p className="font-medium">Супермаркет</p>
                <p className="text-sm text-gray-500">Сегодня, 14:30</p>
              </div>
              <span className="font-medium text-red-600">-₽2,340</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
              <div>
                <p className="font-medium">Перевод от Ивана</p>
                <p className="text-sm text-gray-500">Вчера, 18:45</p>
              </div>
              <span className="font-medium text-green-600">+₽15,000</span>
            </div>
          </div>
        </div>
      </div>
    ),
    cards: (
      <div className="h-full bg-gray-50">
        <div className="p-6">
          <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentScreen("home")}
            >
              ← Назад
            </Button>
            <h1 className="text-xl font-bold ml-4">Мои карты</h1>
          </div>
          
          <div className="space-y-4">
            <BankCard 
              cardNumber="4276 8380 5837 5435"
              cardHolderName="IVAN PETROV"
              validThru="12/26"
            />
            
            <div className="flex gap-3">
              <Button className="flex-1" size="sm">Пополнить</Button>
              <Button variant="outline" className="flex-1" size="sm">Детали</Button>
            </div>

            <Alert>
              <Check className="h-4 w-4" />
              <AlertTitle>Карта активна</AlertTitle>
              <AlertDescription>
                Все операции по карте доступны
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    ),
    profile: (
      <div className="h-full bg-white">
        <div className="p-6">
          <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentScreen("home")}
            >
              ← Назад
            </Button>
            <h1 className="text-xl font-bold ml-4">Профиль</h1>
          </div>
          
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <User className="h-12 w-12 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold">Иван Петров</h2>
            <p className="text-gray-500">+7 (999) 123-45-67</p>
          </div>

          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">ivan.petrov@example.com</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-500">Дата регистрации</p>
              <p className="font-medium">15 марта 2023</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-500">Статус</p>
              <p className="font-medium text-green-600">Верифицирован</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Smartphone Component Demo</h1>
        <p className="text-muted-foreground">
          Интерактивная демонстрация компонента смартфона с различными экранами и состояниями
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Настройки смартфона</CardTitle>
            <CardDescription>
              Измените параметры для тестирования различных состояний
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Network Type */}
            <div className="space-y-2">
              <Label>Тип сети</Label>
              <Select value={networkType} onValueChange={(value: any) => setNetworkType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Нет данных</SelectItem>
                  <SelectItem value="2G">2G</SelectItem>
                  <SelectItem value="3G">3G</SelectItem>
                  <SelectItem value="4G">4G</SelectItem>
                  <SelectItem value="5G">5G</SelectItem>
                  <SelectItem value="wifi">Wi-Fi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Signal Strength */}
            <div className="space-y-2">
              <Label>Уровень сигнала: {signalStrength}/4</Label>
              <Slider
                value={[signalStrength]}
                onValueChange={([value]) => setSignalStrength(value)}
                min={0}
                max={4}
                step={1}
                disabled={networkType === "wifi" || networkType === "none"}
              />
            </div>

            {/* Battery Level */}
            <div className="space-y-2">
              <Label>Заряд батареи: {batteryLevel}%</Label>
              <Slider
                value={[batteryLevel]}
                onValueChange={([value]) => setBatteryLevel(value)}
                min={0}
                max={100}
                step={1}
              />
            </div>

            {/* Screen Navigation */}
            <div className="space-y-2">
              <Label>Экраны приложения</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={currentScreen === "error" ? "default" : "outline"}
                  onClick={() => {
                    setCurrentScreen("error")
                    setNetworkType("none")
                    setSignalStrength(0)
                  }}
                >
                  Ошибка подключения
                </Button>
                <Button
                  variant={currentScreen === "home" ? "default" : "outline"}
                  onClick={() => setCurrentScreen("home")}
                >
                  Главная
                </Button>
                <Button
                  variant={currentScreen === "cards" ? "default" : "outline"}
                  onClick={() => setCurrentScreen("cards")}
                >
                  Карты
                </Button>
                <Button
                  variant={currentScreen === "profile" ? "default" : "outline"}
                  onClick={() => setCurrentScreen("profile")}
                >
                  Профиль
                </Button>
              </div>
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <Label>Быстрые настройки</Label>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setNetworkType("none")
                    setSignalStrength(0)
                    setBatteryLevel(65)
                    setCurrentScreen("error")
                  }}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Как на скриншоте (ошибка подключения)
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setNetworkType("wifi")
                    setBatteryLevel(15)
                    setCurrentScreen("home")
                  }}
                >
                  <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                  Низкий заряд с Wi-Fi
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setNetworkType("5G")
                    setSignalStrength(4)
                    setBatteryLevel(100)
                    setCurrentScreen("cards")
                  }}
                >
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  Идеальное состояние
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Phone Preview */}
        <div className="flex items-center justify-center">
          <Smartphone
            networkType={networkType}
            signalStrength={signalStrength}
            batteryLevel={batteryLevel}
            time="12:52"
          >
            {screens[currentScreen as keyof typeof screens]}
          </Smartphone>
        </div>
      </div>

      {/* Additional Examples */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Дополнительные примеры</CardTitle>
          <CardDescription>
            Различные варианты использования компонента
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Dark Mode */}
            <div className="space-y-2">
              <Label>Темная тема</Label>
              <Smartphone
                networkType="4G"
                signalStrength={3}
                batteryLevel={75}
                screenBackground="#000000"
                className="scale-75 mx-auto"
              >
                <div className="h-full bg-black text-white p-6">
                  <Logo className="h-12 w-auto mb-6 filter invert" />
                  <h2 className="text-2xl font-bold mb-4">Темный режим</h2>
                  <p className="text-gray-300">
                    Приложение поддерживает темную тему для комфортного использования в ночное время.
                  </p>
                </div>
              </Smartphone>
            </div>

            {/* Custom Frame Color */}
            <div className="space-y-2">
              <Label>Белая рамка</Label>
              <Smartphone
                networkType="wifi"
                batteryLevel={90}
                frameColor="#ffffff"
                className="scale-75 mx-auto"
              >
                <div className="h-full p-6">
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mx-auto mb-4" />
                      <p className="text-gray-600">Кастомный дизайн</p>
                    </div>
                  </div>
                </div>
              </Smartphone>
            </div>

            {/* Loading State */}
            <div className="space-y-2">
              <Label>Состояние загрузки</Label>
              <Smartphone
                networkType="3G"
                signalStrength={2}
                batteryLevel={50}
                className="scale-75 mx-auto"
              >
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Загрузка данных...</p>
                  </div>
                </div>
              </Smartphone>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}