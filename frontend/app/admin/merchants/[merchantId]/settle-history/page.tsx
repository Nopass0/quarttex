"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { adminApi } from "@/services/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatAmount } from "@/lib/utils"
import { format } from "date-fns"
import { toast } from "sonner"
import { Loader2, CheckCircle, XCircle, Clock, ArrowLeft, FileText } from "lucide-react"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

type SettleHistory = {
  id: string
  merchantId: string
  amount: number
  rate: number
  status: "PENDING" | "COMPLETED" | "CANCELLED"
  createdAt: string
  processedAt: string | null
  processedBy: string | null
  cancelReason: string | null
}

type MerchantInfo = {
  id: string
  name: string
  contactEmail: string
}

export default function MerchantSettleHistoryPage() {
  const params = useParams()
  const router = useRouter()
  const merchantId = params.merchantId as string
  
  const [history, setHistory] = useState<SettleHistory[]>([])
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<SettleHistory | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })

  useEffect(() => {
    fetchMerchantInfo()
    fetchHistory()
  }, [merchantId, pagination.page])

  const fetchMerchantInfo = async () => {
    try {
      const response = await adminApi.getMerchants()
      const merchant = response.find((m: any) => m.id === merchantId)
      if (merchant) {
        setMerchant({
          id: merchant.id,
          name: merchant.name,
          contactEmail: merchant.contactEmail,
        })
      }
    } catch (error) {
      console.error("Failed to fetch merchant info:", error)
    }
  }

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const response = await adminApi.getMerchantSettleHistory(merchantId, {
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

  const calculateUSDT = (amountRUB: number, rate: number) => {
    return rate > 0 ? (amountRUB / rate).toFixed(2) : "0.00"
  }

  if (loading && !merchant) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/merchants")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">История Settle</h1>
          {merchant && (
            <p className="text-muted-foreground">
              {merchant.name} • {merchant.contactEmail}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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
            <CardTitle className="text-sm font-medium">Завершенные</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {history.filter(h => h.status === "COMPLETED").length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Общая сумма выведено</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAmount(
                history
                  .filter(h => h.status === "COMPLETED")
                  .reduce((sum, h) => sum + h.amount, 0)
              )} ₽
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>История запросов</CardTitle>
              <CardDescription>
                Все запросы на вывод средств от мерчанта
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push("/admin/settle-requests")}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Все запросы
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Нет истории запросов
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата запроса</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>USDT</TableHead>
                    <TableHead>Курс</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Обработан</TableHead>
                    <TableHead>Действия</TableHead>
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
                        {calculateUSDT(request.amount, request.rate)} USDT
                      </TableCell>
                      <TableCell>{request.rate.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        {request.processedAt
                          ? format(new Date(request.processedAt), "dd.MM.yyyy HH:mm")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRequest(request)}
                        >
                          Подробнее
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pagination.totalPages > 1 && (
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
                      {[...Array(pagination.totalPages)].map((_, idx) => {
                        const page = idx + 1
                        if (
                          page === 1 ||
                          page === pagination.totalPages ||
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
                            if (pagination.page < pagination.totalPages) {
                              setPagination(prev => ({ ...prev, page: prev.page + 1 }))
                            }
                          }}
                          className={pagination.page === pagination.totalPages ? "pointer-events-none opacity-50" : ""}
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

      {/* Details Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => {
        if (!open) setSelectedRequest(null)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Детали запроса</DialogTitle>
            <DialogDescription>
              Информация о запросе на вывод средств
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">ID запроса</p>
                  <p className="font-mono text-sm">{selectedRequest.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Статус</p>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Дата создания</p>
                  <p className="font-medium">
                    {format(new Date(selectedRequest.createdAt), "dd.MM.yyyy HH:mm")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Дата обработки</p>
                  <p className="font-medium">
                    {selectedRequest.processedAt
                      ? format(new Date(selectedRequest.processedAt), "dd.MM.yyyy HH:mm")
                      : "-"}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Сумма в рублях</p>
                  <p className="text-2xl font-bold">{formatAmount(selectedRequest.amount)} ₽</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Курс на момент запроса</p>
                  <p className="font-medium">{selectedRequest.rate.toFixed(2)} ₽/USDT</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Эквивалент в USDT</p>
                  <p className="text-xl font-bold text-green-600">
                    {calculateUSDT(selectedRequest.amount, selectedRequest.rate)} USDT
                  </p>
                </div>
              </div>

              {selectedRequest.cancelReason && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Причина отмены</p>
                    <p className="text-sm mt-1">{selectedRequest.cancelReason}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}