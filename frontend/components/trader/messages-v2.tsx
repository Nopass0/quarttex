'use client'

import React, { useState, useEffect } from 'react'
import { 
  MessageSquare, 
  Hash,
  Search, 
  X,
  Calendar,
  ChevronDown,
  Smartphone,
  AlertCircle,
  CheckCircle,
  CreditCard,
  DollarSign,
  SlidersHorizontal,
  ArrowUpDown
} from 'lucide-react'
import { toast } from 'sonner'
import { traderApiInstance } from '@/services/api'
import { formatDateTime, cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import styles from './messages-v2.module.css'

interface Message {
  id: string
  type: 'notification' | 'sms'
  deviceId: string
  device: {
    id: string
    name: string
    model: string
  }
  packageName?: string
  appName?: string
  phoneNumber?: string
  sender?: string
  content: string
  timestamp: string
  createdAt: string
  isProcessed: boolean
  matchedTransactionId?: string
  transaction?: {
    id: string
    amount: number
    status: string
  }
  amount?: number
}

export function TraderMessagesV2() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [filterType, setFilterType] = useState('all')
  const [filterDevice, setFilterDevice] = useState('all')
  const [filterProcessed, setFilterProcessed] = useState('all')
  const [devices, setDevices] = useState<Array<{ id: string, name: string }>>([])
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null)

  useEffect(() => {
    fetchMessages()
    fetchDevices()
  }, [page, searchQuery, sortBy, filterType, filterDevice, filterProcessed])

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(searchQuery && { search: searchQuery }),
        ...(filterType !== 'all' && { type: filterType }),
        ...(filterDevice !== 'all' && { deviceId: filterDevice }),
        ...(filterProcessed !== 'all' && { isProcessed: filterProcessed }),
      })

      const response = await traderApiInstance.get(`/trader/messages?${params}`)
      let data = response.data.data || []
      
      // Sort messages
      if (sortBy === 'oldest') {
        data = data.reverse()
      }
      
      setMessages(data)
      setTotalPages(response.data.meta?.totalPages || 1)
    } catch (error) {
      toast.error('Не удалось загрузить сообщения')
    } finally {
      setLoading(false)
    }
  }

  const fetchDevices = async () => {
    try {
      const response = await traderApiInstance.get('/trader/devices')
      setDevices(response.data || [])
    } catch (error) {
      console.error('Failed to fetch devices:', error)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchMessages()
  }

  const clearSearch = () => {
    setSearchQuery('')
    setPage(1)
    fetchMessages()
  }

  const getMessageStyle = (message: Message) => {
    if (message.matchedTransactionId) {
      return 'accent'
    }
    if (message.transaction) {
      return message.transaction.status === 'completed' ? 'primary' : 'danger'
    }
    if (!message.isProcessed) {
      return 'warning'
    }
    return 'primary'
  }

  const getMessageIcon = (type: string, style: string) => {
    const Icon = type === 'notification' ? MessageSquare : Hash
    return (
      <div className={cn(styles.messageIcon, styles[style])}>
        <Icon />
      </div>
    )
  }

  const formatAmount = (amount?: number) => {
    if (!amount) return '0 RUB'
    return `${amount.toLocaleString('ru-RU')} RUB`
  }

  const toggleMessageExpand = (messageId: string) => {
    setExpandedMessageId(expandedMessageId === messageId ? null : messageId)
  }

  return (
    <div className={styles.container}>
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Сообщения</h1>
        </div>

        {/* Filters Section */}
        <div className={styles.filtersContainer}>
          {/* Search */}
          <div className={styles.searchSection}>
            <div className={styles.searchTitle}>Поиск по id сообщений</div>
            <form onSubmit={handleSearch} className={styles.searchWrapper}>
              <div className={styles.searchIcon}>
                <Search />
              </div>
              <input
                className={styles.searchInput}
                placeholder="Id сообщения"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className={styles.searchControls}>
                <button type="submit" className={styles.searchButton}>
                  <Search />
                </button>
                {searchQuery && (
                  <button type="button" onClick={clearSearch} className={styles.cancelButton}>
                    <X />
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Filters Grid */}
          <div className={styles.filtersGrid}>
            {/* Filter Parameters */}
            <div className={styles.filterWrapper}>
              <div className={styles.filterTitle}>Параметры поиска</div>
              <button className={styles.filterButton} onClick={() => setShowFilters(!showFilters)}>
                <SlidersHorizontal className={styles.iconLeft} />
                <span className={styles.placeholder}>
                  {(filterType !== 'all' || filterDevice !== 'all' || filterProcessed !== 'all') 
                    ? `Выбрано: ${[
                        filterType !== 'all' && 1,
                        filterDevice !== 'all' && 1,
                        filterProcessed !== 'all' && 1
                      ].filter(Boolean).length}`
                    : 'Не выбраны'
                  }
                </span>
                <ChevronDown className={styles.chevron} />
              </button>
            </div>

            {/* Sort */}
            <div className={styles.sortSection}>
              <div className={styles.sortLabel}>Сортировка результатов</div>
              <div className={styles.sortWrapper}>
                <button 
                  className={styles.sortButton} 
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                >
                  <span className={styles.selectedItem}>
                    <span className={styles.sortIcon}>
                      <ArrowUpDown />
                    </span>
                    <span className={styles.selectedText}>
                      {sortBy === 'newest' ? 'Сначала новые' : 'Сначала старые'}
                    </span>
                  </span>
                  <ChevronDown className={cn(styles.chevron, styles.sortChevron)} />
                </button>
                <ul className={cn(styles.dropdown, showSortDropdown && styles.dropdownOpen)}>
                  <li 
                    className={cn(styles.dropdownItem, sortBy === 'newest' && styles.active)}
                    onClick={() => {
                      setSortBy('newest')
                      setShowSortDropdown(false)
                    }}
                  >
                    Сначала новые
                  </li>
                  <li 
                    className={cn(styles.dropdownItem, sortBy === 'oldest' && styles.active)}
                    onClick={() => {
                      setSortBy('oldest')
                      setShowSortDropdown(false)
                    }}
                  >
                    Сначала старые
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Extended Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Тип</label>
                <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="all">Все типы</option>
                  <option value="notification">Уведомления</option>
                  <option value="sms">SMS</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Устройство</label>
                <select 
                  value={filterDevice} 
                  onChange={(e) => setFilterDevice(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="all">Все устройства</option>
                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Статус</label>
                <select 
                  value={filterProcessed} 
                  onChange={(e) => setFilterProcessed(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="all">Все статусы</option>
                  <option value="false">Новые</option>
                  <option value="true">Обработанные</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Messages List */}
        <div className={styles.messagesList}>
          {loading ? (
            <div className={styles.loading}>
              <span className={styles.loader}></span>
            </div>
          ) : messages.length > 0 ? (
            messages.map((message) => {
              const style = getMessageStyle(message)
              const isExpanded = expandedMessageId === message.id
              return (
                <div 
                  key={message.id} 
                  className={styles.messageItem}
                  onClick={() => toggleMessageExpand(message.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.messageContent}>
                    <div className={styles.messageHeader}>
                      {/* Icon */}
                      {getMessageIcon(message.type, style)}
                      
                      {/* Content */}
                      <div className={styles.messageBody}>
                        <div className={styles.messageTitle}>
                          <span className={cn(styles.messageSender, styles[style])}>
                            {message.type === 'notification' 
                              ? message.appName || message.packageName 
                              : message.phoneNumber || message.sender}
                          </span>
                          <span className={styles.messageTime}>
                            {formatDateTime(message.timestamp)}
                          </span>
                          <span className="sm:hidden text-xs text-gray-500">
                            {new Date(message.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className={styles.messageText}>{message.content}</p>
                        
                        {/* Fields */}
                        <div className={styles.fieldContainer}>
                          <div className={cn(styles.fieldIcon, styles[style])}>
                            <Smartphone />
                          </div>
                          <div className={styles.fieldContent}>
                            <div className={styles.fieldText}>{message.device.name}</div>
                            <div className={styles.fieldDescription}>{message.device.id}</div>
                          </div>
                        </div>
                        
                        {isExpanded && (
                          <>
                            <div className={styles.fieldContainer}>
                              <div className={cn(styles.fieldIcon, styles[style])}>
                                <MessageSquare />
                              </div>
                              <div className={styles.fieldContent}>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{message.content}</p>
                              </div>
                            </div>
                            
                            {message.transaction && (
                              <div className={styles.fieldContainer}>
                                <div className={cn(styles.fieldIcon, styles[style])}>
                                  <DollarSign />
                                </div>
                                <div className={styles.fieldContent}>
                                  <div className={styles.fieldText}>Транзакция ${message.transaction.id}</div>
                                  <div className={styles.fieldDescription}>
                                    Статус: {message.transaction.status === 'completed' ? 'Завершена' : 'В обработке'}
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            <div className={styles.fieldContainer}>
                              <div className={cn(styles.fieldIcon, styles[style])}>
                                <Calendar />
                              </div>
                              <div className={styles.fieldContent}>
                                <div className={styles.fieldText}>Создано</div>
                                <div className={styles.fieldDescription}>{formatDateTime(message.createdAt)}</div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      
                      {/* Amount */}
                      <div className={cn(styles.messageAmount, styles[style])}>
                        {formatAmount(message.amount || message.transaction?.amount)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className={styles.emptyState}>
              <MessageSquare className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>Нет сообщений</p>
              <p className={styles.emptyDescription}>
                Сообщения с ваших устройств появятся здесь
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Назад
            </button>
            <span className="text-sm text-gray-600">
              Страница {page} из {totalPages}
            </span>
            <button
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              Вперед
            </button>
          </div>
        )}
      </div>
    </div>
  )
}