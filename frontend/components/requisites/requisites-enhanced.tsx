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
import { Progress } from "@/components/ui/progress"
import { PhoneCardInput } from "@/components/ui/phone-card-input"
import { BankSelector } from "@/components/ui/bank-selector"
import { RangeSlider } from "@/components/ui/range-slider"
import { BankCard } from "@/components/ui/bank-card"
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
  Globe,
  Archive,
  RotateCcw,
  Search,
  Phone,
  TrendingUp,
  Calendar,
  QrCode,
  Link
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Requisite {
  id: string
  methodType: string
  bankType: string
  cardNumber: string
  recipientName: string
  phoneNumber?: string
  minAmount: number
  maxAmount: number
  dailyLimit: number
  monthlyLimit: number
  intervalMinutes: number
  turnoverDay: number
  turnoverTotal: number
  isArchived: boolean
  hasDevice: boolean
  device?: Device
  createdAt: string
  updatedAt: string
}

interface Device {
  id: string
  name: string
  token: string
  isOnline: boolean
  energy?: number
  ethernetSpeed?: number
  createdAt: string
  notifications: number
}

export function RequisitesEnhanced() {
  const [requisites, setRequisites] = useState<Requisite[]>([])
  const [archivedRequisites, setArchivedRequisites] = useState<Requisite[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("active")
  const [searchQuery, setSearchQuery] = useState("")
  
  // Dialog states
  const [requisiteDialogOpen, setRequisiteDialogOpen] = useState(false)
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false)
  const [deviceTokenDialogOpen, setDeviceTokenDialogOpen] = useState(false)
  const [selectedRequisite, setSelectedRequisite] = useState<Requisite | null>(null)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  
  // Form states
  const [requisiteForm, setRequisiteForm] = useState({
    methodType: "c2c",
    cardNumber: "",
    phoneNumber: "",
    bankType: "SBERBANK",
    recipientName: "",
    minAmount: 1000,
    maxAmount: 20000,
    dailyLimit: 100000,
    monthlyLimit: 3000000,
    intervalMinutes: 0,
  })
  
  const [deviceForm, setDeviceForm] = useState({
    name: "",
  })
  
  const router = useRouter()
  const logout = useTraderAuth((state) => state.logout)
  
  useEffect(() => {
    fetchRequisites()
    fetchDevices()
  }, [])
  
  const fetchRequisites = async () => {
    try {
      setLoading(true)
      const data = await traderApi.getRequisites()
      
      // Separate active and archived requisites
      const active = data.filter((req: any) => !req.isArchived)
      const archived = data.filter((req: any) => req.isArchived)
      
      setRequisites(active)
      setArchivedRequisites(archived)
    } catch (error) {
      console.error('Error fetching requisites:', error)
      toast.error("Не удалось загрузить реквизиты")
    } finally {
      setLoading(false)
    }
  }
  
  const fetchDevices = async () => {
    try {
      const data = await traderApi.getDevices()
      setDevices(data)
    } catch (error) {
      console.error('Error fetching devices:', error)
      toast.error("Не удалось загрузить устройства")
    }
  }
  
  const handleCreateRequisite = async () => {
    try {
      const newRequisite = await traderApi.createRequisite(requisiteForm)
      await fetchRequisites() // Refresh the list
      setRequisiteDialogOpen(false)
      resetRequisiteForm()
      toast.success("Реквизит успешно добавлен")
    } catch (error) {
      console.error('Error creating requisite:', error)
      toast.error("Не удалось добавить реквизит")
    }
  }
  
  const handleUpdateRequisite = async () => {
    if (!selectedRequisite) return
    
    try {
      await traderApi.updateRequisite(selectedRequisite.id, requisiteForm)
      await fetchRequisites() // Refresh the list
      setRequisiteDialogOpen(false)
      setSelectedRequisite(null)
      resetRequisiteForm()
      toast.success("Реквизит успешно обновлен")
    } catch (error) {
      console.error('Error updating requisite:', error)
      toast.error("Не удалось обновить реквизит")
    }
  }
  
  const toggleRequisiteStatus = async (id: string) => {
    try {
      const requisite = requisites.find(r => r.id === id)
      if (!requisite) return
      
      await traderApi.toggleRequisite(id)
      await fetchRequisites() // Refresh the list
      toast.success(requisite.isActive ? "Реквизит деактивирован" : "Реквизит активирован")
    } catch (error) {
      console.error('Error toggling requisite status:', error)
      toast.error("Не удалось изменить статус")
    }
  }
  
  const archiveRequisite = async (id: string) => {
    try {
      const requisite = requisites.find(r => r.id === id)
      if (!requisite) return
      
      if (requisite.isActive) {
        toast.error("Деактивируйте реквизит перед архивированием")
        return
      }
      
      await traderApi.deleteRequisite(id)
      await fetchRequisites() // Refresh the list
      toast.success("Реквизит архивирован")
    } catch (error) {
      console.error('Error archiving requisite:', error)
      toast.error("Не удалось архивировать реквизит")
    }
  }
  
  const restoreRequisite = async (id: string) => {
    try {
      await traderApi.restoreRequisite(id)
      await fetchRequisites() // Refresh the list
      toast.success("Реквизит восстановлен")
    } catch (error) {
      console.error('Error restoring requisite:', error)
      toast.error("Не удалось восстановить реквизит")
    }
  }
  
  const createDevice = async () => {
    try {
      const newDevice = await traderApi.createDevice(deviceForm)
      await fetchDevices() // Refresh the list
      setDeviceDialogOpen(false)
      setDeviceForm({ name: "" })
      setSelectedDevice(newDevice)
      setDeviceTokenDialogOpen(true) // Show token dialog
      toast.success("Устройство создано")
    } catch (error) {
      console.error('Error creating device:', error)
      toast.error("Не удалось создать устройство")
    }
  }
  
  const deleteDevice = async (id: string) => {
    try {
      await traderApi.deleteDevice(id)
      await fetchDevices() // Refresh the list
      toast.success("Устройство удалено")
    } catch (error) {
      console.error('Error deleting device:', error)
      toast.error("Не удалось удалить устройство")
    }
  }
  
  const resetRequisiteForm = () => {
    setRequisiteForm({
      methodType: "c2c",
      cardNumber: "",
      phoneNumber: "",
      bankType: "SBERBANK",
      recipientName: "",
      minAmount: 1000,
      maxAmount: 20000,
      dailyLimit: 100000,
      monthlyLimit: 3000000,
      intervalMinutes: 0,
    })
  }
  
  const openEditDialog = (requisite: Requisite) => {
    if (!requisite.isArchived) {
      toast.error("Архивируйте реквизит перед редактированием")
      return
    }
    
    setSelectedRequisite(requisite)
    setRequisiteForm({
      methodType: requisite.methodType,
      cardNumber: requisite.cardNumber,
      phoneNumber: requisite.phoneNumber || "",
      bankType: requisite.bankType,
      recipientName: requisite.recipientName,
      minAmount: requisite.minAmount,
      maxAmount: requisite.maxAmount,
      dailyLimit: requisite.dailyLimit,
      monthlyLimit: requisite.monthlyLimit,
      intervalMinutes: requisite.intervalMinutes,
    })
    setRequisiteDialogOpen(true)
  }
  
  const filteredRequisites = activeTab === "active" 
    ? requisites.filter(r => 
        r.cardNumber.includes(searchQuery) || 
        r.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.phoneNumber && r.phoneNumber.includes(searchQuery))
      )
    : archivedRequisites.filter(r => 
        r.cardNumber.includes(searchQuery) || 
        r.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.phoneNumber && r.phoneNumber.includes(searchQuery))
      )
  
  const getTrafficPercentage = (current: number, limit: number) => {
    if (limit <= 0) return 0
    const percentage = (current / limit) * 100
    return Math.min(percentage, 100) // Cap at 100%
  }
  
  const getTrafficColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500"
    if (percentage >= 70) return "bg-orange-500"
    if (percentage >= 50) return "bg-yellow-500"
    return "bg-green-500"
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#006039]" />
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="w-fit">
            <TabsTrigger value="active">
              <CreditCard className="mr-2 h-4 w-4" />
              Активные
              <Badge variant="secondary" className="ml-2">
                {requisites.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="archived">
              <Archive className="mr-2 h-4 w-4" />
              Архив
              <Badge variant="secondary" className="ml-2">
                {archivedRequisites.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="devices">
              <Smartphone className="mr-2 h-4 w-4" />
              Устройства
              <Badge variant="secondary" className="ml-2">
                {devices.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            
            {activeTab !== "devices" && (
              <Button onClick={() => setRequisiteDialogOpen(true)} className="bg-[#006039] hover:bg-[#006039]/90">
                <Plus className="mr-2 h-4 w-4" />
                Добавить реквизит
              </Button>
            )}
            
            {activeTab === "devices" && (
              <Button onClick={() => setDeviceDialogOpen(true)} className="bg-[#006039] hover:bg-[#006039]/90">
                <Plus className="mr-2 h-4 w-4" />
                Добавить устройство
              </Button>
            )}
          </div>
        </div>
        
        <TabsContent value="active" className="space-y-4">
          {filteredRequisites.map((requisite) => (
            <Card key={requisite.id} className="p-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <BankCard
                      number={requisite.cardNumber}
                      bankType={requisite.bankType}
                      holderName={requisite.recipientName}
                      size="sm"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={requisite.isArchived ? "secondary" : "default"}>
                      {requisite.isArchived ? "Архивирован" : "Активен"}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4 text-[#006039]" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(requisite)}>
                          <Edit className="mr-2 h-4 w-4 text-[#006039]" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => archiveRequisite(requisite.id)}>
                          <Archive className="mr-2 h-4 w-4 text-[#006039]" />
                          Архивировать
                        </DropdownMenuItem>
                        {requisite.device && (
                          <DropdownMenuItem>
                            <Link className="mr-2 h-4 w-4 text-[#006039]" />
                            Отвязать устройство
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                {/* Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Лимиты на транзакцию</div>
                    <div className="text-sm font-medium">
                      {requisite.minAmount.toLocaleString('ru-RU')} - {requisite.maxAmount.toLocaleString('ru-RU')} ₽
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Привязанное устройство</div>
                    <div className="text-sm font-medium">
                      {requisite.device ? (
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-2 w-2 rounded-full",
                            requisite.device.isOnline ? "bg-green-500" : "bg-gray-400"
                          )} />
                          {requisite.device.name}
                        </div>
                      ) : (
                        <span className="text-gray-400">Не привязано</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Traffic */}
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-500">Дневной трафик</span>
                      <span className="font-medium">
                        {requisite.turnoverDay.toLocaleString('ru-RU')} / {requisite.dailyLimit.toLocaleString('ru-RU')} ₽
                        <span className="text-xs text-gray-500 ml-2">
                          ({getTrafficPercentage(requisite.turnoverDay, requisite.dailyLimit).toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                    <Progress 
                      value={getTrafficPercentage(requisite.turnoverDay, requisite.dailyLimit)} 
                      className="h-2"
                      indicatorClassName={getTrafficColor(getTrafficPercentage(requisite.turnoverDay, requisite.dailyLimit))}
                    />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-500">Месячный трафик</span>
                      <span className="font-medium">
                        {requisite.turnoverTotal.toLocaleString('ru-RU')} / {requisite.monthlyLimit.toLocaleString('ru-RU')} ₽
                        <span className="text-xs text-gray-500 ml-2">
                          ({getTrafficPercentage(requisite.turnoverTotal, requisite.monthlyLimit).toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                    <Progress 
                      value={getTrafficPercentage(requisite.turnoverTotal, requisite.monthlyLimit)} 
                      className="h-2"
                      indicatorClassName={getTrafficColor(getTrafficPercentage(requisite.turnoverTotal, requisite.monthlyLimit))}
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}
          
          {filteredRequisites.length === 0 && (
            <Card className="p-12 text-center">
              <CreditCard className="h-12 w-12 mx-auto text-[#006039] mb-4" />
              <p className="text-gray-500">Нет активных реквизитов</p>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="archived" className="space-y-4">
          {filteredRequisites.map((requisite) => (
            <Card key={requisite.id} className="p-6 opacity-75">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-[#006039]" />
                    <div>
                      <div className="font-medium">{requisite.recipientName}</div>
                      <div className="text-sm text-gray-500">**** {requisite.cardNumber.slice(-4)}</div>
                      {requisite.phoneNumber && (
                        <div className="text-sm text-gray-400">{requisite.phoneNumber}</div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-500">
                    Архивирован {format(new Date(requisite.updatedAt), "dd.MM.yyyy", { locale: ru })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => restoreRequisite(requisite.id)}
                  >
                    <RotateCcw className="h-4 w-4 mr-2 text-[#006039]" />
                    Восстановить
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          
          {filteredRequisites.length === 0 && (
            <Card className="p-12 text-center">
              <Archive className="h-12 w-12 mx-auto text-[#006039] mb-4" />
              <p className="text-gray-500">Нет архивных реквизитов</p>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="devices" className="space-y-4">
          {devices.map((device) => (
            <Card 
              key={device.id} 
              className="p-6 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/trader/devices/${device.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-12 w-12 rounded-full flex items-center justify-center",
                    device.isOnline ? "bg-green-100" : "bg-gray-100"
                  )}>
                    <Smartphone className={cn(
                      "h-6 w-6",
                      device.isOnline ? "text-green-600" : "text-gray-600"
                    )} />
                  </div>
                  <div>
                    <div className="font-medium">{device.name}</div>
                    <div className="text-sm text-gray-500">
                      {device.isOnline ? "В сети" : "Не в сети"} • {device.notifications} уведомлений
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteDevice(device.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-[#006039]" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          
          {devices.length === 0 && (
            <Card className="p-12 text-center">
              <Smartphone className="h-12 w-12 mx-auto text-[#006039] mb-4" />
              <p className="text-gray-500">Нет подключенных устройств</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Add/Edit Requisite Dialog */}
      <Dialog open={requisiteDialogOpen} onOpenChange={setRequisiteDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedRequisite ? "Редактировать реквизит" : "Добавить реквизит"}
            </DialogTitle>
            <DialogDescription>
              Заполните информацию о платежном реквизите
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <Label htmlFor="cardNumber">Номер карты</Label>
              <Input
                id="cardNumber"
                placeholder="0000 0000 0000 0000"
                value={requisiteForm.cardNumber}
                onChange={(e) => setRequisiteForm({ ...requisiteForm, cardNumber: e.target.value.replace(/\s/g, '') })}
              />
            </div>
            
            <div>
              <Label>Банк</Label>
              <BankSelector
                value={requisiteForm.bankType}
                onChange={(value) => setRequisiteForm({ ...requisiteForm, bankType: value })}
              />
            </div>
            
            <div>
              <Label htmlFor="recipientName">Имя получателя</Label>
              <Input
                id="recipientName"
                placeholder="Иван Иванов"
                value={requisiteForm.recipientName}
                onChange={(e) => setRequisiteForm({ ...requisiteForm, recipientName: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="phoneNumber">Номер телефона (опционально)</Label>
              <Input
                id="phoneNumber"
                placeholder="+7 900 000 00 00"
                value={requisiteForm.phoneNumber}
                onChange={(e) => setRequisiteForm({ ...requisiteForm, phoneNumber: e.target.value })}
              />
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Лимиты на транзакцию</Label>
                <RangeSlider
                  min={0}
                  max={100000000}
                  step={1000}
                  value={[requisiteForm.minAmount, requisiteForm.maxAmount]}
                  onValueChange={([min, max]) => setRequisiteForm({ ...requisiteForm, minAmount: min, maxAmount: max })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dailyLimit">Дневной лимит</Label>
                  <Input
                    id="dailyLimit"
                    type="number"
                    placeholder="100000"
                    value={requisiteForm.dailyLimit}
                    onChange={(e) => setRequisiteForm({ ...requisiteForm, dailyLimit: parseInt(e.target.value) || 0 })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="monthlyLimit">Месячный лимит</Label>
                  <Input
                    id="monthlyLimit"
                    type="number"
                    placeholder="3000000"
                    value={requisiteForm.monthlyLimit}
                    onChange={(e) => setRequisiteForm({ ...requisiteForm, monthlyLimit: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRequisiteDialogOpen(false)
              setSelectedRequisite(null)
              resetRequisiteForm()
            }}>
              Отмена
            </Button>
            <Button 
              onClick={selectedRequisite ? handleUpdateRequisite : handleCreateRequisite}
              className="bg-[#006039] hover:bg-[#006039]/90"
            >
              {selectedRequisite ? "Сохранить" : "Добавить"}
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
          
          <div>
            <Label htmlFor="deviceName">Название устройства</Label>
            <Input
              id="deviceName"
              placeholder="Samsung Galaxy S23"
              value={deviceForm.name}
              onChange={(e) => setDeviceForm({ name: e.target.value })}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeviceDialogOpen(false)
              setDeviceForm({ name: "" })
            }}>
              Отмена
            </Button>
            <Button 
              onClick={createDevice}
              className="bg-[#006039] hover:bg-[#006039]/90"
              disabled={!deviceForm.name}
            >
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Device Token Dialog */}
      <Dialog open={deviceTokenDialogOpen} onOpenChange={setDeviceTokenDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Токен устройства</DialogTitle>
            <DialogDescription>
              Сохраните этот токен в безопасном месте. Он понадобится для подключения устройства.
            </DialogDescription>
          </DialogHeader>
          
          {selectedDevice && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Токен устройства:</p>
                <p className="font-mono text-sm break-all">{selectedDevice.token}</p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedDevice.token)
                    toast.success("Токен скопирован в буфер обмена")
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Скопировать
                </Button>
                <Button
                  className="flex-1 bg-[#006039] hover:bg-[#006039]/90"
                  onClick={() => router.push(`/trader/devices/${selectedDevice.id}`)}
                >
                  Перейти к устройству
                </Button>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeviceTokenDialogOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}