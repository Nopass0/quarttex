"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  AlertCircle,
  Clock,
  FileText,
  Loader2,
  MessageSquare,
  Search,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react"

interface Dispute {
  id: string
  transactionId: string
  status: string
  subject: string
  description?: string
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  transaction: {
    id: string
    numericId: number
    orderId: string
    amount: number
    status: string
    createdAt: string
  }
  _count: {
    messages: number
  }
}

interface DisputeStatistics {
  totalDisputes: number
  openDisputes: number
  inProgressDisputes: number
  resolvedSuccessDisputes: number
  resolvedFailDisputes: number
  cancelledDisputes: number
  monthlyDisputes: number
  averageResolutionHours: number
  successRate: number
}

export default function AggregatorDisputes() {
  const router = useRouter()
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [statistics, setStatistics] = useState<DisputeStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [activeTab, setActiveTab] = useState("list")

  useEffect(() => {
    fetchDisputes()
    fetchStatistics()
  }, [page, statusFilter])

  const fetchDisputes = async () => {
    try {
      setLoading(true)
      const params: any = {
        page,
        limit: 20,
      }
      if (statusFilter) params.status = statusFilter
      if (searchQuery) params.search = searchQuery

      const data = await aggregatorApi.getDisputes(params)
      setDisputes(data.data)
      setTotalPages(data.pagination.totalPages)
    } catch (error) {
      console.error("Error fetching disputes:", error)
      toast.error("Ошибка загрузки споров")
    } finally {
      setLoading(false)
    }
  }

  const fetchStatistics = async () => {
    try {
      const data = await aggregatorApi.getDisputeStatistics()
      setStatistics(data)
    } catch (error) {
      console.error("Error fetching statistics:", error)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchDisputes()
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "success" | "destructive" | "warning" }> = {
      OPEN: { label: "Открыт", variant: "default" },
      IN_PROGRESS: { label: "В процессе", variant: "warning" },
      RESOLVED_SUCCESS: { label: "Решен в пользу", variant: "success" },
      RESOLVED_FAIL: { label: "Решен против", variant: "destructive" },
      CANCELLED: { label: "Отменен", variant: "default" },
    }
    const config = statusMap[status] || { label: status, variant: "default" }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const openDispute = (disputeId: string) => {
    router.push(`/aggregator/disputes/${disputeId}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Споры</h1>
        <p className="text-muted-foreground">
          Управление спорами по транзакциям
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">Список споров</TabsTrigger>
          <TabsTrigger value="statistics">Статистика</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Поиск по ID транзакции или описанию..."
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
                    <SelectItem value="OPEN">Открытые</SelectItem>
                    <SelectItem value="IN_PROGRESS">В процессе</SelectItem>
                    <SelectItem value="RESOLVED_SUCCESS">Решены в пользу</SelectItem>
                    <SelectItem value="RESOLVED_FAIL">Решены против</SelectItem>
                    <SelectItem value="CANCELLED">Отменены</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleSearch}>
                  <Search className="mr-2 h-4 w-4" />
                  Поиск
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Disputes Table */}
          <Card>
            <CardHeader>
              <CardTitle>Список споров</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : disputes.length > 0 ? (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID транзакции</TableHead>
                        <TableHead>Сумма</TableHead>
                        <TableHead>Тема</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Сообщения</TableHead>
                        <TableHead>Дата создания</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {disputes.map((dispute) => (
                        <TableRow key={dispute.id}>
                          <TableCell className="font-mono">
                            #{dispute.transaction.numericId}
                          </TableCell>
                          <TableCell>
                            {formatAmount(dispute.transaction.amount)} ₽
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {dispute.subject}
                          </TableCell>
                          <TableCell>{getStatusBadge(dispute.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4 text-muted-foreground" />
                              <span>{dispute._count.messages}</span>
                            </div>
                          </TableCell>
                          <TableCell>{formatDateTime(dispute.createdAt)}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openDispute(dispute.id)}
                            >
                              Открыть
                            </Button>
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
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>Споры не найдены</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          {statistics ? (
            <>
              {/* Stats Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Всего споров</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{statistics.totalDisputes}</div>
                    <p className="text-xs text-muted-foreground">
                      За все время
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Активные</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {statistics.openDisputes + statistics.inProgressDisputes}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Требуют внимания
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Успешность</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {statistics.successRate}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Решены в пользу
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Время решения</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {statistics.averageResolutionHours}ч
                    </div>
                    <p className="text-xs text-muted-foreground">
                      В среднем
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Stats */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Статусы споров</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-gray-500" />
                          <span className="text-sm">Открытые</span>
                        </div>
                        <span className="font-semibold">{statistics.openDisputes}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-orange-500" />
                          <span className="text-sm">В процессе</span>
                        </div>
                        <span className="font-semibold">{statistics.inProgressDisputes}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Решены в пользу</span>
                        </div>
                        <span className="font-semibold text-green-600">
                          {statistics.resolvedSuccessDisputes}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span className="text-sm">Решены против</span>
                        </div>
                        <span className="font-semibold text-red-600">
                          {statistics.resolvedFailDisputes}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-gray-400" />
                          <span className="text-sm">Отменены</span>
                        </div>
                        <span className="font-semibold">{statistics.cancelledDisputes}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Активность за месяц</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-center py-4">
                        <div className="text-4xl font-bold text-[#006039]">
                          {statistics.monthlyDisputes}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Новых споров за последние 30 дней
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div className="text-center">
                          <div className="text-2xl font-semibold text-green-600">
                            {statistics.resolvedSuccessDisputes}
                          </div>
                          <p className="text-xs text-muted-foreground">Выиграно</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-semibold text-red-600">
                            {statistics.resolvedFailDisputes}
                          </div>
                          <p className="text-xs text-muted-foreground">Проиграно</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
