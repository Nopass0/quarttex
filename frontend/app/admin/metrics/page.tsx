"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Loader2, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useAdminAuth } from "@/stores/auth";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AuthLayout } from "@/components/layouts/auth-layout";
import { Button } from "@/components/ui/button";

interface MetricsData {
  totalRubFromMerchants: number;
  totalRubReceivedByTraders: number;
  totalRubMilkByMerchant: number;
  canceledDealsAmount: number;
  expiredDealsAmount: number;
  canceledAndExpiredTotal: number;
  disputeDealsAmount: number;
  milkByMerchantAmount: number;
  milkUndefinedAmount: number;
  totalMilkAmount: number;
  pendingPaymentAmount: number;
  platformProfitBeforeAgents: number;
  platformProfitAfterAgents: number;
  totalUsdtSentToMerchants: number;
  totalUsdtReceivedFromTraders: number;
  averageWeightedSpread: number;
  earningsPerDeal: Array<{
    transactionId: string;
    numericId: number;
    earnings: number;
  }>;
  averageEarningsPerDealBeforeAgents: number;
  averageEarningsPerDealAfterAgents: number;
  averageOrderAmount: number;
  orderStats: {
    total: number;
    accepted: number;
    notAccepted: number;
    failedDueToMerchantConversion: number;
    byStatus: Record<string, number>;
  };
}

function formatCurrency(value: number, currency: "RUB" | "USDT" = "RUB") {
  if (currency === "RUB") {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
  return `${value.toFixed(2)} USDT`;
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

const statusTranslations: Record<string, string> = {
  CREATED: "Создана",
  IN_PROGRESS: "В процессе",
  DISPUTE: "В споре",
  EXPIRED: "Истекла",
  READY: "Выполнена",
  MILK: "Молоко",
  CANCELED: "Отменена",
};

function MetricsContent() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  
  const { token: adminToken } = useAdminAuth();

  const fetchMetrics = async () => {
    if (!adminToken) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (dateRange.from) {
        params.append("startDate", dateRange.from.toISOString());
      }
      if (dateRange.to) {
        params.append("endDate", dateRange.to.toISOString());
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/metrics?${params.toString()}`,
        {
          headers: { "x-admin-key": adminToken },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Ошибка: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setMetrics(data.data);
      } else {
        throw new Error(data.error || "Не удалось загрузить метрики");
      }
    } catch (error: any) {
      console.error("Failed to fetch metrics:", error);
      setError(error.message || "Не удалось загрузить метрики");
      toast.error(error.message || "Ошибка загрузки метрик");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminToken) {
      fetchMetrics();
    }
  }, [adminToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-red-600">Ошибка: {error}</p>
        <Button 
          onClick={() => {
            setError(null);
            fetchMetrics();
          }}
          variant="default"
        >
          Повторить попытку
        </Button>
      </div>
    );
  }

  if (!metrics && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-muted-foreground">Нет данных для отображения</p>
        <Button 
          onClick={() => fetchMetrics()}
          variant="default"
        >
          Загрузить метрики
        </Button>
        <p className="text-xs text-gray-500">Token: {adminToken ? 'есть' : 'отсутствует'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <Button
            onClick={() => fetchMetrics()}
            variant="default"
          >
            Обновить
          </Button>
          <DatePickerWithRange
            date={dateRange}
            onDateChange={(date) => {
              if (date?.from) {
                setDateRange({
                  from: date.from,
                  to: date.to || date.from
                });
              }
            }}
          />
        </div>
      </div>

      {/* Основные метрики по рублям */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Общий оборот от мерчантов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(metrics.totalRubFromMerchants)}
            </p>
            <p className="text-sm text-muted-foreground">
              Все рубли от мерчантов
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Получено трейдерами
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(metrics.totalRubReceivedByTraders)}
            </p>
            <p className="text-sm text-muted-foreground">
              Успешные сделки
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Молоко по вине мерчанта
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(metrics.totalRubMilkByMerchant)}
            </p>
            <p className="text-sm text-muted-foreground">
              Истекшие без трейдера
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Статусы сделок */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Отмененные</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-orange-600">
              {formatCurrency(metrics.canceledDealsAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Истекшие</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-orange-600">
              {formatCurrency(metrics.expiredDealsAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">В спорах</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-yellow-600">
              {formatCurrency(metrics.disputeDealsAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ожидают зачисления</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-blue-600">
              {formatCurrency(metrics.pendingPaymentAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Молочные сделки */}
      <Card>
        <CardHeader>
          <CardTitle>Анализ молочных сделок</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">По вине мерчанта</p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(metrics.milkByMerchantAmount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                По неопределенной причине
              </p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(metrics.milkUndefinedAmount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Всего молока</p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(metrics.totalMilkAmount)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Прибыль платформы */}
      <Card>
        <CardHeader>
          <CardTitle>Прибыль платформы</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Отправлено мерчантам
                </p>
                <p className="text-xl font-bold">
                  {formatCurrency(metrics.totalUsdtSentToMerchants, "USDT")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Получено от трейдеров
                </p>
                <p className="text-xl font-bold">
                  {formatCurrency(metrics.totalUsdtReceivedFromTraders, "USDT")}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Прибыль без агентских
                </p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(metrics.platformProfitBeforeAgents, "USDT")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Прибыль с агентскими
                </p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(metrics.platformProfitAfterAgents, "USDT")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Средневзвешенный спред
                </p>
                <p className="text-xl font-bold">
                  {formatPercent(metrics.averageWeightedSpread)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Средние показатели */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Средний заработок (без агентских)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">
              {formatCurrency(metrics.averageEarningsPerDealBeforeAgents, "USDT")}
            </p>
            <p className="text-sm text-muted-foreground">На сделку</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Средний заработок (с агентскими)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">
              {formatCurrency(metrics.averageEarningsPerDealAfterAgents, "USDT")}
            </p>
            <p className="text-sm text-muted-foreground">На сделку</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Средняя сумма заявки</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">
              {formatCurrency(metrics.averageOrderAmount)}
            </p>
            <p className="text-sm text-muted-foreground">Успешные сделки</p>
          </CardContent>
        </Card>
      </div>

      {/* Статистика ордеров */}
      <Card>
        <CardHeader>
          <CardTitle>Статистика ордеров</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Всего</p>
              <p className="text-xl font-bold">{metrics.orderStats.total}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Приняты</p>
              <p className="text-xl font-bold text-green-600">
                {metrics.orderStats.accepted}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Не приняты</p>
              <p className="text-xl font-bold text-red-600">
                {metrics.orderStats.notAccepted}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Плохая конверсия
              </p>
              <p className="text-xl font-bold text-orange-600">
                {metrics.orderStats.failedDueToMerchantConversion}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3">По статусам</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(metrics.orderStats.byStatus).map(
                ([status, count]) => (
                  <div key={status} className="text-sm">
                    <span className="text-muted-foreground">{statusTranslations[status] || status}:</span>{" "}
                    <span className="font-medium">{count}</span>
                  </div>
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MetricsPage() {
  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold text-gray-900">Метрики платформы</h1>
          <MetricsContent />
        </div>
      </AuthLayout>
    </ProtectedRoute>
  );
}