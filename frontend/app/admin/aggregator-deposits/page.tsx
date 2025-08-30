"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AuthLayout } from "@/components/layouts/auth-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { adminApi } from "@/services/api";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  Wallet,
  ExternalLink,
} from "lucide-react";

interface AggregatorDepositRequest {
  id: string;
  aggregatorId: string;
  amountUSDT: number;
  address: string;
  status: string;
  txHash: string | null;
  confirmations: number;
  createdAt: string;
  confirmedAt: string | null;
  processedAt: string | null;
  aggregator: {
    id: string;
    email: string;
    name: string;
    balanceUsdt: number;
  };
}

export default function AggregatorDepositsPage() {
  const [deposits, setDeposits] = useState<AggregatorDepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeposit, setSelectedDeposit] =
    useState<AggregatorDepositRequest | null>(null);
  const [actionType, setActionType] = useState<"confirm" | "reject" | null>(
    null
  );
  const [actionLoading, setActionLoading] = useState(false);
  const [txHashInput, setTxHashInput] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchDeposits();
  }, [statusFilter]);

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      const params = statusFilter !== "all" ? { status: statusFilter } : {};
      const response = await adminApi.getAggregatorDepositRequests(params);
      setDeposits(response.deposits);
    } catch (error) {
      console.error("Error fetching aggregator deposits:", error);
      toast.error("Ошибка загрузки заявок");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedDeposit) return;

    setActionLoading(true);
    try {
      await adminApi.confirmAggregatorDeposit(selectedDeposit.id, txHashInput);
      toast.success("Заявка подтверждена, баланс агрегатора увеличен");

      setSelectedDeposit(null);
      setActionType(null);
      setTxHashInput("");
      fetchDeposits();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Ошибка подтверждения");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDeposit || !rejectReason) return;

    setActionLoading(true);
    try {
      await adminApi.rejectAggregatorDeposit(selectedDeposit.id, rejectReason);
      toast.success("Заявка отклонена");

      setSelectedDeposit(null);
      setActionType(null);
      setRejectReason("");
      fetchDeposits();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Ошибка отклонения");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            Ожидание
          </Badge>
        );
      case "CHECKING":
        return (
          <Badge variant="secondary">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Проверка
          </Badge>
        );
      case "CONFIRMED":
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Подтверждено
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Отклонено
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge variant="secondary">
            <XCircle className="mr-1 h-3 w-3" />
            Истекло
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <ProtectedRoute>
      <AuthLayout variant="admin">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Wallet className="h-8 w-8 text-blue-600" />
                Пополнения агрегаторов
              </h1>
              <p className="text-muted-foreground">
                Управление заявками на пополнение баланса агрегаторов
              </p>
            </div>
            <Button onClick={fetchDeposits} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Обновить
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Фильтры</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Статус</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все</SelectItem>
                      <SelectItem value="PENDING">Ожидание</SelectItem>
                      <SelectItem value="CHECKING">Проверка</SelectItem>
                      <SelectItem value="CONFIRMED">Подтверждено</SelectItem>
                      <SelectItem value="FAILED">Отклонено</SelectItem>
                      <SelectItem value="EXPIRED">Истекло</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Заявки на пополнение</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Загрузка...</span>
                </div>
              ) : deposits.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Заявки не найдены</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Агрегатор</TableHead>
                      <TableHead>Сумма</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Хеш транзакции</TableHead>
                      <TableHead>Дата создания</TableHead>
                      <TableHead>Баланс агрегатора</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deposits.map((deposit) => (
                      <TableRow key={deposit.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {deposit.aggregator.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {deposit.aggregator.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(deposit.amountUSDT)} USDT
                        </TableCell>
                        <TableCell>{getStatusBadge(deposit.status)}</TableCell>
                        <TableCell>
                          {deposit.txHash ? (
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {deposit.txHash.slice(0, 10)}...
                                {deposit.txHash.slice(-10)}
                              </code>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  window.open(
                                    `https://tronscan.org/#/transaction/${deposit.txHash}`,
                                    "_blank"
                                  )
                                }
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(
                            new Date(deposit.createdAt),
                            "dd.MM.yyyy HH:mm",
                            { locale: ru }
                          )}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(deposit.aggregator.balanceUsdt)} USDT
                        </TableCell>
                        <TableCell>
                          {deposit.status === "PENDING" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                  setSelectedDeposit(deposit);
                                  setActionType("confirm");
                                  setTxHashInput(deposit.txHash || "");
                                }}
                              >
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Подтвердить
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedDeposit(deposit);
                                  setActionType("reject");
                                }}
                              >
                                <XCircle className="mr-1 h-3 w-3" />
                                Отклонить
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Confirm Dialog */}
          <Dialog
            open={actionType === "confirm" && !!selectedDeposit}
            onOpenChange={() => {
              setSelectedDeposit(null);
              setActionType(null);
              setTxHashInput("");
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Подтверждение пополнения</DialogTitle>
                <DialogDescription>
                  Подтвердите пополнение баланса агрегатора{" "}
                  {selectedDeposit?.aggregator.name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <p>
                    <strong>Сумма:</strong>{" "}
                    {selectedDeposit &&
                      formatCurrency(selectedDeposit.amountUSDT)}{" "}
                    USDT
                  </p>
                  <p>
                    <strong>Агрегатор:</strong>{" "}
                    {selectedDeposit?.aggregator.email}
                  </p>
                  <p>
                    <strong>Текущий баланс:</strong>{" "}
                    {selectedDeposit &&
                      formatCurrency(
                        selectedDeposit.aggregator.balanceUsdt
                      )}{" "}
                    USDT
                  </p>
                  <p>
                    <strong>Баланс после пополнения:</strong>{" "}
                    {selectedDeposit &&
                      formatCurrency(
                        selectedDeposit.aggregator.balanceUsdt +
                          selectedDeposit.amountUSDT
                      )}{" "}
                    USDT
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="txHash">Хеш транзакции (опционально)</Label>
                  <Input
                    id="txHash"
                    placeholder="Введите или обновите хеш транзакции"
                    value={txHashInput}
                    onChange={(e) => setTxHashInput(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedDeposit(null);
                    setActionType(null);
                    setTxHashInput("");
                  }}
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {actionLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Подтвердить пополнение
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Reject Dialog */}
          <Dialog
            open={actionType === "reject" && !!selectedDeposit}
            onOpenChange={() => {
              setSelectedDeposit(null);
              setActionType(null);
              setRejectReason("");
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Отклонение пополнения</DialogTitle>
                <DialogDescription>
                  Отклоните заявку на пополнение агрегатора{" "}
                  {selectedDeposit?.aggregator.name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <p>
                    <strong>Сумма:</strong>{" "}
                    {selectedDeposit &&
                      formatCurrency(selectedDeposit.amountUSDT)}{" "}
                    USDT
                  </p>
                  <p>
                    <strong>Агрегатор:</strong>{" "}
                    {selectedDeposit?.aggregator.email}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Причина отклонения</Label>
                  <Input
                    id="reason"
                    placeholder="Укажите причину отклонения"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedDeposit(null);
                    setActionType(null);
                    setRejectReason("");
                  }}
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={actionLoading || !rejectReason}
                  variant="destructive"
                >
                  {actionLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4" />
                  )}
                  Отклонить заявку
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </AuthLayout>
    </ProtectedRoute>
  );
}
