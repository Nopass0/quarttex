"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Info,
} from "lucide-react";
import { toast } from "sonner";

interface AggregatorMetrics {
  balanceUsdt: number;
  depositUsdt: number;
  balanceNoRequisite: number;
  balanceSuccess: number;
  balanceExpired: number;
  totalPlatformProfit: number;
  totalTransactions: number;
  successRate: number;
}

interface AggregatorMetricsProps {
  aggregatorId: string;
  aggregatorName: string;
}

export default function AggregatorMetrics({
  aggregatorId,
  aggregatorName,
}: AggregatorMetricsProps) {
  const [metrics, setMetrics] = useState<AggregatorMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState("");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);

  const fetchMetrics = async () => {
    try {
      const adminKey = localStorage.getItem("adminKey");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators/${aggregatorId}/metrics`,
        {
          headers: {
            "x-admin-key": adminKey || "",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch metrics");
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      toast.error("Ошибка загрузки метрик");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Обновляем каждые 30 секунд
    return () => clearInterval(interval);
  }, [aggregatorId]);

  const handleAddDeposit = async () => {
    try {
      const adminKey = localStorage.getItem("adminKey");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators/${aggregatorId}/deposit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminKey || "",
          },
          body: JSON.stringify({ amount: parseFloat(depositAmount), type: 'deposit' }),
        }
      );

      if (!response.ok) throw new Error("Failed to add deposit");
      
      toast.success(`Депозит пополнен на ${depositAmount} USDT`);
      setDepositDialogOpen(false);
      setDepositAmount("");
      fetchMetrics();
    } catch (error) {
      console.error("Error adding deposit:", error);
      toast.error("Ошибка пополнения депозита");
    }
  };

  const handleAddBalance = async () => {
    try {
      const adminKey = localStorage.getItem("adminKey");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators/${aggregatorId}/balance`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminKey || "",
          },
          body: JSON.stringify({ amount: parseFloat(balanceAmount) }),
        }
      );

      if (!response.ok) throw new Error("Failed to add balance");
      
      toast.success(`Баланс пополнен на ${balanceAmount} USDT`);
      setBalanceDialogOpen(false);
      setBalanceAmount("");
      fetchMetrics();
    } catch (error) {
      console.error("Error adding balance:", error);
      toast.error("Ошибка пополнения баланса");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Метрики недоступны
          </p>
        </CardContent>
      </Card>
    );
  }

  const depositSufficient = metrics.depositUsdt >= 1000;
  const depositPercentage = Math.min((metrics.depositUsdt / 1000) * 100, 100);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Метрики агрегатора: {aggregatorName}</span>
            <Badge variant={depositSufficient ? "success" : "destructive"}>
              {depositSufficient ? "Активен" : "Недостаточно депозита"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Основные балансы */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    Основной баланс
                  </CardTitle>
                  <Dialog open={balanceDialogOpen} onOpenChange={setBalanceDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-1" />
                        Пополнить
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Пополнение основного баланса</DialogTitle>
                        <DialogDescription>
                          Введите сумму для пополнения основного баланса агрегатора
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="balance-amount">Сумма (USDT)</Label>
                          <Input
                            id="balance-amount"
                            type="number"
                            step="0.01"
                            value={balanceAmount}
                            onChange={(e) => setBalanceAmount(e.target.value)}
                            placeholder="100.00"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={handleAddBalance}
                          disabled={!balanceAmount || parseFloat(balanceAmount) <= 0}
                        >
                          Пополнить
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-bold">
                    {metrics.balanceUsdt.toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground">USDT</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Используется для оплаты сделок
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    Страховой депозит
                  </CardTitle>
                  <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-1" />
                        Пополнить
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Пополнение депозита</DialogTitle>
                        <DialogDescription>
                          Минимальный депозит для получения трафика: 1000 USDT
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="deposit-amount">Сумма (USDT)</Label>
                          <Input
                            id="deposit-amount"
                            type="number"
                            step="0.01"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            placeholder="1000.00"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={handleAddDeposit}
                          disabled={!depositAmount || parseFloat(depositAmount) <= 0}
                        >
                          Пополнить
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-bold">
                    {metrics.depositUsdt.toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground">USDT</span>
                </div>
                <Progress value={depositPercentage} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {depositSufficient
                    ? "Депозит достаточен"
                    : `Требуется еще ${(1000 - metrics.depositUsdt).toFixed(2)} USDT`}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Метрики сделок */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <XCircle className="h-4 w-4 mr-2 text-destructive" />
                  Не выдал реквизиты
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline space-x-1">
                  <span className="text-xl font-semibold">
                    {metrics.balanceNoRequisite.toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground">USDT</span>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground mt-1 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Сумма сделок, где не были выданы реквизиты</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                  Успешные сделки
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline space-x-1">
                  <span className="text-xl font-semibold">
                    {metrics.balanceSuccess.toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground">USDT</span>
                </div>
                <div className="flex items-center mt-1">
                  <Badge variant="outline" className="text-xs">
                    {metrics.successRate.toFixed(1)}% успешность
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-orange-500" />
                  Истекшие сделки
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline space-x-1">
                  <span className="text-xl font-semibold">
                    {metrics.balanceExpired.toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground">USDT</span>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground mt-1 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Сделки с выданными реквизитами, но без оплаты</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardContent>
            </Card>
          </div>

          {/* Прибыль платформы */}
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Прибыль платформы
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline space-x-1">
                <span className="text-3xl font-bold text-primary">
                  {metrics.totalPlatformProfit.toFixed(2)}
                </span>
                <span className="text-sm text-muted-foreground">USDT</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Разница между комиссией мерчанта и агрегатора
              </p>
              <div className="mt-3 text-xs text-muted-foreground">
                Всего транзакций: {metrics.totalTransactions}
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}