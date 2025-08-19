"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { traderApi } from "@/services/api"
import { toast } from "sonner"
import { useTraderAuth } from "@/stores/auth"
import { useRouter } from "next/navigation"
import { 
  Loader2,
  ChevronDown,
  LogOut,
  User,
  Plus,
  MoreVertical,
  CreditCard,
  Smartphone,
  Copy,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Shield,
  Globe
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Requisite {
  id: string
  name: string
  bankName: string
  cardNumber: string
  type: "card" | "account"
  isActive: boolean
  balance: number
  dailyLimit: number
  monthlyLimit: number
  createdAt: string
}

interface Device {
  id: string
  name: string
  browser: string
  os: string
  ip: string
  lastActive: string
  isActive: boolean
  isTrusted: boolean
}

export function RequisitesAndDevices() {
  const [requisites, setRequisites] = useState<Requisite[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(false)
  const [teamEnabled, setTeamEnabled] = useState(true)
  const [userEmail, setUserEmail] = useState("")
  const [activeTab, setActiveTab] = useState("requisites")
  
  // Dialog states
  const [requisiteDialogOpen, setRequisiteDialogOpen] = useState(false)
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false)
  
  // Form states
  const [newRequisite, setNewRequisite] = useState({
    name: "",
    bankName: "",
    cardNumber: "",
    type: "card" as "card" | "account",
    linkedDeviceId: ""
  })
  const [newDeviceName, setNewDeviceName] = useState("")
  
  const router = useRouter()
  const logout = useTraderAuth((state) => state.logout)
  
  // Bank logos mapping
  const bankLogos: Record<string, string> = {
    "Сбербанк": "https://cdn.brandfetch.io/sberbank.ru/logo/theme/dark/h/64/w/64",
    "Тинькофф": "https://cdn.brandfetch.io/tbank.ru/logo/theme/dark/h/64/w/64",
    "ВТБ": "https://cdn.brandfetch.io/vtb.com/logo/theme/dark/h/64/w/64",
    "Альфа-Банк": "https://cdn.brandfetch.io/alfabank.com/logo/theme/dark/h/64/w/64",
    "Райффайзен": "https://cdn.brandfetch.io/raiffeisen.ru/logo/theme/dark/h/64/w/64",
    "Открытие": "https://cdn.brandfetch.io/open.ru/logo/theme/dark/h/64/w/64",
    "Газпромбанк": "https://cdn.brandfetch.io/gazprombank.ru/logo/theme/dark/h/64/w/64",
    "Росбанк": "https://cdn.brandfetch.io/rosbank.ru/logo/theme/dark/h/64/w/64",
    "Совкомбанк": "https://cdn.brandfetch.io/sovcombank.ru/logo/theme/dark/h/64/w/64",
    "Почта Банк": "https://cdn.brandfetch.io/pochtabank.ru/logo/theme/dark/h/64/w/64"
  }
  
  useEffect(() => {
    // Загружаем данные
    fetchTraderProfile()
    fetchDevices()
    // Моковые данные для демонстрации
    setRequisites([
      {
        id: "1",
        name: "Основная карта",
        bankName: "Сбербанк",
        cardNumber: "4276 **** **** 1234",
        type: "card",
        isActive: true,
        balance: 150000,
        dailyLimit: 500000,
        monthlyLimit: 5000000,
        createdAt: new Date().toISOString()
      },
      {
        id: "2",
        name: "Резервная карта",
        bankName: "Тинькофф",
        cardNumber: "5469 **** **** 5678",
        type: "card",
        isActive: false,
        balance: 50000,
        dailyLimit: 300000,
        monthlyLimit: 3000000,
        createdAt: new Date().toISOString()
      }
    ])
  }, [])
  
  const fetchTraderProfile = async () => {
    try {
      const response = await traderApi.getProfile()
      setUserEmail(response.email || "trader@example.com")
    } catch (error) {
      console.error("Failed to fetch profile:", error)
      setUserEmail("trader@example.com")
    }
  }
  
  const fetchDevices = async () => {
    setLoading(true)
    try {
      console.log("Fetching devices...")
      const response = await traderApi.getDevices()
      console.log("Devices API response:", response)
      
      // Handle both array and object responses
      const devicesArray = Array.isArray(response) ? response : response.devices || []
      
      const formattedDevices = devicesArray.map((device: any) => ({
        id: device.id,
        name: device.name || "Неизвестное устройство",
        browser: device.browser || "Неизвестный браузер",
        os: device.os || "Неизвестная ОС",
        ip: device.ip || "Неизвестный IP",
        lastActive: device.lastSeen || device.createdAt,
        isActive: device.isOnline || false,
        isTrusted: device.isTrusted || false
      }))
      console.log("Formatted devices:", formattedDevices)
      setDevices(formattedDevices)
    } catch (error) {
      console.error("Failed to fetch devices:", error)
      toast.error("Не удалось загрузить устройства")
    } finally {
      setLoading(false)
    }
  }
  
  const handleLogout = () => {
    logout()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('trader-auth')
    }
    router.push("/trader/login")
  }
  
  const handleAddRequisite = () => {
    const newReq: Requisite = {
      id: Date.now().toString(),
      ...newRequisite,
      isActive: true,
      balance: 0,
      dailyLimit: 500000,
      monthlyLimit: 5000000,
      createdAt: new Date().toISOString()
    }
    setRequisites([...requisites, newReq])
    setRequisiteDialogOpen(false)
    setNewRequisite({
      name: "",
      bankName: "",
      cardNumber: "",
      type: "card",
      linkedDeviceId: ""
    })
    toast.success("Реквизит добавлен")
  }
  
  const toggleRequisiteStatus = (id: string) => {
    setRequisites(requisites.map(req => 
      req.id === id ? { ...req, isActive: !req.isActive } : req
    ))
  }
  
  const deleteRequisite = (id: string) => {
    setRequisites(requisites.filter(req => req.id !== id))
    toast.success("Реквизит удален")
  }
  
  const trustDevice = (id: string) => {
    setDevices(devices.map(dev => 
      dev.id === id ? { ...dev, isTrusted: !dev.isTrusted } : dev
    ))
  }
  
  const deleteDevice = async (id: string) => {
    try {
      await traderApi.deleteDevice(id)
      setDevices(devices.filter(dev => dev.id !== id))
      toast.success("Устройство удалено")
    } catch (error) {
      toast.error("Не удалось удалить устройство")
    }
  }
  
  const handleAddDevice = async () => {
    try {
      const response = await traderApi.createDevice({
        name: newDeviceName || "Новое устройство"
      })
      await fetchDevices()
      setDeviceDialogOpen(false)
      setNewDeviceName("")
      toast.success("Устройство добавлено")
    } catch (error) {
      toast.error("Не удалось добавить устройство")
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Реквизиты и устройства</h1>
        
        <div className="flex items-center gap-4">
          {/* Team toggle */}
          <Button 
            variant="ghost" 
            className="text-sm font-normal text-gray-600 hover:text-gray-900 hover:bg-black/5 transition-colors"
          >
            Команда {teamEnabled ? "включена" : "выключена"}
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
          
          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center gap-2 text-sm font-normal hover:bg-black/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-[#006039]" />
                  </div>
                  <span className="text-gray-700">{userEmail}</span>
                </div>
                <ChevronDown className="h-4 w-4 text-[#006039]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 focus:text-red-600 hover:bg-gray-50 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4 text-[#006039]" />
                Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-fit grid grid-cols-2 gap-1 bg-gray-100 p-1">
          <TabsTrigger 
            value="requisites" 
            className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm px-4"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Реквизиты
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">
              {requisites.length}
            </span>
          </TabsTrigger>
          <TabsTrigger 
            value="devices"
            className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm px-4"
          >
            <Smartphone className="mr-2 h-4 w-4" />
            Устройства
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">
              {devices.length}
            </span>
          </TabsTrigger>
        </TabsList>
        
        {/* Requisites Tab */}
        <TabsContent value="requisites" className="mt-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Управляйте вашими платежными реквизитами для приема средств
              </p>
              <Button 
                onClick={() => setRequisiteDialogOpen(true)}
                className="bg-[#006039] hover:bg-[#006039]/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Добавить реквизит
              </Button>
            </div>
            
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                    <TableHead className="font-medium text-gray-600 text-sm">Название</TableHead>
                    <TableHead className="font-medium text-gray-600 text-sm">Банк</TableHead>
                    <TableHead className="font-medium text-gray-600 text-sm">Номер</TableHead>
                    <TableHead className="font-medium text-gray-600 text-sm">Баланс</TableHead>
                    <TableHead className="font-medium text-gray-600 text-sm">Лимиты</TableHead>
                    <TableHead className="font-medium text-gray-600 text-sm">Статус</TableHead>
                    <TableHead className="font-medium text-gray-600 text-sm text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requisites.map((requisite) => (
                    <TableRow key={requisite.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium">{requisite.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {bankLogos[requisite.bankName] && (
                            <img 
                              src={bankLogos[requisite.bankName]} 
                              alt={requisite.bankName}
                              className="h-8 w-8 rounded object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          )}
                          <span>{requisite.bankName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{requisite.cardNumber}</TableCell>
                      <TableCell className="font-medium">
                        {requisite.balance.toLocaleString('ru-RU')} ₽
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1">
                          <div>День: {(requisite.dailyLimit / 1000).toFixed(0)}к</div>
                          <div>Месяц: {(requisite.monthlyLimit / 1000000).toFixed(1)}М</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {requisite.linkedDeviceId ? (
                          <div className="text-sm">
                            {devices.find(d => d.id === requisite.linkedDeviceId)?.name || "Устройство удалено"}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Не привязано</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={requisite.isActive}
                            onCheckedChange={() => toggleRequisiteStatus(requisite.id)}
                          />
                          <span className="text-sm">
                            {requisite.isActive ? "Активен" : "Выключен"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreVertical className="h-4 w-4 text-[#006039]" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4 text-[#006039]" />
                              Редактировать
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="mr-2 h-4 w-4 text-[#006039]" />
                              Копировать
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteRequisite(requisite.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4 text-[#006039]" />
                              Удалить
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {requisites.length === 0 && (
                <div className="p-12 text-center">
                  <CreditCard className="h-12 w-12 mx-auto text-[#006039] mb-4" />
                  <p className="text-gray-500">Реквизиты не добавлены</p>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
        
        {/* Devices Tab */}
        <TabsContent value="devices" className="mt-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Управляйте устройствами, которые имеют доступ к вашему аккаунту
              </p>
              <Button 
                onClick={() => setDeviceDialogOpen(true)}
                style={{ backgroundColor: '#006039', color: 'white' }}
                className="hover:opacity-90 transition-opacity"
              >
                <Plus className="mr-2 h-4 w-4" />
                Добавить устройство
              </Button>
            </div>
            
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                    <TableHead className="font-medium text-gray-600 text-sm">Устройство</TableHead>
                    <TableHead className="font-medium text-gray-600 text-sm">Браузер</TableHead>
                    <TableHead className="font-medium text-gray-600 text-sm">ОС</TableHead>
                    <TableHead className="font-medium text-gray-600 text-sm">IP адрес</TableHead>
                    <TableHead className="font-medium text-gray-600 text-sm">Последняя активность</TableHead>
                    <TableHead className="font-medium text-gray-600 text-sm">Статус</TableHead>
                    <TableHead className="font-medium text-gray-600 text-sm text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#006039]" />
                        <p className="mt-2 text-gray-500">Загрузка устройств...</p>
                      </TableCell>
                    </TableRow>
                  ) : devices.length > 0 ? (
                    devices.map((device) => (
                    <TableRow key={device.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-[#006039]" />
                          {device.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-[#006039]" />
                          {device.browser}
                        </div>
                      </TableCell>
                      <TableCell>{device.os}</TableCell>
                      <TableCell className="font-mono text-sm">{device.ip}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {format(new Date(device.lastActive), "dd.MM.yyyy HH:mm", { locale: ru })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {device.isActive ? (
                            <Badge className="bg-green-50 text-green-600 border-0">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Активно
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-50 text-gray-600 border-0">
                              <XCircle className="mr-1 h-3 w-3" />
                              Неактивно
                            </Badge>
                          )}
                          {device.isTrusted && (
                            <Shield className="h-4 w-4 text-[#006039]" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreVertical className="h-4 w-4 text-[#006039]" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => router.push(`/trader/devices/${device.id}`)}
                            >
                              <Smartphone className="mr-2 h-4 w-4" />
                              Подробнее
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => trustDevice(device.id)}
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              {device.isTrusted ? "Убрать доверие" : "Доверять"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteDevice(device.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4 text-[#006039]" />
                              Удалить
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <Smartphone className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">Устройства не найдены</p>
                        <p className="text-sm text-gray-400 mt-2">Добавьте первое устройство для начала работы</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Add Requisite Dialog */}
      <Dialog open={requisiteDialogOpen} onOpenChange={setRequisiteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить реквизит</DialogTitle>
            <DialogDescription>
              Введите данные нового платежного реквизита
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Название</Label>
              <Input
                id="name"
                placeholder="Основная карта"
                value={newRequisite.name}
                onChange={(e) => setNewRequisite({ ...newRequisite, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="bankName">Банк</Label>
              <Input
                id="bankName"
                placeholder="Сбербанк"
                value={newRequisite.bankName}
                onChange={(e) => setNewRequisite({ ...newRequisite, bankName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="cardNumber">Номер карты</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={newRequisite.cardNumber}
                onChange={(e) => setNewRequisite({ ...newRequisite, cardNumber: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequisiteDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleAddRequisite} className="bg-[#006039] hover:bg-[#006039]/90">
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Device Dialog */}
      <Dialog open={deviceDialogOpen} onOpenChange={setDeviceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить устройство</DialogTitle>
            <DialogDescription>
              Введите название для нового устройства
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="deviceName">Название устройства</Label>
              <Input
                id="deviceName"
                placeholder="Мой телефон"
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeviceDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleAddDevice} style={{ backgroundColor: '#006039', color: 'white' }} className="hover:opacity-90 transition-opacity">
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}