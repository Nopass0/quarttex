"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { merchantApi } from "@/services/api";
import { formatAmount } from "@/lib/utils";
import {
  TrendingUp,
  Receipt,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Calculator,
  Info,
  Activity,
  Percent,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRapiraRate } from "@/hooks/use-rapira-rate";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMerchantAuth } from "@/stores/merchant-auth";

// Функция для обрезания числа до N знаков после запятой без округления
function truncateDecimals(value: number, decimals: number): string {
  const factor = Math.pow(10, decimals);
  return (Math.floor(value * factor) / factor).toFixed(decimals);
}

export default function MerchantDashboardPage() {
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [settleLoading, setSettleLoading] = useState(false);
  const [merchantProfile, setMerchantProfile] = useState<any>(null);
  const [settlementAddress, setSettlementAddress] = useState("");
  const [settleAmount, setSettleAmount] = useState("");
  const { baseRate: currentRate, refetch: refetchRate } = useRapiraRate();
  const { rights } = useMerchantAuth();

  useEffect(() => {
    fetchStatistics(selectedPeriod);
    fetchMerchantProfile();
  }, [selectedPeriod]);

  const fetchStatistics = async (period = "all") => {
    try {
      const response = await merchantApi.getStatistics(period);
      setStatistics(response);
    } catch (error) {
      console.error("Failed to fetch statistics:", error);
      toast.error("Не удалось загрузить статистику");
    } finally {
      setLoading(false);
    }
  };

  const fetchMerchantProfile = async () => {
    try {
      const response = await merchantApi.getMe();
      setMerchantProfile(response.merchant);
    } catch (error) {
      console.error("Failed to fetch merchant profile:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Не удалось загрузить данные</p>
      </div>
    );
  }

  const handleSettleRequest = async () => {
    setSettleLoading(true);
    try {
      const amount = Number(settleAmount);

      if (!amount || amount <= 0 || amount > statistics.balance.total) {
        toast.error("Некорректная сумма вывода");
        setSettleLoading(false);
        return;
      }

      let amountUsdt: number | undefined;
      if (
        merchantProfile &&
        !merchantProfile.countInRubEquivalent &&
        statistics.balance.totalUsdt !== undefined &&
        statistics.balance.total > 0
      ) {
        amountUsdt = Number(
          truncateDecimals(
            (statistics.balance.totalUsdt * amount) / statistics.balance.total,
            2
          )
        );
      } else if (currentRate) {
        amountUsdt = Number(truncateDecimals(amount / currentRate, 2));
      }

      await merchantApi.createSettleRequest({
        amount,
        amountUsdt,
        rate: currentRate || 0,
        settlementAddress,
      });
      toast.success("Запрос на Settle успешно создан");
      setSettlementAddress("");
      setSettleAmount("");
      setSettleDialogOpen(false);
      // Обновляем статистику
      fetchStatistics(selectedPeriod);
    } catch (error: any) {
      console.error("Failed to create settle request:", error);
      toast.error(error.response?.data?.error || "Не удалось создать запрос");
    } finally {
      setSettleLoading(false);
    }
  };

  const handleOpenSettleDialog = async () => {
    await refetchRate();
    setSettleAmount(String(statistics.balance.total));
    setSettleDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        variant: "default" | "secondary" | "destructive" | "outline";
      }
    > = {
      READY: { label: "Успешно", variant: "default" },
      COMPLETED: { label: "Завершено", variant: "default" },
      PENDING: { label: "Ожидание", variant: "secondary" },
      WAITING: { label: "Ожидание", variant: "secondary" },
      ACCEPTED: { label: "Принято", variant: "secondary" },
      ASSIGNED: { label: "Назначено", variant: "secondary" },
      CANCELED: { label: "Отменено", variant: "destructive" },
      EXPIRED: { label: "Истекло", variant: "destructive" },
      FAILED: { label: "Неудачно", variant: "destructive" },
      CANCELLED: { label: "Отменено", variant: "destructive" },
      DISPUTE: { label: "Спор", variant: "outline" },
    };

    const config = statusMap[status] || { label: status, variant: "secondary" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const amountNumber = Number(settleAmount);
  let previewUsdt: string | null = null;
  if (amountNumber > 0) {
    if (
      merchantProfile &&
      !merchantProfile.countInRubEquivalent &&
      statistics.balance.totalUsdt !== undefined &&
      statistics.balance.total > 0
    ) {
      previewUsdt = truncateDecimals(
        (statistics.balance.totalUsdt * amountNumber) / statistics.balance.total,
        2
      );
    } else if (currentRate) {
      previewUsdt = truncateDecimals(amountNumber / currentRate, 2);
    }
  }

  return (
    <div className="space-y-6">
      {/* Фильтр периода */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Панель управления</h1>
        <div className="flex items-center gap-4">
          {rights?.can_settle !== false && (
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleOpenSettleDialog}
            >
              <Wallet className="h-4 w-4" />
              Запросить Settle
            </Button>
          )}

          <Dialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Запрос на вывод средств (Settle)</DialogTitle>
              <DialogDescription>
                Укажите сумму, которую хотите вывести. По умолчанию будет
                выведен весь доступный баланс.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  {merchantProfile &&
                  !merchantProfile.countInRubEquivalent &&
                  statistics.balance.totalUsdt !== undefined ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Баланс к выводу:
                      </p>
                      <p className="text-2xl font-bold">
                        {truncateDecimals(statistics.balance.totalUsdt, 2)} USDT
                      </p>
                      <p className="text-lg text-gray-600">
                        {formatAmount(statistics.balance.total)} ₽
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Баланс к выводу:
                      </p>
                      <p className="text-2xl font-bold">
                        {formatAmount(statistics.balance.total)} ₽
                      </p>
                    </>
                  )}
                </div>

                {currentRate && (
                  <div className="p-4 border rounded-lg space-y-2">
                    {merchantProfile?.countInRubEquivalent ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            Курс Rapira (без ККК):
                          </span>
                          <span className="font-medium">
                            {currentRate.toFixed(2)} ₽/USDT
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            Эквивалент в USDT:
                          </span>
                          <span className="text-xl font-bold text-green-600">
                            {truncateDecimals(
                              statistics.balance.total / currentRate,
                              2,
                            )}{" "}
                            USDT
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-3 bg-blue-50 rounded-md">
                          <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium text-blue-900">
                                Расчет по переданным курсам
                              </p>
                              <p className="text-blue-700 mt-1">
                                USDT баланс будет рассчитан на основе курсов,
                                переданных при создании каждой транзакции
                              </p>
                            </div>
                          </div>
                        </div>
                        {statistics.balance.totalUsdt !== undefined && (
                          <div className="flex justify-between items-center mt-3">
                            <span className="text-sm text-muted-foreground">
                              Баланс в USDT:
                            </span>
                            <span className="text-xl font-bold text-green-600">
                              {truncateDecimals(
                                statistics.balance.totalUsdt,
                                2,
                              )}{" "}
                              USDT
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Сумма вывода (₽)
                  </p>
                  <Input
                    type="number"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    max={statistics.balance.total}
                  />
                  {previewUsdt && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Эквивалент: {previewUsdt} USDT
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    TRC-20 кошелек
                  </p>
                  <Input
                    placeholder="Введите адрес кошелька"
                    value={settlementAddress}
                    onChange={(e) => setSettlementAddress(e.target.value)}
                  />
                </div>

                <p className="text-sm text-muted-foreground">
                  После отправки запроса администратор рассмотрит его и выполнит
                  вывод средств. Курс и сумма будут зафиксированы на момент
                  создания запроса.
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSettleDialogOpen(false)}
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleSettleRequest}
                  disabled={
                    settleLoading ||
                    Number(settleAmount) <= 0 ||
                    Number(settleAmount) > statistics.balance.total
                  }
                >
                  {settleLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Отправка...
                    </>
                  ) : (
                    "Отправить запрос"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Выберите период" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 часа</SelectItem>
              <SelectItem value="today">Сегодня</SelectItem>
              <SelectItem value="yesterday">Вчера</SelectItem>
              <SelectItem value="week">Неделя</SelectItem>
              <SelectItem value="month">Месяц</SelectItem>
              <SelectItem value="year">Год</SelectItem>
              <SelectItem value="all">Весь период</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Баланс с формулой расчета */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>
                {merchantProfile && !merchantProfile.countInRubEquivalent
                  ? "Баланс USDT"
                  : "Баланс"}
              </CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-right">
              {merchantProfile &&
              !merchantProfile.countInRubEquivalent &&
              statistics.balance.totalUsdt !== undefined ? (
                <>
                  <div className="text-3xl font-bold text-green-600">
                    {truncateDecimals(statistics.balance.totalUsdt, 2)} USDT
                  </div>
                  <div className="text-lg text-gray-600 mt-1">
                    {formatAmount(statistics.balance.total)} ₽
                  </div>
                </>
              ) : (
                <div className="text-3xl font-bold text-green-600">
                  {formatAmount(statistics.balance.total)} ₽
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Формула расчета баланса:
            </p>
            {merchantProfile && !merchantProfile.countInRubEquivalent && statistics.balance.formulaUsdt ? (
              // Отображаем формулу в USDT
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Сумма успешных сделок:</span>
                  <span className="font-medium text-green-600">
                    +{truncateDecimals(statistics.balance.formulaUsdt.dealsTotal, 2)} USDT
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Комиссия платформы со сделок:</span>
                  <span className="font-medium text-red-600">
                    -{truncateDecimals(statistics.balance.formulaUsdt.dealsCommission, 2)} USDT
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Сумма выплат:</span>
                  <span className="font-medium text-red-600">
                    -{truncateDecimals(statistics.balance.formulaUsdt.payoutsTotal, 2)} USDT
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Комиссия платформы с выплат:</span>
                  <span className="font-medium text-red-600">
                    -{truncateDecimals(statistics.balance.formulaUsdt.payoutsCommission, 2)} USDT
                  </span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-sm font-medium">
                  <span>Итоговый баланс:</span>
                  <span className="text-green-600">
                    {truncateDecimals(statistics.balance.totalUsdt, 2)} USDT
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Эквивалент в рублях:</span>
                  <span>
                    {formatAmount(statistics.balance.total)} ₽
                  </span>
                </div>
              </div>
            ) : (
              // Отображаем формулу в рублях
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Сумма успешных сделок:</span>
                  <span className="font-medium text-green-600">
                    +{formatAmount(statistics.balance.formula.dealsTotal)} ₽
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Комиссия платформы со сделок:</span>
                  <span className="font-medium text-red-600">
                    -{formatAmount(statistics.balance.formula.dealsCommission)} ₽
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Сумма выплат:</span>
                  <span className="font-medium text-red-600">
                    -{formatAmount(statistics.balance.formula.payoutsTotal)} ₽
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Комиссия платформы с выплат:</span>
                  <span className="font-medium text-red-600">
                    -{formatAmount(statistics.balance.formula.payoutsCommission)}{" "}
                    ₽
                  </span>
                </div>
                {statistics.balance.formula.settledAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Уже выведено через Settle:</span>
                    <span className="font-medium text-red-600">
                      -{formatAmount(statistics.balance.formula.settledAmount)} ₽
                    </span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between text-sm font-medium">
                  <span>Итоговый баланс:</span>
                  <span className="text-green-600">
                    {formatAmount(statistics.balance.total)} ₽
                  </span>
                </div>
              </div>
            )}

            {merchantProfile && !merchantProfile.countInRubEquivalent && (
              <div className="mt-3 p-3 bg-blue-50 rounded-md">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-blue-700">
                      USDT баланс рассчитан на основе курсов, переданных при
                      создании каждой транзакции
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Статистика сделок и выплат */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Сделки */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle>Сделки</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              </div>
              <Badge variant="outline">{statistics.deals.total}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Основные показатели */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Количество</p>
                  <p className="text-2xl font-bold">{statistics.deals.total}</p>
                </div>
                {/* <div>
                  <p className="text-sm text-muted-foreground">Конверсия выдачи</p>
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-green-600" />
                    <p className="text-2xl font-bold text-green-600">{statistics.deals.requisiteConversion?.rate || "0.00"}%</p>
                  </div>
                </div> */}
              </div>

              {/* Детализация конверсии */}
              {statistics.deals.requisiteConversion && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-2">
                  {/* <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Успешных попыток:
                    </span>
                    <span className="font-medium text-green-600">
                      {statistics.deals.requisiteConversion.successfulAttempts}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Неудачных попыток:
                    </span>
                    <span className="font-medium text-red-600">
                      {statistics.deals.requisiteConversion.failedAttempts}
                    </span>
                  </div> */}
                  {statistics.deals.requisiteConversion.errorBreakdown &&
                    statistics.deals.requisiteConversion.errorBreakdown.length >
                      0 && (
                      <div className="pt-2 border-t space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Причины ошибок:
                        </p>
                        {statistics.deals.requisiteConversion.errorBreakdown.map(
                          (error: any) => (
                            <div
                              key={error.errorCode}
                              className="flex justify-between text-xs"
                            >
                              <span className="text-muted-foreground">
                                {error.errorCode === "NO_REQUISITE"
                                  ? "Нет реквизитов"
                                  : error.errorCode}
                              </span>
                              <span className="font-medium">{error.count}</span>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                </div>
              )}

              {/* Детализация по статусам */}
              <div className="space-y-2">
                <p className="text-sm font-medium">По статусам:</p>
                {statistics.deals.statusBreakdown.map((status: any) => (
                  <div
                    key={status.status}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {getStatusBadge(status.status)}
                      <span className="text-muted-foreground">
                        {status.count} шт.
                      </span>
                    </div>
                    <span className="font-medium">
                      {formatAmount(status.amount)} ₽
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Выплаты */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle>Выплаты</CardTitle>
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              </div>
              <Badge variant="outline">{statistics.payouts.total}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Основные показатели */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Количество</p>
                  <p className="text-2xl font-bold">
                    {statistics.payouts.total}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Оборот</p>
                  <p className="text-2xl font-bold">
                    {formatAmount(statistics.payouts.volume)} ₽
                  </p>
                </div>
              </div>

              {/* Детализация по статусам */}
              <div className="space-y-2">
                <p className="text-sm font-medium">По статусам:</p>
                {statistics.payouts.statusBreakdown.map((status: any) => (
                  <div
                    key={status.status}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {getStatusBadge(status.status)}
                      <span className="text-muted-foreground">
                        {status.count} шт.
                      </span>
                    </div>
                    <span className="font-medium">
                      {formatAmount(status.amount)} ₽
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Таблица методов оплаты */}
      <Card>
        <CardHeader>
          <CardTitle>Методы оплаты</CardTitle>
          <CardDescription>
            Детальная статистика по каждому методу с комиссиями и транзакциями
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Метод</TableHead>
                <TableHead className="text-center">Комиссии</TableHead>
                <TableHead colSpan={2} className="text-center">
                  Сделки
                </TableHead>
                <TableHead colSpan={2} className="text-center">
                  Выплаты
                </TableHead>
                <TableHead className="text-center">Всего транзакций</TableHead>
              </TableRow>
              <TableRow>
                <TableHead></TableHead>
                <TableHead className="text-center text-xs">
                  Вход / Выход
                </TableHead>
                <TableHead className="text-center text-xs">Кол-во</TableHead>
                <TableHead className="text-center text-xs">Успешно</TableHead>
                <TableHead className="text-center text-xs">Кол-во</TableHead>
                <TableHead className="text-center text-xs">Успешно</TableHead>
                <TableHead className="text-center text-xs">
                  Всего / Успешно
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statistics.methodStats.map((method: any) => (
                <TableRow key={method.methodId}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{method.methodName}</p>
                      <p className="text-xs text-muted-foreground">
                        {method.methodCode}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 text-sm">
                      <span className="text-green-600">
                        {method.commissionPayin}%
                      </span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-red-600">
                        {method.commissionPayout}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div>
                      <p className="font-medium">{method.deals.total}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatAmount(method.deals.volume)} ₽
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div>
                      <p className="font-medium text-green-600">
                        {method.deals.successful}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatAmount(method.deals.successVolume)} ₽
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div>
                      <p className="font-medium">{method.payouts.total}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatAmount(method.payouts.volume)} ₽
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div>
                      <p className="font-medium text-green-600">
                        {method.payouts.successful}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatAmount(method.payouts.successVolume)} ₽
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="font-medium">
                        {method.total.transactions}
                      </span>
                      <span className="text-muted-foreground">/</span>
                      <span className="font-medium text-green-600">
                        {method.total.successfulTransactions}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
