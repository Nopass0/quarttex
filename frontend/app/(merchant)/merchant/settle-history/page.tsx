"use client"

import { useEffect, useState } from "react"
import { merchantApi } from "@/services/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatAmount } from "@/lib/utils"
import { format } from "date-fns"
import { toast } from "sonner"
import { Loader2, CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

type SettleRequest = {
  id: string
  amount: number
  amountUsdt: number
  rate: number
  status: "PENDING" | "COMPLETED" | "CANCELLED"
  createdAt: string
  processedAt: string | null
  cancelReason: string | null
}

export default function MerchantSettleHistoryPage() {
  const [history, setHistory] = useState<SettleRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  })

  useEffect(() => {
    fetchHistory()
  }, [pagination.page])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const response = await merchantApi.getSettleRequests({
        page: pagination.page,
        limit: pagination.limit,
      })
      setHistory(response.data)
      setPagination(response.pagination)
    } catch (error) {
      console.error("Failed to fetch settle history:", error)
      toast.error("Не удалось загрузить историю")
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Ожидание</Badge>
      case "COMPLETED":
        return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />Завершен</Badge>
      case "CANCELLED":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Отменен</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Подсчет статистики
  const totalWithdrawn = history
    .filter(h => h.status === "COMPLETED")
    .reduce((sum, h) => sum + h.amount, 0)
  
  const totalWithdrawnUsdt = history
    .filter(h => h.status === "COMPLETED")
    .reduce((sum, h) => sum + (h.amountUsdt || 0), 0)
  
  const pendingCount = history.filter(h => h.status === "PENDING").length
  const completedCount = history.filter(h => h.status === "COMPLETED").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">История Settle</h1>
        <p className="text-muted-foreground">
          Все ваши запросы на вывод средств
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Всего запросов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">В ожидании</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Выведено RUB</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatAmount(totalWithdrawn)} ₽
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Выведено USDT</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalWithdrawnUsdt.toFixed(2)} USDT
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>История запросов</CardTitle>
          <CardDescription>
            Все запросы на вывод средств с их статусами
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              У вас пока нет запросов на вывод средств
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата запроса</TableHead>
                    <TableHead>Сумма RUB</TableHead>
                    <TableHead>Сумма USDT</TableHead>
                    <TableHead>Курс</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Обработан</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        {format(new Date(request.createdAt), "dd.MM.yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatAmount(request.amount)} ₽
                      </TableCell>
                      <TableCell className="font-medium text-green-600">
                        {(request.amountUsdt || 0).toFixed(2)} USDT
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-muted-foreground" />
                          {(request.rate || 0).toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        {request.processedAt
                          ? format(new Date(request.processedAt), "dd.MM.yyyy HH:mm")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pagination.pages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            if (pagination.page > 1) {
                              setPagination(prev => ({ ...prev, page: prev.page - 1 }))
                            }
                          }}
                          className={pagination.page === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                      {[...Array(pagination.pages)].map((_, idx) => {
                        const page = idx + 1
                        if (
                          page === 1 ||
                          page === pagination.pages ||
                          (page >= pagination.page - 1 && page <= pagination.page + 1)
                        ) {
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault()
                                  setPagination(prev => ({ ...prev, page }))
                                }}
                                isActive={page === pagination.page}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          )
                        } else if (
                          page === pagination.page - 2 ||
                          page === pagination.page + 2
                        ) {
                          return <PaginationEllipsis key={page} />
                        }
                        return null
                      })}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            if (pagination.page < pagination.pages) {
                              setPagination(prev => ({ ...prev, page: prev.page + 1 }))
                            }
                          }}
                          className={pagination.page === pagination.pages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}