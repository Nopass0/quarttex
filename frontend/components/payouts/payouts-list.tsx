"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { traderApi } from "@/services/api";
import { toast } from "sonner";
import { useTraderAuth } from "@/stores/auth";
import { useRouter } from "next/navigation";
import { useTraderStore } from "@/stores/trader";
import { TraderHeader } from "@/components/trader/trader-header";
import {
  Loader2,
  MoreVertical,
  ChevronDown,
  Copy,
  Eye,
  MessageSquare,
  CreditCard,
  Smartphone,
  Clock,
  CheckCircle,
  X,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  DollarSign,
  Building2,
  SlidersHorizontal,
  CheckCircle2,
  Wallet,
  TrendingUp,
  Send,
  XCircle,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Payout {
  id: string;
  numericId: number;
  amount: number;
  currency: string;
  status: string;
  method: string;
  recipientName?: string;
  cardNumber?: string;
  walletAddress?: string;
  bankType?: string;
  createdAt: string;
  completedAt?: string;
  transactionHash?: string;
  commission?: number;
}

interface PayoutDetails extends Payout {
  uuid: string;
  disputeFiles?: string[];
  disputeMessage?: string;
  cancelReason?: string;
  proofFiles?: string[];
}

const statusConfig = {
  PENDING: {
    label: "Ожидает",
    color: "bg-blue-50 text-blue-600 border-blue-200",
  },
  PROCESSING: {
    label: "В обработке",
    color: "bg-blue-50 text-blue-600 border-blue-200",
  },
  COMPLETED: {
    label: "Выполнено",
    color: "bg-green-50 text-green-600 border-green-200",
  },
  FAILED: {
    label: "Ошибка",
    color: "bg-red-50 text-red-600 border-red-200",
  },
  CANCELLED: {
    label: "Отменено",
    color: "bg-gray-50 text-gray-600 border-gray-200",
  },
};

export function PayoutsList() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [selectedPayoutDetails, setSelectedPayoutDetails] = useState<PayoutDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAmount, setFilterAmount] = useState({
    exact: "",
    min: "",
    max: "",
  });
  const [filterAmountType, setFilterAmountType] = useState("range");
  const [filterMethod, setFilterMethod] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showAutoRefresh, setShowAutoRefresh] = useState(false);
  const [period, setPeriod] = useState("24h");
  const [stats, setStats] = useState({
    totalPayouts: 0,
    totalAmount: 0,
    profit: 0,
    currency: "USDT",
  });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const router = useRouter();
  const setFinancials = useTraderStore((state) => state.setFinancials);
  const financials = useTraderStore((state) => state.financials);

  const allStatuses = [
    "Все",
    "Активные",
    "Проверка",
    "Финализация",
    "История",
    "Отменённые",
  ];

  useEffect(() => {
    fetchPayouts();
  }, [page]);

  useEffect(() => {
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      if (page === 1) {
        fetchPayouts();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [page]);

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 100
      ) {
        if (!loadingMore && hasMore) {
          handleLoadMore();
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loadingMore, hasMore]);

  const fetchPayouts = async () => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const limit = 10;
      const offset = (page - 1) * limit;
      
      const response = await traderApi.get("/api/trader/payouts", {
        params: {
          limit,
          offset,
          status: filterStatus !== "all" ? filterStatus : undefined,
          search: searchQuery || undefined,
        },
      });

      if (response.data.success) {
        const newPayouts = response.data.payouts.map((p: any) => ({
          id: p.id || p.uuid, // Use numeric ID for display, UUID for API calls
          numericId: p.numericId || p.id,
          amount: p.amount,
          currency: "RUB", // Payouts are in RUB
          status: p.status,
          method: p.isCard ? "card" : "wallet",
          recipientName: p.bank?.split(" - ")[1], // Extract name from bank field
          cardNumber: p.isCard ? p.wallet : undefined,
          walletAddress: !p.isCard ? p.wallet : undefined,
          bankType: p.bank?.split(" - ")[0], // Extract bank type
          createdAt: p.createdAt,
          completedAt: p.confirmedAt,
          commission: p.totalUsdt - p.amountUsdt, // Calculate commission
        }));

        if (page === 1) {
          setPayouts(newPayouts);

          // Calculate stats
          const completed = newPayouts.filter((p: Payout) => p.status === "COMPLETED");
          const totalAmount = completed.reduce((sum: number, p: Payout) => sum + p.amount, 0);
          const totalCommission = completed.reduce(
            (sum: number, p: Payout) => sum + (p.commission || 0),
            0,
          );

          setStats({
            totalPayouts: completed.length,
            totalAmount: totalAmount,
            profit: totalCommission,
            currency: "RUB",
          });
        } else {
          setPayouts((prev) => [...prev, ...newPayouts]);
        }

        setHasMore(newPayouts.length === limit);
      }
    } catch (error) {
      console.error("Error fetching payouts:", error);
      toast.error("Не удалось загрузить выплаты");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  const fetchPayoutDetails = async (payout: Payout) => {
    try {
      setLoadingDetails(true);
      const response = await traderApi.get(`/api/trader/payouts/${payout.id}`);
      if (response.data.success) {
        setSelectedPayoutDetails(response.data.payout);
      }
    } catch (error) {
      console.error("Error fetching payout details:", error);
      toast.error("Не удалось загрузить детали выплаты");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handlePayoutClick = (payout: Payout) => {
    setSelectedPayout(payout);
    fetchPayoutDetails(payout);
  };

  const filteredAndSortedPayouts = payouts
    .filter((payout) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !payout.id.toLowerCase().includes(query) &&
          !payout.numericId.toString().includes(query) &&
          !payout.recipientName?.toLowerCase().includes(query) &&
          !payout.cardNumber?.includes(query) &&
          !payout.walletAddress?.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Status filter
      if (filterStatus !== "all" && payout.status !== filterStatus)
        return false;

      // Method filter
      if (filterMethod !== "all" && payout.method !== filterMethod)
        return false;

      // Amount filter
      if (filterAmountType === "exact" && filterAmount.exact) {
        if (payout.amount !== parseFloat(filterAmount.exact)) return false;
      } else {
        if (filterAmount.min && payout.amount < parseFloat(filterAmount.min))
          return false;
        if (filterAmount.max && payout.amount > parseFloat(filterAmount.max))
          return false;
      }

      // Date filter
      if (
        filterDateFrom &&
        new Date(payout.createdAt) < new Date(filterDateFrom)
      )
        return false;
      if (filterDateTo && new Date(payout.createdAt) > new Date(filterDateTo))
        return false;

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "amount_desc":
          return b.amount - a.amount;
        case "amount_asc":
          return a.amount - b.amount;
        case "newest":
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });

  const activeFiltersCount = [
    filterStatus !== "all" && 1,
    filterMethod !== "all" && 1,
    (filterAmount.min || filterAmount.max || filterAmount.exact) && 1,
    (filterDateFrom || filterDateTo) && 1,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterMethod("all");
    setFilterAmount({ exact: "", min: "", max: "" });
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const periodLabels = {
    today: "за сегодня",
    "24h": "за 24 часа",
    week: "за неделю",
    month: "за месяц",
    year: "за год",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#006039]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Выплаты</h1>
        <TraderHeader />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-[#006039]" />
              <span className="text-sm text-gray-500 uppercase">Выплаты</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1">
                  <span className="text-xs">
                    Период: {periodLabels[period]}
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setPeriod("today")}>
                  за сегодня
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPeriod("24h")}>
                  за 24 часа
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPeriod("week")}>
                  за неделю
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPeriod("month")}>
                  за месяц
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPeriod("year")}>
                  за год
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">
              {stats.totalAmount > 0
                ? `${stats.totalAmount.toFixed(2)} ${stats.currency}`
                : "Нет данных"}
            </p>
            <p className="text-sm text-gray-500">
              {stats.totalPayouts}{" "}
              {stats.totalPayouts === 1 ? "выплата" : "выплат"}
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#006039]" />
              <span className="text-sm text-gray-500 uppercase">Прибыль</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1">
                  <span className="text-xs">
                    Период: {periodLabels[period]}
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setPeriod("today")}>
                  за сегодня
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPeriod("24h")}>
                  за 24 часа
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPeriod("week")}>
                  за неделю
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPeriod("month")}>
                  за месяц
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPeriod("year")}>
                  за год
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">
              {stats.profit > 0
                ? `${stats.profit.toFixed(2)} ${stats.currency}`
                : "Нет данных"}
            </p>
            <p className="text-sm text-gray-500">Комиссия с выплат</p>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Поиск по ID, получателю или реквизитам"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">Фильтры</span>
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Фильтры</h4>
                    {activeFiltersCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="h-8 px-2 text-xs"
                      >
                        Сбросить
                      </Button>
                    )}
                  </div>

                  {/* Status Filter */}
                  <div>
                    <Label className="text-sm">Статус</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between mt-1"
                        >
                          <span>
                            {filterStatus === "all"
                              ? "Все статусы"
                              : statusConfig[filterStatus]?.label}
                          </span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full">
                        <DropdownMenuItem
                          onClick={() => setFilterStatus("all")}
                        >
                          Все статусы
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {Object.entries(statusConfig).map(([key, config]) => (
                          <DropdownMenuItem
                            key={key}
                            onClick={() => setFilterStatus(key)}
                          >
                            {config.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Method Filter */}
                  <div>
                    <Label className="text-sm">Метод</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between mt-1"
                        >
                          <span>
                            {filterMethod === "all"
                              ? "Все методы"
                              : filterMethod === "card"
                                ? "На карту"
                                : "На кошелек"}
                          </span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full">
                        <DropdownMenuItem
                          onClick={() => setFilterMethod("all")}
                        >
                          Все методы
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setFilterMethod("card")}
                        >
                          На карту
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setFilterMethod("wallet")}
                        >
                          На кошелек
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Amount Filter */}
                  <div>
                    <Label className="text-sm">Сумма</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="number"
                        placeholder="От"
                        value={filterAmount.min}
                        onChange={(e) =>
                          setFilterAmount({
                            ...filterAmount,
                            min: e.target.value,
                          })
                        }
                      />
                      <Input
                        type="number"
                        placeholder="До"
                        value={filterAmount.max}
                        onChange={(e) =>
                          setFilterAmount({
                            ...filterAmount,
                            max: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Date Filter */}
                  <div>
                    <Label className="text-sm">Период</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                      />
                      <Input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {sortBy === "newest"
                      ? "Сначала новые"
                      : sortBy === "oldest"
                        ? "Сначала старые"
                        : sortBy === "amount_desc"
                          ? "Сумма ↓"
                          : "Сумма ↑"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy("newest")}>
                  Сначала новые
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("oldest")}>
                  Сначала старые
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("amount_desc")}>
                  Сумма по убыванию
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("amount_asc")}>
                  Сумма по возрастанию
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>

      {/* Payouts List */}
      <div className="space-y-4">
        {filteredAndSortedPayouts.length === 0 ? (
          <Card className="p-12 text-center">
            <Send className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Выплаты не найдены</p>
          </Card>
        ) : (
          <>
            {filteredAndSortedPayouts.map((payout) => (
              <Card
                key={payout.id}
                className="p-6 hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => handlePayoutClick(payout)}
              >
                <div className="flex items-start justify-between">
                  {/* Left Section */}
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center",
                        payout.status === "COMPLETED"
                          ? "bg-green-100"
                          : payout.status === "PROCESSING"
                            ? "bg-blue-100"
                            : payout.status === "PENDING"
                              ? "bg-yellow-100"
                              : "bg-red-100",
                      )}
                    >
                      {payout.method === "card" ? (
                        <CreditCard
                          className={cn(
                            "h-6 w-6",
                            payout.status === "COMPLETED"
                              ? "text-green-600"
                              : payout.status === "PROCESSING"
                                ? "text-blue-600"
                                : payout.status === "PENDING"
                                  ? "text-yellow-600"
                                  : "text-red-600",
                          )}
                        />
                      ) : (
                        <Wallet
                          className={cn(
                            "h-6 w-6",
                            payout.status === "COMPLETED"
                              ? "text-green-600"
                              : payout.status === "PROCESSING"
                                ? "text-blue-600"
                                : payout.status === "PENDING"
                                  ? "text-yellow-600"
                                  : "text-red-600",
                          )}
                        />
                      )}
                    </div>

                    {/* Details */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">
                          Выплата ${payout.numericId}
                        </h3>
                        <Badge
                          className={cn(
                            "border",
                            statusConfig[payout.status]?.color,
                          )}
                        >
                          {statusConfig[payout.status]?.label}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {payout.method === "card" ? (
                          <>
                            <span>{payout.cardNumber}</span>
                            <span>•</span>
                            <span>{payout.recipientName}</span>
                          </>
                        ) : (
                          <span className="font-mono">
                            {payout.walletAddress}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>
                          {format(
                            new Date(payout.createdAt),
                            "d MMMM yyyy 'в' HH:mm",
                            { locale: ru },
                          )}
                        </span>
                        {payout.completedAt && (
                          <>
                            <span>•</span>
                            <span className="text-green-600">
                              Завершено{" "}
                              {format(
                                new Date(payout.completedAt),
                                "d MMMM 'в' HH:mm",
                                { locale: ru },
                              )}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Section */}
                  <div className="text-right space-y-2">
                    <div className="text-2xl font-bold">
                      {payout.amount.toFixed(2)} {payout.currency}
                    </div>
                    <div className="text-sm text-gray-500">
                      ≈ {(payout.amount * 100).toFixed(0)} RUB
                    </div>
                    {payout.commission && (
                      <div className="text-xs text-gray-500">
                        Комиссия: {payout.commission.toFixed(2)}{" "}
                        {payout.currency}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}

            {/* Loading more indicator */}
            {loadingMore && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-[#006039]" />
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  Загрузка...
                </span>
              </div>
            )}

            {/* Count */}
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-4">
              Найдено {payouts.length} записей
            </div>
          </>
        )}
      </div>

      {/* Payout Details Dialog */}
      <Dialog
        open={!!selectedPayout}
        onOpenChange={() => {
          setSelectedPayout(null);
          setSelectedPayoutDetails(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Детали выплаты ${selectedPayout?.numericId}
            </DialogTitle>
            <DialogDescription>
              Информация о выплате от{" "}
              {selectedPayout &&
                format(
                  new Date(selectedPayout.createdAt),
                  "d MMMM yyyy 'в' HH:mm",
                  { locale: ru },
                )}
            </DialogDescription>
          </DialogHeader>

          {selectedPayout && (
            <div className="space-y-6">
              {/* Status and Amount */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge
                    className={cn(
                      "border",
                      statusConfig[selectedPayout.status]?.color,
                    )}
                  >
                    {statusConfig[selectedPayout.status]?.label}
                  </Badge>
                  {selectedPayout.transactionHash && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FileText className="h-4 w-4" />
                      <span className="font-mono">
                        {selectedPayout.transactionHash}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold">
                  {selectedPayout.amount.toFixed(2)} {selectedPayout.currency}
                </div>
              </div>

              {/* Recipient Details */}
              <div className="space-y-4">
                <h4 className="font-medium">Получатель</h4>
                <div className="space-y-3">
                  {selectedPayout.method === "card" ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          Номер карты
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">
                            {selectedPayout.cardNumber}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(
                                selectedPayout.cardNumber || "",
                              );
                              toast.success("Номер карты скопирован");
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          Имя получателя
                        </span>
                        <span>{selectedPayout.recipientName}</span>
                      </div>
                      {selectedPayout.bankType && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Банк</span>
                          <span>{selectedPayout.bankType}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        Адрес кошелька
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {selectedPayout.walletAddress}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(
                              selectedPayout.walletAddress || "",
                            );
                            toast.success("Адрес кошелька скопирован");
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Details */}
              <div className="space-y-4">
                <h4 className="font-medium">Финансовая информация</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Сумма</span>
                    <span className="font-medium">
                      {selectedPayout.amount.toFixed(2)}{" "}
                      {selectedPayout.currency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Курс</span>
                    <span>1 {selectedPayout.currency} = 100 RUB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Сумма в рублях
                    </span>
                    <span>{(selectedPayout.amount * 100).toFixed(2)} RUB</span>
                  </div>
                  {selectedPayout.commission && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Комиссия</span>
                      <span>
                        {selectedPayout.commission.toFixed(2)}{" "}
                        {selectedPayout.currency}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dispute Information */}
              {loadingDetails ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                selectedPayoutDetails && (
                  <>
                    {/* Cancel Reason */}
                    {selectedPayoutDetails.cancelReason && (
                      <div className="space-y-4">
                        <h4 className="font-medium">Причина отмены</h4>
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="space-y-2">
                              <p className="text-sm">{selectedPayoutDetails.cancelReason}</p>
                              {selectedPayoutDetails.disputeMessage && (
                                <p className="text-sm text-gray-600">
                                  Сообщение: {selectedPayoutDetails.disputeMessage}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Dispute Files from Previous Traders */}
                    {selectedPayoutDetails.disputeFiles && selectedPayoutDetails.disputeFiles.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="font-medium">Файлы от предыдущих трейдеров</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {selectedPayoutDetails.disputeFiles.map((file, index) => (
                            <a
                              key={index}
                              href={file}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <FileText className="h-5 w-5 text-gray-500" />
                              <span className="text-sm truncate">
                                Файл {index + 1}
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Proof Files */}
                    {selectedPayoutDetails.proofFiles && selectedPayoutDetails.proofFiles.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="font-medium">Подтверждающие документы</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {selectedPayoutDetails.proofFiles.map((file, index) => (
                            <a
                              key={index}
                              href={file}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <FileText className="h-5 w-5 text-green-600" />
                              <span className="text-sm truncate">
                                Документ {index + 1}
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )
              )}

              {/* Timeline */}
              <div className="space-y-4">
                <h4 className="font-medium">История</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mt-1.5" />
                    <div>
                      <p className="text-sm font-medium">Создана</p>
                      <p className="text-sm text-gray-600">
                        {format(
                          new Date(selectedPayout.createdAt),
                          "d MMMM yyyy 'в' HH:mm:ss",
                          { locale: ru },
                        )}
                      </p>
                    </div>
                  </div>
                  {selectedPayout.status === "PROCESSING" && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
                      <div>
                        <p className="text-sm font-medium">В обработке</p>
                        <p className="text-sm text-gray-600">
                          Ожидает подтверждения
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedPayout.completedAt && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5" />
                      <div>
                        <p className="text-sm font-medium">Завершена</p>
                        <p className="text-sm text-gray-600">
                          {format(
                            new Date(selectedPayout.completedAt),
                            "d MMMM yyyy 'в' HH:mm:ss",
                            { locale: ru },
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
