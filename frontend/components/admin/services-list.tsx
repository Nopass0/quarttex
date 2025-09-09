'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { 
  Search, 
  RefreshCw, 
  Play, 
  Pause,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { useAdminAuth } from '@/stores/auth'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'

type ServiceStatus = 'RUNNING' | 'STOPPED' | 'ERROR'

type Service = {
  id: string
  name: string
  displayName: string
  description?: string
  status: ServiceStatus
  interval: number
  enabled: boolean
  lastTick?: string
  lastError?: string
  errorCount: number
  publicFields?: any
  createdAt: string
  updatedAt: string
  _count: {
    logs: number
  }
}

const statusIcons: Record<ServiceStatus, any> = {
  RUNNING: CheckCircle2,
  STOPPED: XCircle,
  ERROR: AlertCircle,
}

const statusColors: Record<ServiceStatus, string> = {
  RUNNING: 'bg-green-100 text-green-700',
  STOPPED: 'bg-gray-100 text-gray-700',
  ERROR: 'bg-red-100 text-red-700',
}

const statusLabels: Record<ServiceStatus, string> = {
  RUNNING: 'Запущен',
  STOPPED: 'Остановлен',
  ERROR: 'Ошибка',
}

export function ServicesList() {
  const [searchQuery, setSearchQuery] = useState('')
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { token: adminToken } = useAdminAuth()

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/services/list`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch services')
      const data = await response.json()
      setServices(data.data)
    } catch (error) {
      toast.error('Не удалось загрузить список сервисов')
    } finally {
      setIsLoading(false)
    }
  }

  const handleServiceAction = async (serviceName: string, action: 'start' | 'stop') => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/services/${serviceName}/${action}`, {
        method: 'POST',
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error(`Failed to ${action} service`)
      const data = await response.json()
      
      if (data.success) {
        toast.success(data.message)
        await fetchServices()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(`Не удалось ${action === 'start' ? 'запустить' : 'остановить'} сервис`)
    } finally {
      setIsLoading(false)
    }
  }


  const filteredServices = services.filter(service =>
    service.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatInterval = (interval: number) => {
    const seconds = Math.floor(interval / 1000)
    if (seconds < 60) return `${seconds}с`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}м`
    const hours = Math.floor(minutes / 60)
    return `${hours}ч ${minutes % 60}м`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск сервисов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchServices}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {isLoading && services.length === 0 ? (
        <div className="flex justify-center items-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredServices.map((service) => {
            const StatusIcon = statusIcons[service.status]
            return (
              <Card 
                key={service.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  // Map service names to URL paths
                  const serviceUrlMap: Record<string, string> = {
                    'DeviceEmulatorService': 'device-emulator',
                    'NotificationAutoProcessorService': 'notification-processor',
                  }
                  const urlPath = serviceUrlMap[service.name] || service.name
                  window.location.href = `/admin/services/${urlPath}`
                }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${statusColors[service.status]}`}>
                          <StatusIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {service.displayName}
                          </h3>
                          <p className="text-sm text-gray-500">{service.name}</p>
                        </div>
                        <Badge className={`${statusColors[service.status]} border-0`}>
                          {statusLabels[service.status]}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {service.description || 'Нет описания'}
                      </p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Интервал:</span>
                          <span className="font-medium">{formatInterval(service.interval)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Логи:</span>
                          <span className="font-medium">{service._count.logs}</span>
                          {service.errorCount > 0 && (
                            <Badge variant="destructive" className="text-xs ml-1">
                              {service.errorCount} ошибок
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">Последний запуск:</span>
                          <span className="font-medium text-xs">
                            {service.lastTick ? formatDateTime(service.lastTick) : 'Никогда'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">Активен:</span>
                          <span className="font-medium">{service.enabled ? 'Да' : 'Нет'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4 flex-shrink-0">
                      {service.status === 'RUNNING' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleServiceAction(service.name, 'stop')
                          }}
                          disabled={isLoading}
                        >
                          <Pause className="h-4 w-4 mr-2" />
                          Стоп
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleServiceAction(service.name, 'start')
                          }}
                          disabled={isLoading}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Старт
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          
          {filteredServices.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-500">
              Сервисы не найдены
            </div>
          )}
        </div>
      )}
    </div>
  )
}