"use client"

import { useEffect, useState } from "react"
import { adminApi } from "@/services/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatAmount } from "@/lib/utils"
import { format } from "date-fns"
import { toast } from "sonner"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle, XCircle, Clock, FileText, Calculator, User } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Separator } from "@/components/ui/separator"

type SettleRequest = {
  id: string
  merchantId: string
  amount: number
  amountUsdt: number
  rate: number
  status: "PENDING" | "COMPLETED" | "CANCELLED"
  createdAt: string
  processedAt: string | null
  processedBy: string | null
  cancelReason: string | null
  merchant: {
    id: string
    name: string
  }
}

export default function SettleRequestsPage() {
  const [requests, setRequests] = useState<SettleRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })
  const [selectedRequest, setSelectedRequest] = useState<SettleRequest | null>(null)
  const [requestDetails, setRequestDetails] = useState<any>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchRequests()
  }, [pagination.page])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const response = await adminApi.getSettleRequests({
        page: pagination.page,
        limit: pagination.limit,
      })
      setRequests(response.data)
      setPagination(response.pagination)
    } catch (error) {
      console.error("Failed to fetch settle requests:", error)
      toast.error("Не удалось загрузить запросы")
    } finally {
      setLoading(false)
    }
  }

  const fetchRequestDetails = async (request: SettleRequest) => {
    try {
      setDetailsLoading(true)
      setSelectedRequest(request)
      const response = await adminApi.getSettleRequest(request.id)
      setRequestDetails(response)
    } catch (error) {
      console.error("Failed to fetch request details:", error)
      toast.error("Не удалось загрузить детали запроса")
    } finally {
      setDetailsLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedRequest) return

    try {
      setActionLoading(true)
      await adminApi.approveSettleRequest(selectedRequest.id)
      toast.success("Settle запрос успешно одобрен")
      setSelectedRequest(null)
      setRequestDetails(null)
      fetchRequests()
    } catch (error) {
      console.error("Failed to approve request:", error)
      toast.error("Не удалось одобрить запрос")
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!selectedRequest || !cancelReason.trim()) {
      toast.error("Укажите причину отмены")
      return
    }

    try {
      setActionLoading(true)
      await adminApi.cancelSettleRequest(selectedRequest.id, cancelReason)
      toast.success("Settle запрос отменен")
      setShowCancelDialog(false)
      setCancelReason("")
      setSelectedRequest(null)
      setRequestDetails(null)
      fetchRequests()
    } catch (error) {
      console.error("Failed to cancel request:", error)
      toast.error("Не удалось отменить запрос")
    } finally {
      setActionLoading(false)
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Запросы Settle</h1>
        <p className="text-muted-foreground">Управление запросами на вывод средств от мерчантов</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список запросов</CardTitle>
          <CardDescription>
            Всего запросов: {pagination.total}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Мерчант</TableHead>
                <TableHead>Сумма RUB</TableHead>
                <TableHead>Сумма USDT</TableHead>
                <TableHead>Курс</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    {format(new Date(request.createdAt), "dd.MM.yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{request.merchant.name}</p>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatAmount(request.amount)} ₽
                  </TableCell>
                  <TableCell className="font-medium text-purple-600">
                    {request.amountUsdt.toFixed(2)} USDT
                  </TableCell>
                  <TableCell>{request.rate.toFixed(2)}</TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchRequestDetails(request)}
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
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedRequest && !showCancelDialog} onOpenChange={(open) => {
        if (!open) {
          setSelectedRequest(null)
          setRequestDetails(null)
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Детали запроса Settle</DialogTitle>
            <DialogDescription>
              Проверьте информацию перед одобрением или отменой запроса
            </DialogDescription>
          </DialogHeader>
          
          {detailsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : requestDetails ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Мерчант</p>
                    <p className="font-medium">{requestDetails.request.merchant.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Дата запроса</p>
                    <p className="font-medium">
                      {format(new Date(requestDetails.request.createdAt), "dd.MM.yyyy HH:mm")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Курс на момент запроса</p>
                    <p className="font-medium">{requestDetails.request.rate.toFixed(2)} ₽/USDT</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Баланс на момент запроса</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatAmount(requestDetails.request.amount)} ₽
                    </p>
                    <p className="text-lg font-medium text-purple-600">
                      {requestDetails.request.amountUsdt.toFixed(2)} USDT
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Текущий баланс</p>
                    <p className="text-xl font-medium">
                      {formatAmount(requestDetails.currentBalance)} ₽
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Статус</p>
                    <div className="mt-1">{getStatusBadge(requestDetails.request.status)}</div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Формула расчета баланса
                </h4>
                <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Сумма успешных сделок:</span>
                    <span className="font-medium text-purple-600">
                      +{formatAmount(requestDetails.balanceFormula.dealsTotal)} ₽
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Комиссия со сделок:</span>
                    <span className="font-medium text-red-600">
                      -{formatAmount(requestDetails.balanceFormula.dealsCommission)} ₽
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Сумма выплат:</span>
                    <span className="font-medium text-red-600">
                      -{formatAmount(requestDetails.balanceFormula.payoutsTotal)} ₽
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Комиссия с выплат:</span>
                    <span className="font-medium text-red-600">
                      -{formatAmount(requestDetails.balanceFormula.payoutsCommission)} ₽
                    </span>
                  </div>
                  {requestDetails.balanceFormula.settledAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Уже выведено через Settle:</span>
                      <span className="font-medium text-red-600">
                        -{formatAmount(requestDetails.balanceFormula.settledAmount)} ₽
                      </span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between font-medium">
                    <span>Итого:</span>
                    <span className="text-purple-600">
                      {formatAmount(requestDetails.currentBalance)} ₽
                    </span>
                  </div>
                  {requestDetails.balanceFormula.rateCalculation && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Расчет курса: {requestDetails.balanceFormula.rateCalculation === 'RAPIRA' ? 'по курсу Rapira' : 'по курсам мерчанта'}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <Button 
                  variant="link"
                  size="sm"
                  onClick={() => router.push(`/admin/merchants/${requestDetails.request.merchantId}`)}
                  className="gap-1"
                >
                  <User className="h-3 w-3" />
                  Перейти к мерчанту
                </Button>
                <Button 
                  variant="link"
                  size="sm"
                  onClick={() => router.push(`/admin/merchants/${requestDetails.request.merchantId}/settle-history`)}
                  className="gap-1"
                >
                  <FileText className="h-3 w-3" />
                  История Settle
                </Button>
              </div>
            </div>
          ) : null}

          {requestDetails && requestDetails.request.status === "PENDING" && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(true)}
                disabled={actionLoading}
              >
                Отменить
              </Button>
              <Button
                onClick={handleApprove}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Обработка...
                  </>
                ) : (
                  "Совершить Settle"
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отмена запроса Settle</DialogTitle>
            <DialogDescription>
              Укажите причину отмены запроса на вывод средств
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Причина отмены</Label>
              <Textarea
                id="reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Укажите причину отмены..."
                className="mt-1"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false)
                setCancelReason("")
              }}
              disabled={actionLoading}
            >
              Назад
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={actionLoading || !cancelReason.trim()}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Отмена...
                </>
              ) : (
                "Отменить запрос"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}