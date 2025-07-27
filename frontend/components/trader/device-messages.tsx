'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { 
  Smartphone,
  Search, 
  RefreshCw,
  Filter,
  Calendar,
  AlertCircle,
  DollarSign,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  MessageSquare
} from 'lucide-react'
import { toast } from 'sonner'
import { traderApi } from '@/lib/api/trader'
import { formatRelativeTime, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface Device {
  id: string
  name: string
  isOnline: boolean
  lastSeen: string
  energy: number
  notifications: number
}

interface Notification {
  id: string
  deviceId: string
  device?: Device
  text: string
  type: string
  packageName?: string
  amount?: number
  balance?: number
  sender?: string
  isRead: boolean
  createdAt: string
}

const notificationTypeIcons: Record<string, React.ElementType> = {
  SMS: MessageSquare,
  PUSH: AlertCircle,
  PAYMENT: DollarSign,
  TRANSFER: CreditCard,
  SUCCESS: CheckCircle,
  ERROR: XCircle,
  INFO: AlertCircle,
  PENDING: Clock
}

const notificationTypeColors: Record<string, string> = {
  SMS: 'bg-blue-100 text-blue-800 border-blue-200',
  PUSH: 'bg-purple-100 text-purple-800 border-purple-200',
  PAYMENT: 'bg-purple-100 text-purple-800 border-purple-200',
  TRANSFER: 'bg-purple-100 text-purple-800 border-purple-200',
  SUCCESS: 'bg-purple-100 text-purple-800 border-purple-200',
  ERROR: 'bg-red-100 text-red-800 border-red-200',
  INFO: 'bg-gray-100 text-gray-800 border-gray-200',
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200'
}

export function DeviceMessages() {
  const [devices, setDevices] = useState<Device[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>('all')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const intervalRef = useRef<NodeJS.Timeout>()

  const fetchDevices = async () => {
    try {
      const response = await traderApi.getDevices()
      const devicesData = response.data || response || []
      setDevices(Array.isArray(devicesData) ? devicesData : [])
      return Array.isArray(devicesData) ? devicesData : []
    } catch (error) {
      console.error('Failed to fetch devices:', error)
      setDevices([])
      return []
    }
  }

  const fetchNotifications = async (deviceId: string = 'all') => {
    try {
      if (!refreshing) setLoading(true)
      
      let allNotifications: Notification[] = []
      
      if (deviceId === 'all') {
        // Fetch notifications from all devices
        const devicesData = await fetchDevices()
        const notificationPromises = devicesData.map(async (device: Device) => {
          try {
            const response = await traderApi.getDevice(device.id)
            const deviceData = response.data || response || {}
            const notifications = deviceData.recentNotifications || []
            return Array.isArray(notifications) ? notifications.map((n: any) => ({
              ...n,
              device: {
                id: device.id,
                name: device.name,
                isOnline: device.isOnline
              }
            })) : []
          } catch (error) {
            console.error(`Failed to fetch notifications for device ${device.id}:`, error)
            return []
          }
        })
        
        const results = await Promise.all(notificationPromises)
        allNotifications = results.flat()
      } else {
        // Fetch notifications from specific device
        const response = await traderApi.getDevice(deviceId)
        const deviceData = response.data || response || {}
        const notifications = deviceData.recentNotifications || []
        allNotifications = Array.isArray(notifications) ? notifications.map((n: any) => ({
          ...n,
          device: devices.find(d => d.id === deviceId)
        })) : []
      }
      
      // Sort by date, newest first
      if (Array.isArray(allNotifications) && allNotifications.length > 0) {
        allNotifications.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      }
      
      setNotifications(Array.isArray(allNotifications) ? allNotifications : [])
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
      setNotifications([])
      if (!refreshing) {
        toast.error('Не удалось загрузить сообщения')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchNotifications(selectedDevice)
    
    // Set up auto-refresh every 5 seconds
    intervalRef.current = setInterval(() => {
      setRefreshing(true)
      fetchNotifications(selectedDevice)
    }, 5000)
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [selectedDevice])

  const filteredNotifications = notifications.filter(notification => {
    const notificationText = notification.text || ''
    const notificationSender = notification.sender || ''
    const searchLower = searchQuery.toLowerCase()
    
    const matchesSearch = notificationText.toLowerCase().includes(searchLower) ||
                         notificationSender.toLowerCase().includes(searchLower)
    const matchesType = typeFilter === 'all' || notification.type === typeFilter
    return matchesSearch && matchesType
  })

  const groupNotificationsByDate = (notifications: Notification[]) => {
    const groups: Record<string, Notification[]> = {}
    
    notifications.forEach(notification => {
      const date = new Date(notification.createdAt)
      const dateKey = format(date, 'yyyy-MM-dd')
      
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(notification)
    })
    
    return groups
  }

  const formatDateGroup = (dateKey: string) => {
    const date = new Date(dateKey)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return 'Сегодня'
    } else if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return 'Вчера'
    }
    
    return format(date, 'd MMMM yyyy', { locale: ru })
  }

  const groupedNotifications = groupNotificationsByDate(filteredNotifications)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Сообщения устройств</h1>
          {refreshing && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setRefreshing(true)
            fetchNotifications(selectedDevice)
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </Button>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Поиск по сообщениям..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Smartphone className="h-4 w-4 mr-2" />
                  {selectedDevice === 'all' ? 'Все устройства' : 
                   devices.find(d => d.id === selectedDevice)?.name || 'Устройство'}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setSelectedDevice('all')}>
                  Все устройства
                </DropdownMenuItem>
                {devices.map(device => (
                  <DropdownMenuItem 
                    key={device.id}
                    onClick={() => setSelectedDevice(device.id)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{device.name}</span>
                      <div className="flex items-center gap-2">
                        {device.notifications > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {device.notifications}
                          </Badge>
                        )}
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          device.isOnline ? "bg-purple-500" : "bg-gray-300"
                        )} />
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setTypeFilter('all')}>
                  Все типы
                </DropdownMenuItem>
                {Object.keys(notificationTypeIcons).map(type => (
                  <DropdownMenuItem 
                    key={type}
                    onClick={() => setTypeFilter(type)}
                  >
                    {type}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>

      {/* Notifications List */}
      <Card className="p-0">
        <div className="max-h-[600px] overflow-y-auto">
          {loading && !refreshing ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Нет сообщений</p>
            </div>
          ) : (
            <>
              {Object.entries(groupedNotifications).map(([dateKey, dateNotifications]) => (
                <div key={dateKey}>
                  <div className="sticky top-0 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600 border-b">
                    {formatDateGroup(dateKey)}
                  </div>
                  {dateNotifications.map((notification) => {
                    const Icon = notificationTypeIcons[notification.type] || MessageSquare
                    const colorClass = notificationTypeColors[notification.type] || 'bg-gray-100 text-gray-800'
                    
                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          "flex items-start gap-4 p-4 border-b hover:bg-gray-50 transition-colors",
                          !notification.isRead && "bg-blue-50/50"
                        )}
                      >
                        <div className={cn("p-2 rounded-lg", colorClass.split(' ')[0])}>
                          <Icon className="h-4 w-4" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {notification.device && (
                                  <Badge variant="outline" className="text-xs">
                                    <Smartphone className="h-3 w-3 mr-1" />
                                    {notification.device.name}
                                  </Badge>
                                )}
                                {notification.sender && (
                                  <span className="text-sm font-medium">{notification.sender}</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {notification.text}
                              </p>
                            </div>
                            
                            <span className="text-sm text-gray-500 shrink-0">
                              {formatRelativeTime(notification.createdAt)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              variant="outline"
                              className={cn("text-xs", colorClass)}
                            >
                              {notification.type}
                            </Badge>
                            
                            {notification.amount && (
                              <Badge variant="outline" className="text-xs">
                                {notification.amount.toLocaleString('ru-RU')} ₽
                              </Badge>
                            )}
                            
                            {notification.balance && (
                              <Badge variant="outline" className="text-xs">
                                Баланс: {notification.balance.toLocaleString('ru-RU')} ₽
                              </Badge>
                            )}
                            
                            {notification.packageName && (
                              <Badge variant="secondary" className="text-xs">
                                {notification.packageName}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </>
          )}
        </div>
      </Card>
    </div>
  )
}