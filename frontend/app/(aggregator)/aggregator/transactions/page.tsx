"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { aggregatorApi } from "@/services/api"
import { formatAmount, formatDateTime } from "@/lib/utils"
import {
  CreditCard,
  Loader2,
  Search,
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react"

interface Transaction {
  id: string
  numericId: number
  amount: number
  status: string
  orderId: string
  methodId: string
  currency: string
  createdAt: string
  acceptedAt?: string
  expired_at: string
  merchant: {
    name: string
  }
  method: {
    name: string
    type: string
  }
}

export default function AggregatorTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [statistics, setStatistics] = useState<any>(null)

  useEffect(() => {
    fetchTransactions()
    fetchStatistics()
  }, [page, statusFilter])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const params: any = {
        page,
        limit: 20,
      }
      if (statusFilter) params.status = statusFilter
      if (searchQuery) params.search = searchQuery

      const data = await aggregatorApi.getTransactions(params)
      setTransactions(data.data || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (error) {
      console.error("Error fetching transactions:", error)
      toast.error("Ошибка загрузки транзакций")
    } finally {
      setLoading(false)
    }
  }

  const fetchStatistics = async () => {
    try {
      const data = await aggregatorApi.getStatistics()
      setStatistics(data)
    } catch (error) {
      console.error("Error fetching statistics:", error)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchTransactions()
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "success" | "destructive" | "warning" }> = {
      CREATED: { label: "Создана", variant: "default" },
      IN_PROGRESS: { label: "В процессе", variant: "warning" },
      READY: { label: "Завершена", variant: "success" },
      CANCELED: { label: "Отменена", variant: "destructive" },
      EXPIRED: { label: "Истекла", variant: "destructive" },
      DISPUTE: { label: "Спор", variant: "destructive" },
      MILK: { label: "Milk", variant: "warning" },
    }
    const config = statusMap[status] || { label: status, variant: "default" }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getMethodTypeBadge = (type: string) => {
    const typeMap: Record<string, string> = {
      sbp: "СБП",
      c2c: "C2C",
      upi: "UPI",
      crypto: "Крипто",
    }
    return <Badge variant="outline">{typeMap[type] || type}</Badge>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <CreditCard className="h-8 w-8 text-[#006039]" />
          Транзакции
        </h1>
        <p className="text-muted-foreground">
          Управление транзакциями агрегатора
        </p>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего транзакций</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalTransactions || 0}</div>
              <p className="text-xs text-muted-foreground">
                За все время
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Успешных</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statistics.successfulTransactions || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {statistics.successRate || 0}% успешность
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">В процессе</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {statistics.inProgressTransactions || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Ожидают завершения
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Общий объем</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatAmount(statistics.totalVolume || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                В рублях
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Поиск по ID транзакции или order ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="CREATED">Создана</SelectItem>
                <SelectItem value="IN_PROGRESS">В процессе</SelectItem>
                <SelectItem value="READY">Завершена</SelectItem>
                <SelectItem value="CANCELED">Отменена</SelectItem>
                <SelectItem value="EXPIRED">Истекла</SelectItem>
                <SelectItem value="DISPUTE">Спор</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch}>
              <Search className="mr-2 h-4 w-4" />
              Поиск
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список транзакций</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : transactions.length > 0 ? (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Мерчант</TableHead>
                    <TableHead>Метод</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Дата создания</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono">#{tx.numericId}</TableCell>
                      <TableCell className="font-mono text-xs">{tx.orderId}</TableCell>
                      <TableCell>{tx.merchant?.name || "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm">{tx.method?.name || "—"}</span>
                          {tx.method?.type && getMethodTypeBadge(tx.method.type)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">
                          {formatAmount(tx.amount)} ₽
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDateTime(tx.createdAt)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Назад
                  </Button>
                  <span className="text-sm">
                    Страница {page} из {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Вперед
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>Транзакции не найдены</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
