"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { aggregatorApi } from "@/services/api";
import { useAggregatorAuth } from "@/stores/aggregator-auth";
import { formatAmount, formatDateTime } from "@/lib/utils";
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CreditCard,
  DollarSign,
  Globe,
  Loader2,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  RefreshCw,
} from "lucide-react";

interface OverviewData {
  balanceUsdt: number;
  todayTransactions: number;
  monthTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalVolume: number;
  activeDisputes: number;
  recentTransactions: Array<{
    id: string;
    numericId: number;
    amount: number;
    status: string;
    createdAt: string;
    merchant: {
      name: string;
    };
  }>;
}

export default function AggregatorDashboard() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const aggregator = useAggregatorAuth();

  const fetchOverview = async () => {
    try {
      setRefreshing(true);
      const data = await aggregatorApi.getOverview();
      setOverview(data);

      // Обновляем баланс в store если он изменился
      if (data.balanceUsdt !== aggregator.balanceUsdt) {
        aggregator.setAuth(
          aggregator.sessionToken || "",
          aggregator.aggregatorId || "",
          aggregator.aggregatorName || "",
          aggregator.email || "",
          aggregator.apiToken || "",
          aggregator.apiBaseUrl,
          data.balanceUsdt,
          aggregator.twoFactorEnabled || false
        );
      }
    } catch (error: any) {
      console.error("Error fetching overview:", error);
      toast.error("Ошибка загрузки данных");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    // Обновляем каждые 30 секунд
    const interval = setInterval(fetchOverview, 30000);
    return () => clearInterval(interval);
  }, []);

  const copyApiToken = () => {
    if (aggregator.apiToken) {
      navigator.clipboard.writeText(aggregator.apiToken);
      toast.success("API токен скопирован в буфер обмена");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        variant: "default" | "success" | "destructive" | "warning";
      }
    > = {
      CREATED: { label: "Создана", variant: "default" },
      IN_PROGRESS: { label: "В процессе", variant: "warning" },
      READY: { label: "Завершена", variant: "default" },
      CANCELED: { label: "Отменена", variant: "destructive" },
      EXPIRED: { label: "Истекла", variant: "destructive" },
      DISPUTE: { label: "Спор", variant: "destructive" },
    };
    const config = statusMap[status] || { label: status, variant: "default" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Globe className="h-8 w-8 text-[#006039]" />
            Панель агрегатора
          </h1>
          <p className="text-muted-foreground mt-1">
            Добро пожаловать, {aggregator.aggregatorName}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchOverview}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">Обновить</span>
        </Button>
      </div>

      {/* API Token Card */}
      <Card className="border-[#006039]/20 bg-gradient-to-r from-[#006039]/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5 text-[#006039]" />
            API интеграция
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Ваш API токен:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono">
                  {aggregator.apiToken
                    ? `${aggregator.apiToken.substring(0, 20)}...`
                    : "Не установлен"}
                </code>
                <Button size="sm" variant="outline" onClick={copyApiToken}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {aggregator.apiBaseUrl && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Базовый URL вашего API:
                </p>
                <code className="block bg-muted px-3 py-2 rounded text-sm">
                  {aggregator.apiBaseUrl}
                </code>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Баланс USDT</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatAmount(
                overview?.balanceUsdt || aggregator.balanceUsdt || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Доступно для операций
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Сделки сегодня
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview?.todayTransactions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              За последние 24 часа
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Успешность</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview && overview.monthTransactions > 0
                ? Math.round(
                    (overview.successfulTransactions /
                      overview.monthTransactions) *
                      100
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              {overview?.successfulTransactions || 0} из{" "}
              {overview?.monthTransactions || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Активные споры
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {overview?.activeDisputes || 0}
            </div>
            <p className="text-xs text-muted-foreground">Требуют внимания</p>
          </CardContent>
        </Card>
      </div>

      {/* Volume Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Объем за месяц</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Общий объем
                </span>
                <span className="text-xl font-bold">
                  {formatAmount(overview?.totalVolume || 0)} ₽
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Успешных сделок
                </span>
                <span className="text-lg font-semibold text-green-600">
                  {overview?.successfulTransactions || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Неудачных сделок
                </span>
                <span className="text-lg font-semibold text-red-600">
                  {overview?.failedTransactions || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Статистика за месяц</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Всего транзакций
                </span>
                <span className="text-xl font-bold">
                  {overview?.monthTransactions || 0}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Успешных</span>
                  <span className="ml-auto font-semibold">
                    {overview?.successfulTransactions || 0}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm">Неудачных</span>
                  <span className="ml-auto font-semibold">
                    {overview?.failedTransactions || 0}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Последние транзакции</CardTitle>
        </CardHeader>
        <CardContent>
          {overview?.recentTransactions &&
          overview.recentTransactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Мерчант</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.recentTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-mono">#{tx.numericId}</TableCell>
                    <TableCell>{tx.merchant.name}</TableCell>
                    <TableCell>{formatAmount(tx.amount)} ₽</TableCell>
                    <TableCell>{getStatusBadge(tx.status)}</TableCell>
                    <TableCell>{formatDateTime(tx.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Нет транзакций
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
