"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { traderApi } from "@/services/api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { TraderHeader } from "@/components/trader/trader-header"
import { 
  Loader2, 
  MoreVertical, 
  ChevronDown, 
  Copy,
  Eye,
  MessageSquare,
  CreditCard,
  Wallet,
  Clock,
  CheckCircle,
  X,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  DollarSign,
  Building2,
  SlidersHorizontal,
  CheckCircle2,
  TrendingUp,
  Send,
  XCircle,
  FileText,
  Banknote,
  RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Payout {
  id: string
  numericId: number
  amount: number
  currency: string
  status: string
  method: string
  recipientName?: string
  cardNumber?: string
  walletAddress?: string
  bankType?: string
  createdAt: string
  completedAt?: string
  transactionHash?: string
  commission?: number
  isNew?: boolean
}

const statusConfig = {
  CREATED: { label: "Создана", color: "bg-yellow-50 text-yellow-600 border-yellow-200" },
  PENDING: { label: "Ожидает", color: "bg-blue-50 text-blue-600 border-blue-200" },
  PROCESSING: { label: "В обработке", color: "bg-blue-50 text-blue-600 border-blue-200" },
  COMPLETED: { label: "Выполнено", color: "bg-green-50 text-green-600 border-green-200" },
  FAILED: { label: "Ошибка", color: "bg-red-50 text-red-600 border-red-200" },
  CANCELLED: { label: "Отменено", color: "bg-gray-50 text-gray-600 border-gray-200" },
}

export function PayoutsList() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("newest")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterAmount, setFilterAmount] = useState({ exact: "", min: "", max: "" })
  const [filterAmountType, setFilterAmountType] = useState("range")
  const [filterMethod, setFilterMethod] = useState("all")
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [showAutoRefresh, setShowAutoRefresh] = useState(false)
  const [period, setPeriod] = useState("24h")
  const [stats, setStats] = useState({
    totalPayouts: 0,
    totalAmount: 0,
    profit: 0,
    currency: "USDT"
  })

  const router = useRouter()

  useEffect(() => {
    fetchPayouts()
  }, [])

  useEffect(() => {
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchPayouts()
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchPayouts = async () => {
    try {
      setLoading(true)

      // Mock data
      const mockPayouts: Payout[] = [
        {
          id: "550e8400-e29b-41d4-a716-446655440000",
          numericId: 1001,
          amount: 150.50,
          currency: "USDT",
          status: "COMPLETED",
          method: "card",
          recipientName: "Иван Иванов",
          cardNumber: "4276 **** **** 1234",
          bankType: "SBERBANK",
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          completedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          transactionHash: "0xabcdef1234567890",
          commission: 3.01,
          isNew: false
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440001",
          numericId: 1002,
          amount: 250.00,
          currency: "USDT",
          status: "PROCESSING",
          method: "wallet",
          walletAddress: "0x742d35Cc6632C0532C718123456789ABCDEF0123",
          createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          commission: 5.00,
          isNew: true
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440002",
          numericId: 1003,
          amount: 75.25,
          currency: "USDT",
          status: "PENDING",
          method: "card",
          recipientName: "Петр Петров",
          cardNumber: "5536 **** **** 9012",
          bankType: "TBANK",
          createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          commission: 1.51,
          isNew: false
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440003",
          numericId: 1004,
          amount: 500.00,
          currency: "USDT",
          status: "FAILED",
          method: "card",
          recipientName: "Мария Сидорова",
          cardNumber: "4100 **** **** 5678",
          bankType: "VTB",
          createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          commission: 10.00,
          isNew: false
        }
      ]

      setPayouts(mockPayouts)

      // Calculate stats
      setStats({
        totalPayouts: mockPayouts.length,
        totalAmount: mockPayouts.reduce((sum, p) => sum + p.amount, 0),
        profit: mockPayouts.reduce((sum, p) => sum + (p.commission || 0), 0),
        currency: "USDT"
      })

    } catch (error) {
      console.error("Error fetching payouts:", error)
      toast.error("Не удалось загрузить выплаты")
    } finally {
      setLoading(false)
    }
  }

  const filteredPayouts = payouts
    .filter((payout) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (
          !payout.id.toLowerCase().includes(query) &&
          !payout.numericId.toString().includes(query) &&
          !payout.recipientName?.toLowerCase().includes(query) &&
          !payout.cardNumber?.includes(query) &&
          !payout.walletAddress?.toLowerCase().includes(query)
        ) {
          return false
        }
      }

      // Status filter
      if (filterStatus !== "all" && payout.status !== filterStatus) return false

      // Method filter
      if (filterMethod !== "all" && payout.method !== filterMethod) return false

      // Amount filter
      if (filterAmountType === "exact" && filterAmount.exact) {
        if (payout.amount !== parseFloat(filterAmount.exact)) return false
      } else {
        if (filterAmount.min && payout.amount < parseFloat(filterAmount.min)) return false
        if (filterAmount.max && payout.amount > parseFloat(filterAmount.max)) return false
      }

      // Date filter
      if (filterDateFrom && new Date(payout.createdAt) < new Date(filterDateFrom)) return false
      if (filterDateTo && new Date(payout.createdAt) > new Date(filterDateTo)) return false

      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case "amount_desc":
          return b.amount - a.amount
        case "amount_asc":
          return a.amount - b.amount
        case "newest":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })

  const activeFiltersCount = [
    filterStatus !== "all" && 1,
    filterMethod !== "all" && 1,
    (filterAmount.min || filterAmount.max || filterAmount.exact) && 1,
    (filterDateFrom || filterDateTo) && 1,
  ].filter(Boolean).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#006039]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Выплаты</h1>
        <TraderHeader />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Всего выплат</p>
              <p className="text-2xl font-bold">{stats.totalPayouts}</p>
            </div>
            <Send className="h-8 w-8 text-[#006039]" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Общая сумма</p>
              <p className="text-2xl font-bold">{stats.totalAmount.toFixed(2)} {stats.currency}</p>
            </div>
            <DollarSign className="h-8 w-8 text-[#006039]" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Прибыль</p>
              <p className="text-2xl font-bold text-green-600">+{stats.profit.toFixed(2)} {stats.currency}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Период</p>
              <p className="text-lg font-medium">{period === "24h" ? "24 часа" : "Неделя"}</p>
            </div>
            <Calendar className="h-8 w-8 text-[#006039]" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Поиск по ID, получателю или адресу..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">Фильтры</span>
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Фильтры</h4>
                    {activeFiltersCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFilterStatus("all")
                          setFilterAmount({ exact: "", min: "", max: "" })
                          setFilterAmountType("range")
                          setFilterMethod("all")
                          setFilterDateFrom("")
                          setFilterDateTo("")
                        }}
                        className="h-8 px-2 text-xs"
                      >
                        Сбросить
                      </Button>
                    )}
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm">Статус</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          <span>
                            {filterStatus === "all"
                              ? "Все статусы"
                              : statusConfig[filterStatus]?.label}
                          </span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full">
                        <DropdownMenuItem onClick={() => setFilterStatus("all")}>
                          Все статусы
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {Object.entries(statusConfig).map(([key, config]) => (
                          <DropdownMenuItem
                            key={key}
                            onClick={() => setFilterStatus(key)}
                          >
                            {config.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Method Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm">Метод</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          <span>
                            {filterMethod === "all"
                              ? "Все методы"
                              : filterMethod === "card"
                              ? "На карту"
                              : "На кошелек"}
                          </span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full">
                        <DropdownMenuItem onClick={() => setFilterMethod("all")}>
                          Все методы
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setFilterMethod("card")}>
                          На карту
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilterMethod("wallet")}>
                          На кошелек
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Amount Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm">Сумма</Label>
                    <div className="flex gap-2 mb-2">
                      <Button
                        variant={filterAmountType === "range" ? "default" : "outline"}
                        size="sm"
                        className="flex-1 h-8"
                        onClick={() => setFilterAmountType("range")}
                      >
                        Диапазон
                      </Button>
                      <Button
                        variant={filterAmountType === "exact" ? "default" : "outline"}
                        size="sm"
                        className="flex-1 h-8"
                        onClick={() => setFilterAmountType("exact")}
                      >
                        Точная
                      </Button>
                    </div>
                    {filterAmountType === "exact" ? (
                      <Input
                        type="number"
                        placeholder="Точная сумма"
                        value={filterAmount.exact}
                        onChange={(e) =>
                          setFilterAmount({ ...filterAmount, exact: e.target.value })
                        }
                      />
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="От"
                          value={filterAmount.min}
                          onChange={(e) =>
                            setFilterAmount({ ...filterAmount, min: e.target.value })
                          }
                        />
                        <Input
                          type="number"
                          placeholder="До"
                          value={filterAmount.max}
                          onChange={(e) =>
                            setFilterAmount({ ...filterAmount, max: e.target.value })
                          }
                        />
                      </div>
                    )}
                  </div>

                  {/* Date Range */}
                  <div className="space-y-2">
                    <Label className="text-sm">Дата создания</Label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label htmlFor="date-from" className="text-xs text-gray-500">
                          От
                        </Label>
                        <Input
                          id="date-from"
                          type="date"
                          value={filterDateFrom}
                          onChange={(e) => setFilterDateFrom(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="date-to" className="text-xs text-gray-500">
                          До
                        </Label>
                        <Input
                          id="date-to"
                          type="date"
                          value={filterDateTo}
                          onChange={(e) => setFilterDateTo(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setFilterStatus("all")
                        setFilterAmount({ exact: "", min: "", max: "" })
                        setFilterAmountType("range")
                        setFilterMethod("all")
                        setFilterDateFrom("")
                        setFilterDateTo("")
                      }}
                    >
                      Сбросить фильтры
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-[#006039] hover:bg-[#006039]/90"
                      onClick={() => setFiltersOpen(false)}
                    >
                      Применить фильтры
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {sortBy === "newest"
                      ? "Сначала новые"
                      : sortBy === "oldest"
                      ? "Сначала старые"
                      : sortBy === "amount_desc"
                      ? "Сумма ↓"
                      : "Сумма ↑"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy("newest")}>
                  Сначала новые
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("oldest")}>
                  Сначала старые
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("amount_desc")}>
                  Сумма по убыванию
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("amount_asc")}>
                  Сумма по возрастанию
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>

      {/* Auto-refresh toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            checked={showAutoRefresh}
            onCheckedChange={setShowAutoRefresh}
            id="auto-refresh"
          />
          <Label htmlFor="auto-refresh" className="text-sm">
            Автообновление (10 сек)
          </Label>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPayouts}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </Button>
      </div>

      {/* Payouts List */}
      <div className="space-y-3">
        {filteredPayouts.length === 0 ? (
          <Card className="p-12 text-center">
            <Send className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Выплаты не найдены</p>
          </Card>
        ) : (
          filteredPayouts.map((payout) => {
            const getStatusIcon = () => {
              switch (payout.status) {
                case "CREATED":
                case "PENDING":
                case "PROCESSING":
                  return (
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-blue-600" />
                    </div>
                  )
                case "COMPLETED":
                  return (
                    <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                  )
                case "FAILED":
                case "CANCELLED":
                  return (
                    <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                      <X className="h-6 w-6 text-red-600" />
                    </div>
                  )
                default:
                  return null
              }
            }

            return (
              <Card
                key={payout.id}
                className={cn(
                  "p-6 hover:shadow-lg transition-all duration-300 cursor-pointer",
                  payout.isNew && "border-[#006039] bg-[#006039]/5"
                )}
                onClick={() => setSelectedPayout(payout)}
              >
                <div className="flex items-start justify-between">
                  {/* Left Section */}
                  <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    {getStatusIcon()}

                    {/* Details */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">
                          Выплата ${payout.numericId}
                        </h3>
                        <Badge className={cn("border", statusConfig[payout.status]?.color)}>
                          {statusConfig[payout.status]?.label}
                        </Badge>
                        {payout.isNew && (
                          <Badge className="bg-[#006039] text-white">
                            Новая
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {payout.method === "card" ? (
                          <>
                            <span>{payout.cardNumber}</span>
                            <span>•</span>
                            <span>{payout.recipientName}</span>
                            <span>•</span>
                            <span>{payout.bankType}</span>
                          </>
                        ) : (
                          <span className="font-mono">{payout.walletAddress}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>
                          {format(new Date(payout.createdAt), "d MMMM yyyy 'в' HH:mm", { locale: ru })}
                        </span>
                        {payout.completedAt && (
                          <>
                            <span>•</span>
                            <span>
                              Завершено: {format(new Date(payout.completedAt), "HH:mm", { locale: ru })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Section */}
                  <div className="text-right space-y-2">
                    <div className="text-2xl font-bold">
                      {payout.amount.toFixed(2)} {payout.currency}
                    </div>
                    <div className="text-sm text-gray-500">
                      ≈ {(payout.amount * 100).toFixed(0)} RUB
                    </div>
                    {payout.commission && (
                      <div className="text-xs text-gray-500">
                        Комиссия: {payout.commission.toFixed(2)} {payout.currency}
                      </div>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          <Eye className="h-4 w-4 mr-2" />
                          Подробнее
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          <Copy className="h-4 w-4 mr-2" />
                          Копировать ID
                        </DropdownMenuItem>
                        {payout.transactionHash && (
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            <FileText className="h-4 w-4 mr-2" />
                            Хеш транзакции
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Payout Details Dialog */}
      <Dialog open={!!selectedPayout} onOpenChange={() => setSelectedPayout(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Выплата ${selectedPayout?.numericId}
            </DialogTitle>
            <DialogDescription>
              Детальная информация о выплате
            </DialogDescription>
          </DialogHeader>

          {selectedPayout && (
            <div className="space-y-6">
              {/* Status and Amount */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge className={cn("border", statusConfig[selectedPayout.status]?.color)}>
                    {statusConfig[selectedPayout.status]?.label}
                  </Badge>
                </div>
                <div className="text-2xl font-bold">
                  {selectedPayout.amount.toFixed(2)} {selectedPayout.currency}
                </div>
              </div>

              {/* Recipient Details */}
              <div className="space-y-4">
                <h4 className="font-medium">Получатель</h4>
                <div className="space-y-3">
                  {selectedPayout.method === "card" ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Номер карты</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{selectedPayout.cardNumber}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigator.clipboard.writeText(selectedPayout.cardNumber || "")
                              toast.success("Номер карты скопирован")
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Имя получателя</span>
                        <span>{selectedPayout.recipientName}</span>
                      </div>
                      {selectedPayout.bankType && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Банк</span>
                          <span>{selectedPayout.bankType}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Адрес кошелька</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{selectedPayout.walletAddress}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigator.clipboard.writeText(selectedPayout.walletAddress || "")
                            toast.success("Адрес кошелька скопирован")
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Details */}
              <div className="space-y-4">
                <h4 className="font-medium">Финансовая информация</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Сумма</span>
                    <span className="font-medium">{selectedPayout.amount.toFixed(2)} {selectedPayout.currency}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Сумма в рублях</span>
                    <span>{(selectedPayout.amount * 100).toFixed(2)} RUB</span>
                  </div>
                  {selectedPayout.commission && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Комиссия</span>
                      <span>{selectedPayout.commission.toFixed(2)} {selectedPayout.currency}</span>
                    </div>
                  )}
                  {selectedPayout.transactionHash && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Хеш транзакции</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{selectedPayout.transactionHash}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigator.clipboard.writeText(selectedPayout.transactionHash || "")
                            toast.success("Хеш транзакции скопирован")
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}