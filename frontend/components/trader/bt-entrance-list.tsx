"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BtRequisitesSheet } from "@/components/trader/bt-requisites-sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CustomCalendarPopover } from "@/components/ui/custom-calendar-popover";
import { traderApi } from "@/services/api";
import { toast } from "sonner";
import { useTraderAuth } from "@/stores/auth";
import { formatAmount } from "@/lib/utils";
import {
  Loader2,
  Search,
  ArrowUpDown,
  SlidersHorizontal,
  X,
  CreditCard,
  Smartphone,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Building2,
  Calendar,
  Eye,
  MessageSquare,
  ChevronRight,
  Filter,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Функция для получения квадратных SVG логотипов банков
const getBankIcon = (bankType: string, size: "sm" | "md" = "md") => {
  const bankLogos: Record<string, string> = {
    SBERBANK: "/bank-logos/sberbank.svg",
    TBANK: "/bank-logos/tbank.svg",
    TINK: "/bank-logos/tbank.svg", // Map TINK to TBANK logo
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
    OTPBANK: "/bank-logos/otpbank.svg",
    OTP: "/bank-logos/otpbank.svg", // Map OTP to OTPBANK logo
  };

  const logoPath = bankLogos[bankType] || bankLogos[bankType?.toUpperCase()];
  const sizeClasses = size === "sm" ? "w-8 h-8" : "w-10 h-10";

  if (logoPath) {
    return (
      <div
        className={`${sizeClasses} rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center p-1`}
      >
        <img
          src={logoPath}
          alt={bankType}
          className="w-full h-full object-contain"
          onError={(e) => {
            e.currentTarget.style.display = "none";
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
    <div
      className={`${sizeClasses} rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center`}
    >
      <CreditCard className="w-5 h-5 text-gray-600" />
    </div>
  );
};

interface BtRequisite {
  id: string;
  cardNumber: string;
  bankType: string;
  recipientName: string;
  isActive: boolean;
  btOnly: boolean;
  createdAt: string;
  merchant: {
    id: string;
    name: string;
  };
}

interface BtDevice {
  id: string;
  name: string;
  status: string;
  lastSeen: string;
  btOnly: boolean;
  createdAt: string;
}

const btRequisiteStatusConfig = {
  ACTIVE: {
    label: "Активен",
    description: "Реквизит активен",
    color: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    badgeColor: "bg-green-50 text-green-700 border-green-200",
    icon: CheckCircle
  },
  INACTIVE: {
    label: "Неактивен",
    description: "Реквизит неактивен",
    color: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600",
    badgeColor: "bg-gray-50 text-gray-700 border-gray-200",
    icon: Ban
  },
  BLOCKED: {
    label: "Заблокирован",
    description: "Реквизит заблокирован",
    color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    badgeColor: "bg-red-50 text-red-700 border-red-200",
    icon: XCircle
  }
};

const btDeviceStatusConfig = {
  ONLINE: {
    label: "Онлайн",
    description: "Устройство онлайн",
    color: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    badgeColor: "bg-green-50 text-green-700 border-green-200",
    icon: CheckCircle
  },
  OFFLINE: {
    label: "Оффлайн",
    description: "Устройство оффлайн",
    color: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600",
    badgeColor: "bg-gray-50 text-gray-700 border-gray-200",
    icon: Ban
  },
  ERROR: {
    label: "Ошибка",
    description: "Ошибка устройства",
    color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    badgeColor: "bg-red-50 text-red-700 border-red-200",
    icon: XCircle
  }
};

// Format card number function
const formatCardNumber = (cardNumber: string) => {
  if (!cardNumber) return "****";
  return cardNumber.replace(/(\d{4})(\d{2})(\d+)(\d{4})/, "$1 $2** **** $4");
};

interface BtEntranceListProps {}

export function BtEntranceList() {
  const { user } = useTraderAuth();
  const [requisites, setRequisites] = useState<BtRequisite[]>([]);
  const [devices, setDevices] = useState<BtDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("requisites");
  const [showRequisitesSheet, setShowRequisitesSheet] = useState(false);

  // Filters for requisites
  const [showFilters, setShowFilters] = useState(false);
  const [filterMerchant, setFilterMerchant] = useState("");
  const [filterBank, setFilterBank] = useState("");
  const [filterDateRange, setFilterDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  const [sortBy, setSortBy] = useState("date_desc");

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterMerchant("");
    setFilterBank("");
    setFilterDateRange({ from: undefined, to: undefined });
    setSortBy("date_desc");
    setSearchQuery("");
  };

  useEffect(() => {
    fetchData();
  }, [filterStatus, activeTab]);

  // Reset filters when switching tabs
  useEffect(() => {
    setFilterStatus("all");
    setSearchQuery("");
    setFilterMerchant("");
    setFilterBank("");
    setFilterDateRange({ from: undefined, to: undefined });
    setSortBy("date_desc");
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === "requisites") {
        await fetchRequisites();
      } else {
        await fetchDevices();
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  };

  const fetchRequisites = async () => {
    const params: any = { btOnly: true };
    if (filterStatus !== "all") {
      params.status = filterStatus;
    }

    try {
      const response = await traderApi.getBtRequisites(params);
      setRequisites(response.data || []);
    } catch (error) {
      console.error("Failed to fetch BT requisites:", error);
      // Fallback to mock data for development
      setRequisites([
        {
          id: "1",
          cardNumber: "4111111111111111",
          bankType: "SBERBANK",
          recipientName: "Иван Петров",
          isActive: true,
          btOnly: true,
          createdAt: new Date().toISOString(),
          merchant: {
            id: "1",
            name: "Тест Мерчант"
          }
        }
      ]);
    }
  };

  const fetchDevices = async () => {
    const params: any = { btOnly: true };
    if (filterStatus !== "all") {
      params.status = filterStatus;
    }

    try {
      const response = await traderApi.getBtDevices(params);
      setDevices(response.data || []);
    } catch (error) {
      console.error("Failed to fetch BT devices:", error);
      // Fallback to mock data for development
      setDevices([
        {
          id: "1",
          name: "BT Device 1",
          status: "ONLINE",
          lastSeen: new Date().toISOString(),
          btOnly: true,
          createdAt: new Date().toISOString()
        }
      ]);
    }
  };

  const getFilteredRequisites = () => {
    let filtered = requisites;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(req => 
        req.cardNumber.includes(searchQuery) ||
        req.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.merchant.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(r => {
        const status = r.isActive ? "ACTIVE" : "INACTIVE";
        return status === filterStatus;
      });
    }

    // Merchant filter
    if (filterMerchant) {
      filtered = filtered.filter(r => 
        r.merchant.name.toLowerCase().includes(filterMerchant.toLowerCase())
      );
    }

    // Bank filter
    if (filterBank) {
      filtered = filtered.filter(r => r.bankType === filterBank);
    }

    // Date range filter
    if (filterDateRange.from || filterDateRange.to) {
      filtered = filtered.filter(r => {
        const reqDate = new Date(r.createdAt);
        if (filterDateRange.from && reqDate < filterDateRange.from) return false;
        if (filterDateRange.to && reqDate > filterDateRange.to) return false;
        return true;
      });
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "date_asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "date_desc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "name_asc":
          return a.recipientName.localeCompare(b.recipientName);
        case "name_desc":
          return b.recipientName.localeCompare(a.recipientName);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const getFilteredDevices = () => {
    let filtered = devices;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(device => 
        device.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(d => d.status === filterStatus);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "date_asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "date_desc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredRequisites = getFilteredRequisites();
  const filteredDevices = getFilteredDevices();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">БТ-Вход</h1>
          <p className="text-gray-600 mt-2">
            Реквизиты и устройства для БТ-входа (без привязки к основным устройствам)
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === "requisites" ? (
            <Button onClick={() => setShowRequisitesSheet(true)}>
              <CreditCard className="h-4 w-4 mr-2" />
              Добавить реквизит
            </Button>
          ) : (
            <Button onClick={() => toast.info("Функция добавления устройств в разработке")}>
              <Smartphone className="h-4 w-4 mr-2" />
              Добавить устройство
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Status Filter */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full lg:w-[200px]">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              {activeTab === "requisites" ? (
                <>
                  <SelectItem value="ACTIVE">Активные</SelectItem>
                  <SelectItem value="INACTIVE">Неактивные</SelectItem>
                  <SelectItem value="BLOCKED">Заблокированные</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="ONLINE">Онлайн</SelectItem>
                  <SelectItem value="OFFLINE">Оффлайн</SelectItem>
                  <SelectItem value="ERROR">Ошибка</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={activeTab === "requisites" ? "Поиск по карте, имени, мерчанту..." : "Поиск по названию устройства..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full lg:w-[180px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Сначала новые</SelectItem>
              <SelectItem value="date_asc">Сначала старые</SelectItem>
              <SelectItem value="name_desc">По имени ↓</SelectItem>
              <SelectItem value="name_asc">По имени ↑</SelectItem>
            </SelectContent>
          </Select>

          {/* Filters Button - only for requisites */}
          {activeTab === "requisites" && (
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Фильтры
                  {(filterMerchant || filterBank || filterDateRange.from || filterDateRange.to) && (
                    <Badge className="ml-2" variant="secondary">
                      {[filterMerchant, filterBank, filterDateRange.from].filter(Boolean).length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Дополнительные фильтры</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Мерчант</Label>
                      <Input
                        placeholder="Название мерчанта"
                        value={filterMerchant}
                        onChange={(e) => setFilterMerchant(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Банк</Label>
                      <Select value={filterBank} onValueChange={setFilterBank}>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите банк" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Все банки</SelectItem>
                          <SelectItem value="SBERBANK">Сбербанк</SelectItem>
                          <SelectItem value="TBANK">Т-Банк</SelectItem>
                          <SelectItem value="VTB">ВТБ</SelectItem>
                          <SelectItem value="ALFABANK">Альфа-Банк</SelectItem>
                          <SelectItem value="RAIFFEISEN">Райффайзен</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">Период</Label>
                      <CustomCalendarPopover
                        dateRange={filterDateRange}
                        onDateRangeChange={setFilterDateRange}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearFilters}
                      className="flex-1"
                    >
                      Сбросить
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowFilters(false)}
                      className="flex-1"
                    >
                      Применить
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="requisites">
            Реквизиты БТ-входа ({requisites.length})
          </TabsTrigger>
          <TabsTrigger value="devices">
            Устройства БТ-входа ({devices.length})
          </TabsTrigger>
        </TabsList>

        {/* Requisites Tab */}
        <TabsContent value="requisites" className="space-y-3 mt-4">
          {filteredRequisites.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? "Реквизиты не найдены" : "Нет реквизитов для БТ-входа"}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredRequisites.map((requisite) => {
                const status = requisite.isActive ? "ACTIVE" : "INACTIVE";
                const statusConfig = btRequisiteStatusConfig[status as keyof typeof btRequisiteStatusConfig];
                const StatusIcon = statusConfig?.icon || CheckCircle;

                return (
                  <Card
                    key={requisite.id}
                    className="group hover:shadow-lg transition-all cursor-pointer border-gray-200 dark:border-gray-700"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        {/* Left section */}
                        <div className="flex items-start gap-4 flex-1">
                          {/* Status Icon */}
                          <div className={cn(
                            "p-3 rounded-xl",
                            statusConfig?.color?.split(" ")[0] || "bg-gray-100"
                          )}>
                            <StatusIcon className="h-6 w-6" />
                          </div>

                          {/* Requisite Info */}
                          <div className="flex-1 space-y-3">
                            {/* Status and Date */}
                            <div>
                              <h3 className="font-semibold text-base">
                                {statusConfig?.label || "Неизвестный статус"}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {format(new Date(requisite.createdAt), "d MMMM yyyy 'г.', 'в' HH:mm", { locale: ru })}
                              </p>
                            </div>

                            {/* Requisite Details */}
                            <div className="flex items-center gap-6">
                              {/* Bank and Card */}
                              <div className="flex items-center gap-3">
                                {getBankIcon(requisite.bankType, "sm")}
                                <div>
                                  <p className="text-sm font-medium">
                                    {formatCardNumber(requisite.cardNumber)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {requisite.recipientName || "Неизвестно"}
                                  </p>
                                </div>
                              </div>

                            </div>
                          </div>
                        </div>

                        {/* Right section - Status Badge */}
                        <div className="flex items-center gap-3">
                          <Badge 
                            className={cn(
                              "px-3 py-1.5",
                              statusConfig?.badgeColor || "bg-gray-50 text-gray-700 border-gray-200"
                            )}
                          >
                            {requisite.isActive ? 'Активен' : 'Неактивен'}
                          </Badge>
                        </div>
                      </div>

                      {/* Additional info */}
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <span className="text-sm text-muted-foreground">
                          БТ-реквизит
                        </span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">
                          Без привязки к устройству
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Devices Tab */}
        <TabsContent value="devices" className="space-y-3 mt-4">
          {filteredDevices.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? "Устройства не найдены" : "Нет устройств для БТ-входа"}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredDevices.map((device) => {
                const statusConfig = btDeviceStatusConfig[device.status as keyof typeof btDeviceStatusConfig];
                const StatusIcon = statusConfig?.icon || CheckCircle;

                return (
                  <Card
                    key={device.id}
                    className="group hover:shadow-lg transition-all cursor-pointer border-gray-200 dark:border-gray-700"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        {/* Left section */}
                        <div className="flex items-start gap-4 flex-1">
                          {/* Status Icon */}
                          <div className={cn(
                            "p-3 rounded-xl",
                            statusConfig?.color?.split(" ")[0] || "bg-gray-100"
                          )}>
                            <StatusIcon className="h-6 w-6" />
                          </div>

                          {/* Device Info */}
                          <div className="flex-1 space-y-3">
                            {/* Status and Date */}
                            <div>
                              <h3 className="font-semibold text-base">
                                {statusConfig?.label || "Неизвестный статус"}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                Последняя активность: {format(new Date(device.lastSeen), "d MMMM yyyy 'г.', 'в' HH:mm", { locale: ru })}
                              </p>
                            </div>

                            {/* Device Details */}
                            <div className="flex items-center gap-6">
                              {/* Device Name */}
                              <div className="flex items-center gap-2">
                                <Smartphone className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  {device.name}
                                </span>
                              </div>

                              {/* Created Date */}
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  {format(new Date(device.createdAt), "d MMM yyyy", { locale: ru })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right section - Status Badge */}
                        <div className="flex items-center gap-3">
                          <Badge 
                            className={cn(
                              "px-3 py-1.5",
                              statusConfig?.badgeColor || "bg-gray-50 text-gray-700 border-gray-200"
                            )}
                          >
                            {statusConfig?.label || device.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Additional info */}
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <span className="text-sm text-muted-foreground">
                          БТ-устройство
                        </span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">
                          Только для БТ-входа
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* BT Requisites Sheet */}
      <BtRequisitesSheet
        open={showRequisitesSheet}
        onOpenChange={setShowRequisitesSheet}
        onSuccess={() => {
          fetchRequisites();
        }}
      />
    </div>
  );
}