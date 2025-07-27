"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AuthLayout } from "@/components/layouts/auth-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TraderHeader } from "@/components/trader/trader-header";
import { traderApi } from "@/services/api";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import Link from "next/link";
import {
  ChevronDown,
  Smartphone,
  Building2,
  MessageSquare,
  ArrowRight,
  AlertCircle,
  Clock,
  CheckCircle,
  X,
  CreditCard,
  Copy,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// Bank icon component - copied from deals list
const getBankIcon = (bankType: string, size: "sm" | "md" = "md") => {
  const bankLogos: Record<string, string> = {
    SBERBANK: "/bank-logos/sberbank.svg",
    TBANK: "/bank-logos/tbank.svg",
    TINKOFF: "/bank-logos/tinkoff.svg",
    ALFABANK: "/bank-logos/alfabank.svg",
    VTB: "/bank-logos/vtb.svg",
    RAIFFEISEN: "/bank-logos/raiffeisen.svg",
    GAZPROMBANK: "/bank-logos/gazprombank.svg",
    POCHTABANK: "/bank-logos/pochtabank.svg",
    PROMSVYAZBANK: "/bank-logos/psb.svg",
    PSB: "/bank-logos/psb.svg",
    SOVCOMBANK: "/bank-logos/sovcombank.svg",
    SPBBANK: "/bank-logos/bspb.svg",
    BSPB: "/bank-logos/bspb.svg",
    ROSSELKHOZBANK: "/bank-logos/rshb.svg",
    RSHB: "/bank-logos/rshb.svg",
    OTKRITIE: "/bank-logos/otkritie.svg",
    URALSIB: "/bank-logos/uralsib.svg",
    MKB: "/bank-logos/mkb.svg",
    ROSBANK: "/bank-logos/rosbank.svg",
    ZENIT: "/bank-logos/zenit.svg",
    RUSSIAN_STANDARD: "/bank-logos/russian-standard.svg",
    AVANGARD: "/bank-logos/avangard.svg",
    RNKB: "/bank-logos/rnkb.svg",
    SBP: "/bank-logos/sbp.svg",
    AKBARS: "/bank-logos/akbars.svg",
  };

  const logoPath = bankLogos[bankType] || bankLogos[bankType?.toUpperCase()];
  const sizeClasses = size === "sm" ? "w-8 h-8" : "w-10 h-10";

  if (logoPath) {
    return (
      <div className={`${sizeClasses} rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center p-1`}>
        <img
          src={logoPath}
          alt={bankType}
          className="w-full h-full object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement!.innerHTML = `
              <svg class="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            `;
          }}
        />
      </div>
    );
  }

  // Default neutral bank icon
  return (
    <div className={`${sizeClasses} rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center`}>
      <CreditCard className="w-5 h-5 text-gray-600" />
    </div>
  );
};

// Device status function - copied from devices page
const getDeviceStatusInfo = (device: any) => {
  if (!device.isRegistered) {
    return {
      title: "Не зарегистрировано в системе",
      description: "Пройдите регистрацию в мобильном приложении",
      badge: {
        text: "Без регистрации",
        className: "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
      },
      iconColor: "text-red-500 dark:text-red-400",
    };
  }

  if (device.isOnline || device.status === "working") {
    return {
      title: `Реквизиты: ${device.linkedBankDetails || device.activeRequisites || 0}`,
      description: device.lastSeen ? `Последняя активность: ${device.lastSeen}` : "Активно",
      badge: {
        text: "В работе",
        className: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600",
      },
      iconColor: "text-gray-600 dark:text-gray-400",
    };
  }

  return {
    title: `Реквизиты: ${device.linkedBankDetails || device.activeRequisites || 0}`,
    description: device.stoppedAt
      ? `Остановлено: ${device.stoppedAt}`
      : "Остановлено",
    badge: {
      text: "Не в работе",
      className: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/50 dark:text-gray-400 dark:border-gray-700",
    },
    iconColor: "text-gray-500 dark:text-gray-500",
  };
};

// Skeleton components for loading states
const FinanceStatsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-4 w-16 mb-2" />
          <Skeleton className="h-8 w-12" />
        </div>
        <div className="text-right">
          <Skeleton className="h-4 w-12 mb-2" />
          <Skeleton className="h-6 w-24 mb-1" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </Card>
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="text-right">
          <Skeleton className="h-4 w-16 mb-2" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
    </Card>
  </div>
);

const EventSkeleton = () => (
  <div className="p-4">
    <div className="flex items-start gap-3">
      <Skeleton className="w-2 h-2 rounded-full mt-2" />
      <div className="flex-1">
        <Skeleton className="h-4 w-32 mb-1" />
        <Skeleton className="h-4 w-48 mb-1" />
        <Skeleton className="h-3 w-36" />
      </div>
    </div>
  </div>
);

const DeviceSkeleton = () => (
  <Card className="p-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-lg" />
        <div>
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div>
        <Skeleton className="h-6 w-20 rounded-md" />
      </div>
    </div>
  </Card>
);

const DealSkeleton = () => (
  <div className="p-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div>
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-4 w-40 mb-1" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="text-right">
        <Skeleton className="h-4 w-20 mb-1" />
        <Skeleton className="h-3 w-16 mb-1" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  </div>
);

const DisputeSkeleton = () => (
  <div className="p-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div>
          <Skeleton className="h-4 w-20 mb-1" />
          <Skeleton className="h-4 w-32 mb-1" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-6 w-16" />
    </div>
  </div>
);

export default function TraderDashboardPage() {
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year">(
    "today",
  );
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await traderApi.getDashboard(period);

      if (response.success && response.data) {
        setDashboardData(response.data);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // Set empty data on error
      setDashboardData({
        financialStats: {
          deals: { count: 0, amount: 0, amountRub: 0 },
          profit: { amount: 0, amountRub: 0 },
        },
        recentDeals: [],
        openDisputes: [],
        recentEvents: [],
        devices: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const periodLabels = {
    today: "за сегодня",
    week: "за неделю",
    month: "за месяц",
    year: "за год",
  };

  const getEventTypeInfo = (type: string) => {
    switch (type) {
      case "device_stopped":
        return { color: "bg-orange-500", title: "Устройство остановлено" };
      case "device_started":
        return { color: "bg-purple-500", title: "Устройство запущено" };
      case "deal_failed":
        return { color: "bg-red-500", title: "Сделка не завершена" };
      case "dispute_opened":
        return { color: "bg-yellow-500", title: "Открыт спор" };
      default:
        return { color: "bg-gray-500", title: "Событие" };
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      READY: {
        label: "Готово",
        className: "bg-purple-100 text-purple-700 border-purple-200",
      },
      IN_PROGRESS: {
        label: "В работе",
        className: "bg-blue-100 text-blue-700 border-blue-200",
      },
      CREATED: {
        label: "Ожидает",
        className: "bg-yellow-100 text-yellow-700 border-yellow-200",
      },
      EXPIRED: {
        label: "Истекло",
        className: "bg-red-100 text-red-700 border-red-200",
      },
      CANCELED: {
        label: "Отменено",
        className: "bg-gray-100 text-gray-700 border-gray-200",
      },
      DISPUTE: {
        label: "Спор",
        className: "bg-orange-100 text-orange-700 border-orange-200",
      },
    };

    const config = statusConfig[status] || {
      label: status,
      className: "bg-gray-100 text-gray-700",
    };
    return (
      <Badge className={cn("text-xs", config.className)}>{config.label}</Badge>
    );
  };

  return (
    <ProtectedRoute variant="trader">
      <AuthLayout variant="trader">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold dark:text-[#eeeeee]">
              Главная
            </h1>
            <TraderHeader />
          </div>

          {/* Finance Section - Copied from deals page */}
          <section className="space-y-4">
            {/* Stats Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
              {/* Deals Stats */}
              <Card className="p-3 md:p-4 border border-gray-200 dark:border-[#292133]">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <h3 className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1 md:mb-2">
                      Сделки ({dashboardData?.financialStats.deals.count || 0})
                    </h3>
                    <div className="space-y-1">
                      <div className="text-lg md:text-xl font-semibold text-gray-900 dark:text-[#eeeeee]">
                        {(dashboardData?.financialStats.deals.amount || 0).toFixed(2)} USDT
                      </div>
                      <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                        {(dashboardData?.financialStats.deals.amountRub || 0).toFixed(0)} RUB
                      </div>
                      {(dashboardData?.financialStats.deals.count || 0) === 0 && (
                        <div className="text-xs text-red-500 dark:text-[#c64444] mt-2">
                          Нет успешных сделок
                        </div>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs w-full sm:w-auto">
                        Период: {periodLabels[period]}
                        <ChevronDown className="ml-1 h-3 w-3 text-[#530FAD] dark:text-[#530FAD]" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-48 p-0 dark:bg-[#292133] dark:border-gray-700" align="end">
                      <div className="max-h-64 overflow-auto">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start dark:hover:bg-[#292133]/50"
                          onClick={() => setPeriod("today")}
                        >
                          За сегодня
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start dark:hover:bg-[#292133]/50"
                          onClick={() => setPeriod("week")}
                        >
                          За неделю
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start dark:hover:bg-[#292133]/50"
                          onClick={() => setPeriod("month")}
                        >
                          За месяц
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start dark:hover:bg-[#292133]/50"
                          onClick={() => setPeriod("year")}
                        >
                          За год
                        </Button>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>

              {/* Profit Stats */}
              <Card className="p-3 md:p-4 border border-gray-200 dark:border-[#292133]">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <h3 className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1 md:mb-2">Прибыль</h3>
                    <div className="space-y-1">
                      <div className="text-lg md:text-xl font-semibold text-gray-900 dark:text-[#eeeeee]">
                        {(dashboardData?.financialStats.profit.amount || 0).toFixed(2)} USDT
                      </div>
                      <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                        {(dashboardData?.financialStats.profit.amountRub || 0).toFixed(0)} RUB
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs w-full sm:w-auto">
                        Период: {periodLabels[period]}
                        <ChevronDown className="ml-1 h-3 w-3 text-[#530FAD] dark:text-[#530FAD]" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-48 p-0 dark:bg-[#292133] dark:border-gray-700" align="end">
                      <div className="max-h-64 overflow-auto">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start dark:hover:bg-[#292133]/50"
                          onClick={() => setPeriod("today")}
                        >
                          За сегодня
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start dark:hover:bg-[#292133]/50"
                          onClick={() => setPeriod("week")}
                        >
                          За неделю
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start dark:hover:bg-[#292133]/50"
                          onClick={() => setPeriod("month")}
                        >
                          За месяц
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start dark:hover:bg-[#292133]/50"
                          onClick={() => setPeriod("year")}
                        >
                          За год
                        </Button>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            </div>
          </section>

          {/* Two column layout for middle sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Events */}
            <section className="space-y-3 md:space-y-4">
              <h2 className="text-base md:text-lg font-medium">Последние события</h2>
              <Card className="overflow-hidden border-gray-200">
                <div className="divide-y divide-gray-100">
                  {loading ? (
                    <>
                      <EventSkeleton />
                      <EventSkeleton />
                      <EventSkeleton />
                      <EventSkeleton />
                      <EventSkeleton />
                    </>
                  ) : dashboardData?.recentEvents.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      Нет последних событий
                    </div>
                  ) : (
                    dashboardData?.recentEvents
                      .slice(0, 5)
                      .map((event: any) => {
                        const eventInfo = getEventTypeInfo(event.type);
                        return (
                          <div
                            key={event.id}
                            className="p-4 hover:bg-gray-50/50 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={cn(
                                  "w-2 h-2 rounded-full mt-2",
                                  eventInfo.color,
                                )}
                              />
                              <div className="flex-1">
                                <p className="text-xs md:text-sm font-semibold text-gray-900">
                                  {eventInfo.title}
                                </p>
                                <p className="text-xs md:text-sm text-gray-600">
                                  {event.description}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {format(
                                    new Date(event.createdAt),
                                    "d MMMM yyyy 'г.', в HH:mm",
                                    { locale: ru },
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </Card>
            </section>

            {/* Devices */}
            <section className="space-y-3 md:space-y-4">
              <Link
                href="/trader/devices"
                className="flex items-center justify-between group"
              >
                <h2 className="text-base md:text-lg font-medium">Устройства</h2>
                <div className="flex items-center gap-1 text-[#530FAD]">
                  <span className="text-xs md:text-sm">Показать все</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              <div className="space-y-3">
                {loading ? (
                  <>
                    <DeviceSkeleton />
                    <DeviceSkeleton />
                    <DeviceSkeleton />
                    <DeviceSkeleton />
                    <DeviceSkeleton />
                  </>
                ) : dashboardData?.devices.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    Нет устройств
                  </div>
                ) : (
                  dashboardData?.devices.slice(0, 5).map((device: any) => {
                    const statusInfo = getDeviceStatusInfo(device);
                    
                    return (
                      <Card
                        key={device.id}
                        className={cn(
                          "p-4 hover:shadow-md transition-all cursor-pointer dark:bg-gray-800 dark:border-gray-700",
                          !device.isRegistered && "bg-red-50/30 dark:bg-red-900/10",
                        )}
                        onClick={() => window.open(`/trader/devices/${device.id}`, '_blank')}
                      >
                        <div className="flex items-center justify-between">
                          {/* Left Section - Icon and Device Info */}
                          <div className="flex items-center gap-3">
                            {/* Device Icon */}
                            <div
                              className={cn(
                                "p-2 rounded-lg",
                                device.isRegistered 
                                  ? (device.isOnline || device.status === "working" 
                                    ? "bg-gray-100 dark:bg-gray-800" 
                                    : "bg-gray-50 dark:bg-gray-900/50")
                                  : "bg-red-100 dark:bg-red-900/20",
                              )}
                            >
                              <Smartphone
                                className={cn("h-5 w-5", statusInfo.iconColor)}
                              />
                            </div>

                            {/* Device Name and ID */}
                            <div>
                              <h3 className="font-semibold text-sm md:text-base dark:text-[#eeeeee]">{device.name}</h3>
                              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                                ID: {device.numericId || device.id || "N/A"}
                              </p>
                            </div>
                          </div>

                          {/* Right Section - Status Badge */}
                          <div>
                            <Badge
                              className={cn(
                                "border px-3 py-1 rounded-md text-center text-xs",
                                statusInfo.badge.className,
                              )}
                            >
                              {statusInfo.badge.text}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          {/* Open Disputes */}
          <section className="space-y-4">
            <Link
              href="/trader/disputes"
              className="flex items-center justify-between group"
            >
              <h2 className="text-lg font-medium">Открытые споры</h2>
              <div className="flex items-center gap-1 text-[#530FAD]">
                <span className="text-sm">Показать все</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            <Card className="overflow-hidden border-gray-200">
              <div className="divide-y divide-gray-100">
                {loading ? (
                  <>
                    <DisputeSkeleton />
                    <DisputeSkeleton />
                    <DisputeSkeleton />
                    <DisputeSkeleton />
                    <DisputeSkeleton />
                  </>
                ) : dashboardData?.openDisputes.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    Споры не найдены
                  </div>
                ) : (
                  dashboardData?.openDisputes.slice(0, 5).map((dispute: any) => (
                    <Link
                      key={dispute.id}
                      href={`/trader/disputes/${dispute.id}`}
                    >
                      <div className="p-4 hover:bg-gray-50/50 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                              <MessageSquare className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div>
                              <p className="text-xs md:text-sm font-semibold text-gray-900">
                                {dispute.entityId}
                              </p>
                              <p className="text-xs md:text-sm text-gray-600">
                                {dispute.reason}
                              </p>
                              <p className="text-xs text-gray-500">
                                {format(
                                  new Date(dispute.createdAt),
                                  "d MMMM yyyy",
                                  { locale: ru },
                                )}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="border-yellow-200 text-yellow-700 text-xs"
                          >
                            {dispute.status === "OPEN"
                              ? "Открыт"
                              : "В процессе"}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </Card>
          </section>

          {/* Recent Deals - Copied exact styling from deals page */}
          <section className="space-y-4">
            <Link
              href="/trader/deals"
              className="flex items-center justify-between group"
            >
              <h2 className="text-lg font-medium">Последние сделки</h2>
              <div className="flex items-center gap-1 text-[#530FAD]">
                <span className="text-sm">Показать все</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            <div className="space-y-3">
              {loading ? (
                <>
                  <DealSkeleton />
                  <DealSkeleton />
                  <DealSkeleton />
                  <DealSkeleton />
                  <DealSkeleton />
                </>
              ) : dashboardData?.recentDeals.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  Нет сделок
                </div>
              ) : (
                dashboardData?.recentDeals.slice(0, 5).map((deal: any) => {
                  const formatRemainingTime = (expiredAt: string) => {
                    const now = new Date().getTime();
                    const expiresAt = new Date(expiredAt).getTime();
                    const diff = expiresAt - now;
                  
                    if (diff <= 0) return "Истекло";
                  
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                  
                    if (hours > 0) {
                      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
                    } else {
                      return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
                    }
                  };

                  const getStatusIcon = () => {
                    switch (deal.status) {
                      case "READY":
                        return (
                          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <CheckCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                          </div>
                        );
                      case "CREATED":
                      case "IN_PROGRESS":
                        return (
                          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          </div>
                        );
                      case "DISPUTE":
                        return (
                          <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <Scale className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                          </div>
                        );
                      case "EXPIRED":
                      case "CANCELED":
                        return (
                          <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <X className="h-6 w-6 text-red-600 dark:text-red-400" />
                          </div>
                        );
                      default:
                        return null;
                    }
                  };

                  const getPaymentStatus = () => {
                    switch (deal.status) {
                      case "READY":
                        return "Платеж зачислен";
                      case "CREATED":
                      case "IN_PROGRESS":
                        return "Платеж ожидает зачисления";
                      case "DISPUTE":
                        return "Спор по сделке";
                      default:
                        return "Платеж не зачислен";
                    }
                  };

                  const getStatusBadgeText = () => {
                    switch (deal.status) {
                      case "READY":
                        return "Зачислен";
                      case "CREATED":
                      case "IN_PROGRESS":
                        return deal.expired_at ? formatRemainingTime(deal.expired_at) : "В работе";
                      case "DISPUTE":
                        return "Спор";
                      case "EXPIRED":
                        return "Истекло";
                      case "CANCELED":
                        return "Отменено";
                      default:
                        return "Не зачислен";
                    }
                  };

                  const getStatusBadgeColor = () => {
                    switch (deal.status) {
                      case "READY":
                        return "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800";
                      case "CREATED":
                      case "IN_PROGRESS":
                        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
                      case "DISPUTE":
                        return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800";
                      default:
                        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";
                    }
                  };

                  const usdtAmount = deal.frozenUsdtAmount
                    ? (Math.round(deal.frozenUsdtAmount * 100) / 100).toFixed(2)
                    : deal.rate
                      ? (Math.round((deal.amount / deal.rate) * 100) / 100).toFixed(2)
                      : (Math.round((deal.amount / 95) * 100) / 100).toFixed(2);

                  return (
                    <Card
                      key={deal.id}
                      className="p-4 hover:shadow-md dark:hover:shadow-gray-700 transition-all duration-300 cursor-pointer dark:bg-gray-800 dark:border-gray-700"
                      onClick={() => window.location.href = `/trader/deals?id=${deal.id}`}
                    >
                      <div className="flex items-center gap-3 md:gap-4">
                        {/* Status Icon */}
                        <div className="flex-shrink-0 hidden md:block">{getStatusIcon()}</div>

                        {/* Mobile layout */}
                        <div className="md:hidden flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-sm font-semibold text-gray-900 dark:text-[#eeeeee]">
                                {deal.numericId}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {deal.clientName}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-gray-900 dark:text-[#eeeeee]">
                                {usdtAmount} USDT
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {deal.amount.toLocaleString("ru-RU")} ₽
                              </div>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "mt-2 px-2 py-1 text-xs font-medium border rounded-md",
                              getStatusBadgeColor(),
                            )}
                          >
                            {getStatusBadgeText()}
                          </Badge>
                        </div>

                        {/* Desktop layout */}
                        <div className="hidden md:flex md:items-center md:gap-4 md:flex-1">
                          {/* Transaction ID and Method */}
                          <div className="w-24 flex-shrink-0">
                            <div className="text-sm font-semibold text-gray-900 dark:text-[#eeeeee]">
                              {deal.numericId}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {deal.method?.name || "—"}
                            </div>
                          </div>

                          {/* Payment Status and Date */}
                          <div className="w-48 flex-shrink-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-[#eeeeee]">
                              {getPaymentStatus()}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Создан{" "}
                              {format(
                                new Date(deal.createdAt),
                                "HH:mm dd.MM.yyyy",
                              )}
                            </div>
                          </div>

                          {/* Bank and Requisites */}
                          <div className="w-64 flex-shrink-0">
                            <div className="flex items-center gap-3">
                              {deal.requisites?.bankType ? (
                                getBankIcon(deal.requisites.bankType)
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                                  <CreditCard className="w-5 h-5 text-gray-600" />
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900 dark:text-[#eeeeee]">
                                  {deal.requisites?.cardNumber || "—"}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {deal.clientName}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Amount */}
                          <div className="w-32 flex-shrink-0">
                            <div className="text-sm font-semibold text-gray-900 dark:text-[#eeeeee]">
                              {usdtAmount} USDT
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {deal.amount.toLocaleString("ru-RU")} ₽
                            </div>
                          </div>

                          {/* Rate */}
                          <div className="w-32 flex-shrink-0 hidden lg:block">
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {deal.rate
                                ? `${deal.rate.toFixed(2)} ₽/USDT`
                                : "—"}
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="flex-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                "px-4 py-2 text-sm font-medium border rounded-xl inline-block min-w-[100px] text-center",
                                getStatusBadgeColor(),
                              )}
                            >
                              {getStatusBadgeText()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </AuthLayout>
    </ProtectedRoute>
  );
}
