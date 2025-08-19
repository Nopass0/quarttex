"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  UrlDialog,
  UrlDialogContent,
  UrlDialogDescription,
  UrlDialogFooter,
  UrlDialogHeader,
  UrlDialogTitle
} from "@/components/ui/url-dialog"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { traderApi } from "@/services/api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { 
  Loader2,
  ChevronDown,
  Search,
  Filter,
  Download,
  Calendar,
  MoreVertical,
  Eye,
  Plus,
  Wallet as WalletIcon
} from "lucide-react"
import { cn } from "@/lib/utils"
import { TraderHeader } from "@/components/trader/trader-header"
import { useUrlModal } from "@/hooks/use-url-modal"

interface Transaction {
  id: string
  numericId: number
  amount: number
  currency: string
  type: string
  status: string
  createdAt: string
  updatedAt: string
  merchant: {
    name: string
  }
  method: {
    name: string
  }
}

interface TrcWallet {
  id: string
  name: string
  address: string
}

export function FinancesList() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const withdrawModal = useUrlModal({
    modalName: "withdraw",
    onClose: () => {
      // Reset form state when closing
      setWithdrawAmount("")
      setSelectedWallet("")
      setIsAddingNewWallet(false)
      setNewWalletName("")
      setNewWalletAddress("")
    }
  })
  const [financeStats, setFinanceStats] = useState({
    availableBalance: 0,
    todayEarnings: 0,
    totalProfit: 0,
    currency: 'USDT'
  })
  
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
    "USDT TRC20": "https://cdn.brandfetch.io/tether.to/logo/theme/dark/h/64/w/64"
  }
  const [trcWallets, setTrcWallets] = useState<TrcWallet[]>([
    { id: "1", name: "Основной кошелек", address: "TNbPSFJJnTBKGHRBN6q6tJ5MG8dJxtPv8U" },
    { id: "2", name: "Резервный", address: "TYsPAWDFw9XbQEMtKdJxL5Wq9Vuz3bKW9X" }
  ])
  const [selectedWallet, setSelectedWallet] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [newWalletName, setNewWalletName] = useState("")
  const [newWalletAddress, setNewWalletAddress] = useState("")
  const [isAddingNewWallet, setIsAddingNewWallet] = useState(false)
  
  const router = useRouter()
  
  useEffect(() => {
    fetchTransactions()
    fetchTraderProfile()
    fetchFinanceStats()
  }, [])
  
  const fetchTransactions = async () => {
    try {
      const response = await traderApi.getTransactions()
      const txData = response.data || response.transactions || []
      setTransactions(txData)
    } catch (error) {
      console.error("Failed to fetch transactions:", error)
    } finally {
      setLoading(false)
    }
  }
  
  const fetchTraderProfile = async () => {
    try {
      const response = await traderApi.getProfile()
    } catch (error) {
      console.error("Failed to fetch profile:", error)
    }
  }
  
  const fetchFinanceStats = async () => {
    try {
      const stats = await traderApi.getFinanceStats()
      setFinanceStats(stats)
    } catch (error) {
      console.error("Failed to fetch finance stats:", error)
    }
  }
  
  
  const handleWithdraw = () => {
    if (!selectedWallet || !withdrawAmount) {
      toast.error("Заполните все поля")
      return
    }
    
    const amount = parseFloat(withdrawAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Введите корректную сумму")
      return
    }
    
    if (amount > financeStats.availableBalance) { // Check against balance
      toast.error("Недостаточно средств")
      return
    }
    
    toast.success(`Заявка на вывод ${amount} USDT создана`)
    withdrawModal.close()
  }
  
  const handleAddWallet = () => {
    if (!newWalletName || !newWalletAddress) {
      toast.error("Заполните название и адрес кошелька")
      return
    }
    
    const newWallet: TrcWallet = {
      id: Date.now().toString(),
      name: newWalletName,
      address: newWalletAddress
    }
    
    setTrcWallets([...trcWallets, newWallet])
    setSelectedWallet(newWallet.id)
    setIsAddingNewWallet(false)
    setNewWalletName("")
    setNewWalletAddress("")
    toast.success("Кошелек добавлен")
  }
  
  const getStatusBadge = (status: string) => {
    const statusConfig: any = {
      CREATED: { label: "Создана", color: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" },
      IN_PROGRESS: { label: "В процессе", color: "bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800" },
      READY: { label: "Готово", color: "bg-[#006039]/10 text-[#006039] border-[#006039]/20 dark:bg-[#2d6a42]/20 dark:text-[#2d6a42] dark:border-[#2d6a42]/30" },
      EXPIRED: { label: "Истекло", color: "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" },
      DISPUTE: { label: "Спор", color: "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800" },
      CANCELED: { label: "Отменено", color: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700" },
    }
    const config = statusConfig[status] || statusConfig.CREATED
    return config
  }
  
  const getTypeBadge = (type: string) => {
    return type === "IN" ? "bg-[#006039]/10 text-[#006039] dark:bg-[#2d6a42]/20 dark:text-[#2d6a42]" : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
  }
  
  const filteredTransactions = transactions.filter(tx => {
    if (searchTerm && !tx.numericId.toString().includes(searchTerm)) {
      return false
    }
    if (statusFilter !== "all" && tx.status !== statusFilter) {
      return false
    }
    return true
  })
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#006039]" />
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-[#eeeeee]">Финансы</h1>
        
        <TraderHeader />
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 dark:bg-[#29382f] dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">БАЛАНС КОШЕЛЬКА</span>
            <Button 
              variant="link" 
              className="text-[#006039] dark:text-[#2d6a42] p-0 h-auto text-sm"
              onClick={() => withdrawModal.open()}
            >
              Вывести средства
            </Button>
          </div>
          <div className="text-2xl font-bold dark:text-[#eeeeee]">{financeStats.availableBalance.toLocaleString('ru-RU')} {financeStats.currency}</div>
        </Card>
        
        <Card className="p-6 dark:bg-[#29382f] dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">ЗАРАБОТАНО СЕГОДНЯ</span>
            <span className="text-xs text-gray-500 dark:text-gray-500">за {format(new Date(), "d MMMM", { locale: ru })}</span>
          </div>
          <div className="text-2xl font-bold dark:text-[#eeeeee]">{financeStats.todayEarnings.toLocaleString('ru-RU')} {financeStats.currency}</div>
        </Card>
        
        <Card className="p-6 dark:bg-[#29382f] dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">ПРИБЫЛЬ</span>
            <span className="text-xs text-gray-500 dark:text-gray-500">за все время</span>
          </div>
          <div className="text-2xl font-bold text-[#006039] dark:text-[#2d6a42]">+{financeStats.totalProfit.toLocaleString('ru-RU')} {financeStats.currency}</div>
        </Card>
      </div>
      
      {/* Filters */}
      <Card className="p-4 dark:bg-[#29382f] dark:border-gray-700">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#006039] dark:text-[#2d6a42] h-4 w-4" />
              <Input
                placeholder="Поиск по ID транзакции"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full dark:bg-[#0f0f0f] dark:border-gray-600 dark:text-[#eeeeee] dark:placeholder-gray-500"
              />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] dark:bg-[#0f0f0f] dark:border-gray-600 dark:text-[#eeeeee]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent className="dark:bg-[#29382f] dark:border-gray-700">
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="CREATED">Создано</SelectItem>
                <SelectItem value="IN_PROGRESS">В процессе</SelectItem>
                <SelectItem value="READY">Готово</SelectItem>
                <SelectItem value="EXPIRED">Истекло</SelectItem>
                <SelectItem value="DISPUTE">Спор</SelectItem>
                <SelectItem value="CANCELED">Отменено</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-[180px] dark:bg-[#0f0f0f] dark:border-gray-600 dark:text-[#eeeeee]">
                <Calendar className="mr-2 h-4 w-4 text-[#006039] dark:text-[#2d6a42]" />
                <SelectValue placeholder="Период" />
              </SelectTrigger>
              <SelectContent className="dark:bg-[#29382f] dark:border-gray-700">
                <SelectItem value="all">Все время</SelectItem>
                <SelectItem value="today">Сегодня</SelectItem>
                <SelectItem value="week">Эта неделя</SelectItem>
                <SelectItem value="month">Этот месяц</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" className="flex-1 sm:flex-initial dark:border-gray-600 dark:text-gray-300 dark:hover:bg-[#29382f]/50">
              <Filter className="mr-2 h-4 w-4 text-[#006039] dark:text-[#2d6a42]" />
              <span className="hidden sm:inline">Фильтры</span>
            </Button>
            
            <Button variant="outline" className="flex-1 sm:flex-initial dark:border-gray-600 dark:text-gray-300 dark:hover:bg-[#29382f]/50">
              <Download className="mr-2 h-4 w-4 text-[#006039] dark:text-[#2d6a42]" />
              <span className="hidden sm:inline">Экспорт</span>
            </Button>
          </div>
        </div>
      </Card>
      
      {/* Transactions Table */}
      <Card className="overflow-hidden dark:bg-[#29382f] dark:border-gray-700">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 dark:bg-[#0f0f0f] dark:hover:bg-[#0f0f0f]">
              <TableHead className="font-medium text-gray-600 dark:text-gray-400">ID</TableHead>
              <TableHead className="font-medium text-gray-600 dark:text-gray-400">Дата</TableHead>
              <TableHead className="font-medium text-gray-600 dark:text-gray-400">Тип</TableHead>
              <TableHead className="font-medium text-gray-600 dark:text-gray-400">Метод</TableHead>
              <TableHead className="font-medium text-gray-600 dark:text-gray-400">Сумма</TableHead>
              <TableHead className="font-medium text-gray-600 dark:text-gray-400">Статус</TableHead>
              <TableHead className="font-medium text-gray-600 dark:text-gray-400">Мерчант</TableHead>
              <TableHead className="font-medium text-gray-600 dark:text-gray-400 text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-gray-500 dark:text-gray-400">
                  Транзакции не найдены
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((transaction) => {
                const statusInfo = getStatusBadge(transaction.status)
                return (
                  <TableRow key={transaction.id} className="hover:bg-gray-50/50 dark:hover:bg-[#29382f]/30">
                    <TableCell className="font-mono text-sm dark:text-[#eeeeee]">
                      ${transaction.numericId}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                      {format(new Date(transaction.createdAt), "dd.MM.yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn("border-0 font-medium text-xs", getTypeBadge(transaction.type))}
                      >
                        {transaction.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {bankLogos[transaction.method?.name] && (
                          <img 
                            src={bankLogos[transaction.method?.name]} 
                            alt={transaction.method?.name}
                            className="h-8 w-8 rounded object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        )}
                        <span className="text-sm dark:text-[#eeeeee]">{transaction.method?.name || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-sm dark:text-[#eeeeee]">
                      {transaction.amount.toLocaleString('ru-RU')} {transaction.currency || "RUB"}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn("border font-medium text-xs", statusInfo.color)}
                      >
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm dark:text-[#eeeeee]">
                      {transaction.merchant?.name || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 dark:hover:bg-[#29382f]/50"
                          >
                            <MoreVertical className="h-4 w-4 text-[#006039] dark:text-[#2d6a42]" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 dark:bg-[#29382f] dark:border-gray-700">
                          <DropdownMenuItem className="dark:hover:bg-[#29382f]/50">
                            <Eye className="mr-2 h-4 w-4 text-[#006039] dark:text-[#2d6a42]" />
                            Подробнее
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
        
        {filteredTransactions.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
            Показано {filteredTransactions.length} из {transactions.length} записей
          </div>
        )}
      </Card>
      
      {/* Withdraw Dialog */}
      <UrlDialog modalName="withdraw">
        <UrlDialogContent className="max-w-md">
          <UrlDialogHeader>
            <UrlDialogTitle>Вывод средств</UrlDialogTitle>
            <UrlDialogDescription>
              Выберите кошелек USDT TRC20 для вывода средств
            </UrlDialogDescription>
          </UrlDialogHeader>
          <div className="space-y-4">
            {!isAddingNewWallet ? (
              <>
                <div>
                  <Label htmlFor="wallet">Кошелек для вывода</Label>
                  <Select value={selectedWallet} onValueChange={setSelectedWallet}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Выберите кошелек" />
                    </SelectTrigger>
                    <SelectContent>
                      {trcWallets.map(wallet => (
                        <SelectItem key={wallet.id} value={wallet.id}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{wallet.name}</span>
                            <span className="text-xs text-gray-500 font-mono">
                              {wallet.address.slice(0, 6)}...{wallet.address.slice(-6)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="link"
                    className="text-[#006039] p-0 h-auto text-sm mt-2"
                    onClick={() => setIsAddingNewWallet(true)}
                  >
                    <Plus className="h-3 w-3 mr-1 text-[#006039]" />
                    Добавить новый кошелек
                  </Button>
                </div>
                
                <div>
                  <Label htmlFor="amount">Сумма для вывода (USDT)</Label>
                  <div className="relative mt-1">
                    <Input
                      id="amount"
                      type="number"
                      placeholder="100"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="pr-16"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                      USDT
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Доступно: {financeStats.availableBalance.toLocaleString('ru-RU')} {financeStats.currency} • Минимум: 50 {financeStats.currency}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="newWalletName">Название кошелька</Label>
                  <Input
                    id="newWalletName"
                    placeholder="Мой кошелек"
                    value={newWalletName}
                    onChange={(e) => setNewWalletName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="newWalletAddress">Адрес USDT TRC20</Label>
                  <Input
                    id="newWalletAddress"
                    placeholder="TYsPAWDFw9XbQEMtKdJxL5Wq9Vuz3bKW9X"
                    value={newWalletAddress}
                    onChange={(e) => setNewWalletAddress(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Убедитесь, что адрес поддерживает сеть TRC20
                  </p>
                </div>
              </>
            )}
          </div>
          <UrlDialogFooter>
            {!isAddingNewWallet ? (
              <>
                <Button variant="outline" onClick={() => withdrawModal.close()}>
                  Отмена
                </Button>
                <Button 
                  onClick={handleWithdraw}
                  className="bg-[#006039] hover:bg-[#006039]/90 dark:bg-[#2d6a42] dark:hover:bg-[#2d6a42]/90"
                  disabled={!selectedWallet || !withdrawAmount}
                >
                  <WalletIcon className="mr-2 h-4 w-4" />
                  Вывести
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsAddingNewWallet(false)
                    setNewWalletName("")
                    setNewWalletAddress("")
                  }}
                >
                  Назад
                </Button>
                <Button 
                  onClick={handleAddWallet}
                  className="bg-[#006039] hover:bg-[#006039]/90 dark:bg-[#2d6a42] dark:hover:bg-[#2d6a42]/90"
                  disabled={!newWalletName || !newWalletAddress}
                >
                  Добавить кошелек
                </Button>
              </>
            )}
          </UrlDialogFooter>
        </UrlDialogContent>
      </UrlDialog>
    </div>
  )
}