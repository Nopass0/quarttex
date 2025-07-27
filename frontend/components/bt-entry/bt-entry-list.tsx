"use client";

import { useState, useEffect } from "react";
import "./bt-entry-list.css";
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
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
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
import { RequisitesListDialog } from "./requisites-list-dialog";
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
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RequisiteInfoModal } from "@/components/requisites/requisite-info-modal";
import { CustomCalendarPopover } from "@/components/ui/custom-calendar-popover";

// Функция для получения квадратных SVG логотипов банков
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

interface Transaction {
  id: string;
  numericId: number;
  amount: number;
  currency: string | null;
  status: string;
  clientName: string;
  assetOrBank: string;
  createdAt: string;
  acceptedAt: string | null;
  expired_at: string;
  isNew?: boolean;
  rate?: number | null;
  frozenUsdtAmount?: number | null;
  calculatedCommission?: number | null;
  deviceId?: string;
  merchant?: {
    id: string;
    name: string;
  };
  method?: {
    id: string;
    name: string;
    type: string;
  };
  requisites?: {
    id: string;
    recipientName: string;
    cardNumber: string;
    bankType: string;
  } | null;
  receipts?: Array<{
    id: string;
    fileName: string;
    isChecked: boolean;
    isFake: boolean;
  }>;
}

const statusConfig = {
  CREATED: {
    label: "Ожидает",
    color: "bg-blue-50 text-blue-600 border-blue-200",
  },
  IN_PROGRESS: {
    label: "В работе",
    color: "bg-blue-50 text-blue-600 border-blue-200",
  },
  READY: {
    label: "Выполнено",
    color: "bg-purple-50 text-purple-600 border-purple-200",
  },
  EXPIRED: { label: "Истекло", color: "bg-red-50 text-red-600 border-red-200" },
  CANCELED: {
    label: "Отменено",
    color: "bg-gray-50 text-gray-600 border-gray-200",
  },
};

// Function to format remaining time
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

export function BtEntryList() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAmount, setFilterAmount] = useState({
    exact: "",
    min: "",
    max: "",
  });
  const [filterAmountType, setFilterAmountType] = useState("range");
  const [filterRequisite, setFilterRequisite] = useState("all");
  const [filterMethod, setFilterMethod] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>();
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [, forceUpdate] = useState(0); // Force component re-render for countdown
  const [requisitesDialogOpen, setRequisitesDialogOpen] = useState(false);
  const [showRequisiteDetails, setShowRequisiteDetails] = useState(false);
  const [showRequisiteInfoModal, setShowRequisiteInfoModal] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [period, setPeriod] = useState("today"); // Period filter

  // Real data for filters
  const [requisites, setRequisites] = useState<any[]>([]);
  const [methods, setMethods] = useState<any[]>([]);
  const [requisiteSearch, setRequisiteSearch] = useState("");
  const [methodSearch, setMethodSearch] = useState("");

  const router = useRouter();
  const setFinancials = useTraderStore((state) => state.setFinancials);
  const financials = useTraderStore((state) => state.financials);

  const confirmPayment = async (transactionId: string) => {
    try {
      await traderApi.updateTransactionStatus(transactionId, "READY");
      toast.success("Платеж подтвержден");

      // Update the transaction status locally
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === transactionId ? { ...tx, status: "READY" } : tx,
        ),
      );

      setSelectedTransaction(null);

      // Refresh both transactions and profile to update profit
      await Promise.all([fetchTransactions(), fetchTraderProfile()]);
    } catch (error) {
      toast.error("Не удалось подтвердить платеж");
    }
  };

  const manualCloseTransaction = async (transactionId: string) => {
    try {
      await traderApi.updateTransactionStatus(transactionId, "COMPLETED");
      toast.success("Сделка закрыта вручную");

      // Update the transaction status locally
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === transactionId ? { ...tx, status: "COMPLETED" } : tx,
        ),
      );

      setSelectedTransaction(null);

      // Refresh both transactions and profile to update profit
      await Promise.all([fetchTransactions(), fetchTraderProfile()]);
    } catch (error) {
      toast.error("Не удалось закрыть сделку");
    }
  };

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 100
      ) {
        if (!loadingMore && hasMore) {
          setLoadingMore(true);
          const nextPage = page + 1;
          setPage(nextPage);
          fetchTransactions(nextPage, true);
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loadingMore, hasMore, page]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (mounted) {
        await Promise.all([
          fetchTransactions(),
          fetchTraderProfile(),
          fetchRequisites(),
          fetchMethods(),
        ]);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []); // Only run on mount

  // Set up polling for real-time updates
  useEffect(() => {
    const interval = setInterval(async () => {
      // Only fetch first page if not already loading
      if (!loading && !loadingMore) {
        try {
          const params: any = {
            page: 1,
            limit: 50,
          };

          const response = await traderApi.getTransactions(params);
          let newData = response.data || response.transactions || [];
          
          // Filter only transactions without devices for BT-entry
          newData = newData.filter((tx: any) => {
            return !tx.deviceId || tx.deviceId === null;
          });
          
          setTransactions((currentTransactions) => {
            const existingIds = new Set(currentTransactions.map((t) => t.id));
            const newTransactions = newData.filter((tx: Transaction) => !existingIds.has(tx.id));
            
            if (newTransactions.length > 0) {
              // Show notifications for new transactions
              newTransactions.forEach((tx: Transaction) => {
                toast.success(`Новая сделка ${tx.numericId}`, {
                  description: `${tx.amount.toLocaleString("ru-RU")} ₽ от ${tx.clientName}`,
                });
              });
              
              // Add new transactions to the beginning of the list
              return [...newTransactions, ...currentTransactions];
            }
            
            return currentTransactions;
          });

          // Also update trader profile to refresh profit
          await fetchTraderProfile();
        } catch (error) {
          console.error("Failed to poll transactions:", error);
        }
      }
    }, 5000); // Check every 5 seconds for real-time updates

    return () => clearInterval(interval);
  }, [loading, loadingMore]);

  // Timer for countdown update - only update if there are pending transactions
  useEffect(() => {
    const hasPendingTransactions = transactions.some(
      (t) => t.status === "CREATED" || t.status === "IN_PROGRESS",
    );

    if (hasPendingTransactions) {
      const timer = setInterval(() => {
        forceUpdate((prev) => prev + 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [transactions]);

  // Refetch when filters change
  useEffect(() => {
    if (!loading) {
      setPage(1);
      fetchTransactions(1, false);
    }
  }, [
    filterStatus,
    filterRequisite,
    filterMethod,
    filterAmount,
    filterDateFrom,
    filterDateTo,
  ]);

  const fetchTransactions = async (pageNum = 1, append = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      // Build query parameters with filters
      const params: any = {
        page: pageNum,
        limit: 50,
      };

      // Add status filter
      if (filterStatus !== "all") {
        switch (filterStatus) {
          case "not_credited":
            params.status = ["CREATED", "EXPIRED", "CANCELED"];
            break;
          case "credited":
            params.status = "READY";
            break;
          case "in_progress":
            params.status = "IN_PROGRESS";
            break;
        }
      }


      // Add requisite filter
      if (filterRequisite !== "all") {
        params.requisiteId = filterRequisite;
      }

      // Add method filter
      if (filterMethod !== "all") {
        params.methodId = filterMethod;
      }

      // Add amount filters
      if (filterAmountType === "exact" && filterAmount.exact) {
        params.amount = parseFloat(filterAmount.exact);
      } else if (filterAmountType === "range") {
        if (filterAmount.min) {
          params.amountMin = parseFloat(filterAmount.min);
        }
        if (filterAmount.max) {
          params.amountMax = parseFloat(filterAmount.max);
        }
      }

      // Add date filters
      if (filterDateFrom) {
        params.dateFrom = filterDateFrom.toISOString().split("T")[0];
      }
      if (filterDateTo) {
        params.dateTo = filterDateTo.toISOString().split("T")[0];
      }

      // Add search query
      if (searchQuery) {
        params.search = searchQuery;
      }

      const response = await traderApi.getTransactions(params);
      console.log("[BtEntryList] API Response:", response);
      console.log("[BtEntryList] Params sent:", params);
      // Handle both response formats
      let txData = response.data || response.transactions || [];
      
      // Filter only transactions without devices for BT-entry
      // Check first transaction to understand structure
      if (txData.length > 0) {
        console.log("[BtEntryList] Sample transaction:", txData[0]);
      }
      
      // Filter transactions where the requisite has no device
      txData = txData.filter((tx: any) => {
        // Check if the transaction has no deviceId (which comes from requisites.device)
        return !tx.deviceId || tx.deviceId === null;
      });
      
      const hasMoreData = txData.length === 50; // If we get full page, there might be more

      console.log("[BtEntryList] All transactions:", response.data?.length || response.transactions?.length || 0);
      console.log("[BtEntryList] Filtered (no device):", txData.length, "items");
      
      // Also log if we have no transactions at all
      if (!response.data || response.data.length === 0) {
        console.log("[BtEntryList] No transactions received from API");
      }

      // Mark new transactions using callback to get current state
      setTransactions((currentTransactions) => {
        const existingIds = new Set(currentTransactions.map((t) => t.id));
        const newTransactions: Transaction[] = [];

        const newData = txData.map((tx: Transaction) => {
          if (!existingIds.has(tx.id) && !loading && append) {
            // New transaction - mark it and show toast
            newTransactions.push(tx);
            return { ...tx, isNew: true };
          }
          return { ...tx, isNew: false };
        });

        // Show toast for new transactions
        if (newTransactions.length > 0 && !loading && append && pageNum === 1) {
          newTransactions.forEach((tx) => {
            toast.success(`Новая сделка ${tx.numericId}`, {
              description: `${tx.amount.toLocaleString("ru-RU")} ₽ от ${tx.clientName}`,
            });
          });

          // Remove "new" flag after animation
          setTimeout(() => {
            setTransactions((prev) =>
              prev.map((tx) => ({ ...tx, isNew: false })),
            );
          }, 500);
        }

        // Sort transactions by createdAt to show newest first
        const sortedData = [...newData].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        return append ? [...currentTransactions, ...sortedData] : sortedData;
      });

      setHasMore(hasMoreData);
      console.log("[BtEntryList] Transactions set in state");
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      if (loading) {
        toast.error("Не удалось загрузить сделки");
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchTraderProfile = async () => {
    try {
      const response = await traderApi.getProfile();

      // Update financials in store
      if (response) {
        const {
          trustBalance,
          profitFromDeals,
          profitFromPayouts,
          frozenUsdt,
          frozenRub,
          balanceUsdt,
          balanceRub,
          deposit,
        } = response;
        setFinancials({
          trustBalance: trustBalance || 0,
          profitFromDeals: profitFromDeals || 0,
          profitFromPayouts: profitFromPayouts || 0,
          frozenUsdt: frozenUsdt || 0,
          frozenRub: frozenRub || 0,
          balanceUsdt: balanceUsdt || 0,
          balanceRub: balanceRub || 0,
          deposit: deposit || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    }
  };


  const fetchRequisites = async () => {
    try {
      const response = await traderApi.getRequisites();
      setRequisites(response.requisites || response || []);
    } catch (error) {
      console.error("Failed to fetch requisites:", error);
    }
  };

  const fetchMethods = async () => {
    try {
      const response = await traderApi.getMethods();
      setMethods(response.methods || response || []);
    } catch (error) {
      console.error("Failed to fetch methods:", error);
    }
  };

  const getFilteredTransactions = () => {
    let filtered = transactions;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((t) => {
        // Calculate USDT amount for search
        const usdtAmount = t.frozenUsdtAmount
          ? t.frozenUsdtAmount
          : t.rate
            ? t.amount / t.rate
            : t.amount / 95;

        return (
          t.numericId.toString().includes(searchQuery) ||
          t.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.requisites?.bankType || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (t.merchant?.name || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (t.requisites?.cardNumber || "").includes(searchQuery) ||
          (t.requisites?.recipientName || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          t.amount.toString().includes(searchQuery) || // Search by RUB amount
          usdtAmount.toFixed(2).includes(searchQuery) || // Search by USDT amount
          Math.round(usdtAmount).toString().includes(searchQuery) // Search by rounded USDT
        );
      });
    }

    // Status filter
    if (filterStatus !== "all") {
      switch (filterStatus) {
        case "not_credited":
          filtered = filtered.filter(
            (t) =>
              t.status === "CREATED" ||
              t.status === "EXPIRED" ||
              t.status === "CANCELED",
          );
          break;
        case "credited":
          filtered = filtered.filter((t) => t.status === "READY");
          break;
        case "in_progress":
          filtered = filtered.filter((t) => t.status === "IN_PROGRESS");
          break;
      }
    }

    // Amount filter
    if (filterAmountType === "exact" && filterAmount.exact) {
      filtered = filtered.filter(
        (t) => t.amount === parseFloat(filterAmount.exact),
      );
    } else if (filterAmountType === "range") {
      if (filterAmount.min) {
        filtered = filtered.filter(
          (t) => t.amount >= parseFloat(filterAmount.min),
        );
      }
      if (filterAmount.max) {
        filtered = filtered.filter(
          (t) => t.amount <= parseFloat(filterAmount.max),
        );
      }
    }


    // Requisite filter
    if (filterRequisite !== "all") {
      filtered = filtered.filter((t) => t.requisites?.id === filterRequisite);
    }

    // Payment method filter
    if (filterMethod !== "all") {
      filtered = filtered.filter((t) => t.method?.name === filterMethod);
    }

    // Date filter
    if (filterDateFrom) {
      filtered = filtered.filter(
        (t) => new Date(t.createdAt) >= filterDateFrom,
      );
    }
    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((t) => new Date(t.createdAt) <= toDate);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "oldest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "amount_desc":
          return b.amount - a.amount;
        case "amount_asc":
          return a.amount - b.amount;
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredTransactions = getFilteredTransactions();

  // Calculate stats for period
  const calculatePeriodStats = () => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const startOfHalfYear = new Date(now.getFullYear(), Math.floor(now.getMonth() / 6) * 6, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let filterDate: Date;
    let endDate: Date | undefined;

    switch (period) {
      case "yesterday":
        filterDate = yesterday;
        endDate = endOfYesterday;
        break;
      case "week":
        filterDate = startOfWeek;
        break;
      case "month":
        filterDate = startOfMonth;
        break;
      case "quarter":
        filterDate = startOfQuarter;
        break;
      case "halfyear":
        filterDate = startOfHalfYear;
        break;
      case "year":
        filterDate = startOfYear;
        break;
      case "today":
      default:
        filterDate = startOfDay;
        break;
    }

    return transactions.reduce(
      (acc, tx) => {
        const txDate = new Date(tx.createdAt);
        if (txDate >= filterDate && (!endDate || txDate < endDate)) {
          if (tx.status === "READY" || tx.status === "COMPLETED") {
            acc.count += 1;
            // Calculate USDT amount
            const usdtAmount = tx.frozenUsdtAmount || (tx.rate ? tx.amount / tx.rate : tx.amount / 95);
            acc.totalAmount += usdtAmount;
            acc.totalProfit += tx.calculatedCommission || 0;
          }
        }
        return acc;
      },
      { count: 0, totalAmount: 0, totalProfit: 0 },
    );
  };

  const periodStats = calculatePeriodStats();

  console.log(
    "[BtEntryList] Rendering with:",
    transactions.length,
    "transactions, filtered:",
    filteredTransactions.length,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#530FAD]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with user info */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-[#eeeeee]">
          БТ-вход
        </h1>

        <div className="flex items-center gap-2 md:gap-3">
          <Button
            onClick={() => setRequisitesDialogOpen(true)}
            variant="outline"
            size="sm"
            className="text-xs md:text-sm"
          >
            <CreditCard className="mr-1 md:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Реквизиты</span>
            <span className="sm:hidden">+</span>
          </Button>
          <TraderHeader />
        </div>
      </div>

      {/* Stats Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
        {/* Deals Stats */}
        <Card className="p-3 md:p-4 border border-gray-200 dark:border-[#292133]">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Сделки ({periodStats.count})
              </h3>
              <div className="space-y-1">
                <div className="text-xl font-semibold text-gray-900 dark:text-[#eeeeee]">
                  {periodStats.totalAmount.toFixed(2)} USDT
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {(periodStats.totalAmount * 95).toFixed(0)} RUB
                </div>
                {periodStats.count === 0 && (
                  <div className="text-xs text-red-500 dark:text-[#c64444] mt-2">
                    Нет успешных сделок
                  </div>
                )}
              </div>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">
                  <span className="hidden sm:inline">Период: </span>{period === "today" ? "за сегодня" : 
                          period === "yesterday" ? "за вчера" :
                          period === "week" ? "за неделю" :
                          period === "month" ? "за месяц" :
                          period === "quarter" ? "за квартал" :
                          period === "halfyear" ? "за полгода" :
                          period === "year" ? "за год" : "за сегодня"}
                  <ChevronDown className="ml-1 h-3 w-3 text-[#530FAD] dark:text-[#530FAD]" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-0" align="end" alignOffset={-10}>
                <div className="max-h-64 overflow-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setPeriod("today")}
                  >
                    За сегодня
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setPeriod("yesterday")}
                  >
                    За вчера
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setPeriod("week")}
                  >
                    За неделю
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setPeriod("month")}
                  >
                    За месяц
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setPeriod("quarter")}
                  >
                    За квартал
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setPeriod("halfyear")}
                  >
                    За полгода
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setPeriod("year")}
                  >
                    За год
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </Card>

        {/* Profit Stats */}
        <Card className="p-3 md:p-4 border border-gray-200 dark:border-[#292133]">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Прибыль
              </h3>
              <div className="space-y-1">
                <div className="text-xl font-semibold text-gray-900 dark:text-[#eeeeee]">
                  {periodStats.totalProfit.toFixed(2)} USDT
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {(periodStats.totalProfit * 95).toFixed(0)} RUB
                </div>
              </div>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">
                  <span className="hidden sm:inline">Период: </span>{period === "today" ? "за сегодня" : 
                          period === "yesterday" ? "за вчера" :
                          period === "week" ? "за неделю" :
                          period === "month" ? "за месяц" :
                          period === "quarter" ? "за квартал" :
                          period === "halfyear" ? "за полгода" :
                          period === "year" ? "за год" : "за сегодня"}
                  <ChevronDown className="ml-1 h-3 w-3 text-[#530FAD] dark:text-[#530FAD]" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-0" align="end" alignOffset={-10}>
                <div className="max-h-64 overflow-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setPeriod("today")}
                  >
                    За сегодня
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setPeriod("yesterday")}
                  >
                    За вчера
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setPeriod("week")}
                  >
                    За неделю
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setPeriod("month")}
                  >
                    За месяц
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setPeriod("quarter")}
                  >
                    За квартал
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setPeriod("halfyear")}
                  >
                    За полгода
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setPeriod("year")}
                  >
                    За год
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </Card>
      </div>

      {/* Search and Filters - Sticky */}
      <div className="sticky top-0 z-10 bg-white dark:bg-[#0f0f0f] pb-3 md:pb-4 -mx-4 md:-mx-6 px-4 md:px-6 pt-2 shadow-sm dark:shadow-[#292133]">
        <div className="flex gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#530FAD] dark:text-[#530FAD] h-4 w-4" />
            <Input
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border h-10 md:h-12 text-sm md:text-base border-gray-300 dark:border-[#292133] rounded-lg"
            />
          </div>

          {/* Filters */}
          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="default"
                className="gap-1 md:gap-2 h-10 md:h-12 px-3 md:px-6 text-sm md:text-base"
              >
                <SlidersHorizontal className="h-4 w-4 text-[#530FAD]" />
                <span className="hidden sm:inline">Не выбраны</span>
                <span className="sm:hidden">Фильтры</span>
                {(filterStatus !== "all" ||
                  filterAmount.exact ||
                  filterAmount.min ||
                  filterAmount.max ||
                  filterRequisite !== "all" ||
                  filterDateFrom ||
                  filterDateTo) && (
                  <Badge className="ml-1 bg-[#530FAD] text-white">
                    {
                      [
                        filterStatus !== "all",
                        filterAmount.exact ||
                          filterAmount.min ||
                          filterAmount.max,
                        filterRequisite !== "all",
                        filterDateFrom || filterDateTo,
                      ].filter(Boolean).length
                    }
                  </Badge>
                )}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-colors",
                    filtersOpen ? "text-[#530FAD]" : "text-gray-400",
                  )}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[calc(100vw-2rem)] sm:w-[500px]" sideOffset={5}>
              <div className="space-y-4">
                <h4 className="font-medium text-">Параметры поиска</h4>

                {/* Status Filter */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-[#530FAD]" />
                    <Label className="text-sm">Статус платежа</Label>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="default"
                        className="w-full justify-between h-12"
                      >
                        <span className={"text-[#530FAD]"}>
                          {filterStatus === "all"
                            ? "Все сделки"
                            : filterStatus === "not_credited"
                              ? "Не зачисленные сделки"
                              : filterStatus === "credited"
                                ? "Зачисленные сделки"
                                : "Сделки выполняются"}
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50 text-[#530FAD]" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[calc(100vw-3rem)] sm:w-[465px] p-0"
                      align="start"
                      sideOffset={5}
                    >
                      <div className="p-2 border-b">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input placeholder="Поиск статуса" className="pl-9" />
                        </div>
                      </div>
                      <div className="max-h-64 overflow-auto">
                        <Button
                          variant="ghost"
                          size="default"
                          className={cn(
                            "w-full justify-start h-12 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-[#530FAD] dark:hover:text-purple-400",
                            filterStatus === "all" &&
                              "text-[#530FAD] dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20",
                          )}
                          onClick={() => setFilterStatus("all")}
                        >
                          Все сделки
                        </Button>
                        <Button
                          variant="ghost"
                          size="default"
                          className={cn(
                            "w-full justify-start h-12 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-[#530FAD] dark:hover:text-purple-400",
                            filterStatus === "not_credited" &&
                              "text-[#530FAD] dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20",
                          )}
                          onClick={() => setFilterStatus("not_credited")}
                        >
                          Не зачисленные сделки
                        </Button>
                        <Button
                          variant="ghost"
                          size="default"
                          className={cn(
                            "w-full justify-start h-12 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-[#530FAD] dark:hover:text-purple-400",
                            filterStatus === "credited" &&
                              "text-[#530FAD] dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20",
                          )}
                          onClick={() => setFilterStatus("credited")}
                        >
                          Зачисленные сделки
                        </Button>
                        <Button
                          variant="ghost"
                          size="default"
                          className={cn(
                            "w-full justify-start h-12 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-[#530FAD] dark:hover:text-purple-400",
                            filterStatus === "in_progress" &&
                              "text-[#530FAD] dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20",
                          )}
                          onClick={() => setFilterStatus("in_progress")}
                        >
                          Сделки выполняются
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Amount Filter */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-[#530FAD]" />
                      <Label className="text-sm">Сумма зачисления</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className={cn(
                          "text-sm font-medium transition-colors",
                          filterAmountType === "exact"
                            ? "text-[#530FAD]"
                            : "text-gray-500 hover:text-gray-700",
                        )}
                        onClick={() => setFilterAmountType("exact")}
                      >
                        Точное значение
                      </button>
                      <span className="text-gray-400">/</span>
                      <button
                        className={cn(
                          "text-sm font-medium transition-colors",
                          filterAmountType === "range"
                            ? "text-[#530FAD]"
                            : "text-gray-500 hover:text-gray-700",
                        )}
                        onClick={() => setFilterAmountType("range")}
                      >
                        Диапазон
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {filterAmountType === "exact" ? (
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="Сумма"
                          value={filterAmount.exact}
                          onChange={(e) =>
                            setFilterAmount({
                              ...filterAmount,
                              exact: e.target.value,
                            })
                          }
                          className="h-12"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                          RUB
                        </span>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type="number"
                            placeholder="Сумма, от"
                            value={filterAmount.min}
                            onChange={(e) =>
                              setFilterAmount({
                                ...filterAmount,
                                min: e.target.value,
                              })
                            }
                            className="flex-1 h-12"
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                            RUB
                          </span>
                        </div>
                        <div className="relative flex-1">
                          <Input
                            type="number"
                            placeholder="Сумма, до"
                            value={filterAmount.max}
                            onChange={(e) =>
                              setFilterAmount({
                                ...filterAmount,
                                max: e.target.value,
                              })
                            }
                            className="flex-1 h-12"
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                            RUB
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>


                {/* Requisite Filter */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-[#530FAD]" />
                    <Label className="text-sm">Реквизиты</Label>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="default"
                        className="w-full justify-between h-12"
                      >
                        <span className={"text-[#530FAD]"}>
                          {filterRequisite === "all"
                            ? "Все реквизиты"
                            : filterRequisite === "1"
                              ? "Основная карта"
                              : "Резервная карта"}
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50 text-[#530FAD]" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[calc(100vw-3rem)] sm:w-[465px] p-0"
                      align="start"
                      sideOffset={5}
                    >
                      <div className="p-2 border-b">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            placeholder="Поиск реквизитов"
                            className="pl-9"
                            value={requisiteSearch}
                            onChange={(e) => setRequisiteSearch(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="max-h-64 overflow-auto">
                        <Button
                          variant="ghost"
                          size="default"
                          className={cn(
                            "w-full justify-start h-12 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-[#530FAD] dark:hover:text-purple-400",
                            filterRequisite === "all" &&
                              "text-[#530FAD] dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20",
                          )}
                          onClick={() => setFilterRequisite("all")}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <CreditCard className="h-4 w-4 text-gray-600" />
                            </div>
                            <div className="text-left">
                              <div className="font-medium">Все реквизиты</div>
                              <div className="text-sm text-gray-500">
                                Не фильтровать по реквизитам
                              </div>
                            </div>
                          </div>
                        </Button>
                        {requisites
                          .filter(
                            (requisite) =>
                              !requisiteSearch ||
                              requisite.recipientName
                                ?.toLowerCase()
                                .includes(requisiteSearch.toLowerCase()) ||
                              requisite.cardNumber?.includes(requisiteSearch) ||
                              requisite.bankType
                                ?.toLowerCase()
                                .includes(requisiteSearch.toLowerCase()),
                          )
                          .map((requisite) => (
                            <Button
                              key={requisite.id}
                              variant="ghost"
                              size="default"
                              className={cn(
                                "w-full justify-start h-12 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-[#530FAD] dark:hover:text-purple-400",
                                filterRequisite === requisite.id &&
                                  "text-[#530FAD] dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20",
                              )}
                              onClick={() => setFilterRequisite(requisite.id)}
                            >
                              <div className="flex items-center gap-3">
                                {requisite.bankType ? (
                                  getBankIcon(requisite.bankType, "sm")
                                ) : (
                                  <NeutralBankIcon />
                                )}
                                <div className="text-left">
                                  <div className="font-medium">
                                    {requisite.recipientName ||
                                      "Безымянная карта"}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {requisite.cardNumber
                                      ? `•••• ${requisite.cardNumber.slice(-4)}`
                                      : "Номер не указан"}{" "}
                                    • {requisite.bankType || "Банк не указан"}
                                  </div>
                                </div>
                              </div>
                            </Button>
                          ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Payment Method Filter */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#530FAD]" />
                    <Label className="text-sm">Метод оплаты</Label>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="default"
                        className="w-full justify-between h-12"
                      >
                        <span className={"text-[#530FAD]"}>
                          {filterMethod === "all" ? "Все методы" : filterMethod}
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50 text-[#530FAD]" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[465px] p-0"
                      align="start"
                      sideOffset={5}
                    >
                      <div className="p-2 border-b">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            placeholder="Поиск методов"
                            className="pl-9"
                            value={methodSearch}
                            onChange={(e) => setMethodSearch(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="max-h-64 overflow-auto">
                        <Button
                          variant="ghost"
                          size="default"
                          className={cn(
                            "w-full justify-start h-12 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-[#530FAD] dark:hover:text-purple-400",
                            filterMethod === "all" &&
                              "text-[#530FAD] dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20",
                          )}
                          onClick={() => setFilterMethod("all")}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-4 w-4 text-gray-600" />
                            </div>
                            <div className="text-left">
                              <div className="font-medium">Все методы</div>
                              <div className="text-sm text-gray-500">
                                Не фильтровать по методу оплаты
                              </div>
                            </div>
                          </div>
                        </Button>
                        {methods
                          .filter(
                            (method) =>
                              !methodSearch ||
                              method.name
                                ?.toLowerCase()
                                .includes(methodSearch.toLowerCase()) ||
                              method.type
                                ?.toLowerCase()
                                .includes(methodSearch.toLowerCase()),
                          )
                          .map((method) => {
                            // Try to extract bank type from method name or type
                            const bankType =
                              method.type?.toUpperCase() ||
                              method.name?.toUpperCase().replace(/\s+/g, "") ||
                              "";

                            return (
                              <Button
                                key={method.id}
                                variant="ghost"
                                size="default"
                                className={cn(
                                  "w-full justify-start h-12 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-[#530FAD] dark:hover:text-purple-400",
                                  filterMethod === method.id &&
                                    "text-[#530FAD] dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20",
                                )}
                                onClick={() => setFilterMethod(method.id)}
                              >
                                <div className="flex items-center gap-3">
                                  {bankType ? (
                                    getBankIcon(bankType, "sm")
                                  ) : (
                                    <NeutralBankIcon />
                                  )}
                                  <div className="text-left">
                                    <div className="font-medium">
                                      {method.name}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {method.description ||
                                        `Перевод через ${method.name}`}
                                    </div>
                                  </div>
                                </div>
                              </Button>
                            );
                          })}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Date Range */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#530FAD]" />
                    <Label className="text-sm">Дата создания платежа</Label>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <CustomCalendarPopover
                        value={filterDateFrom}
                        onChange={setFilterDateFrom}
                        placeholder="От"
                      />
                    </div>
                    <div className="flex-1">
                      <CustomCalendarPopover
                        value={filterDateTo}
                        onChange={setFilterDateTo}
                        placeholder="До"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-12"
                    onClick={() => {
                      setFilterStatus("all");
                      setFilterAmount({ exact: "", min: "", max: "" });
                      setFilterAmountType("range");
                      setFilterDevice("all");
                      setFilterRequisite("all");
                      setFilterMethod("all");
                      setFilterDateFrom(undefined);
                      setFilterDateTo(undefined);
                    }}
                  >
                    Сбросить фильтры
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-12 bg-purple-100 hover:bg-purple-200 transition-colors duration-150 text-purple-500"
                    onClick={() => setFiltersOpen(false)}
                  >
                    Применить фильтры
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Sort */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="default"
                className="gap-2 h-12 px-6"
              >
                <ArrowUpDown className="h-4 w-4 text-[#530FAD]" />
                Сортировка
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto" sideOffset={5}>
              <div className="space-y-2">
                <h4 className="font-medium text-base">Сортировать</h4>
                <div className="space-y-1">
                  <Button
                    variant={sortBy === "newest" ? "secondary" : "ghost"}
                    size="default"
                    className="w-full justify-start h-12"
                    onClick={() => setSortBy("newest")}
                  >
                    Сначала новые
                  </Button>
                  <Button
                    variant={sortBy === "oldest" ? "secondary" : "ghost"}
                    size="default"
                    className="w-full justify-start h-12"
                    onClick={() => setSortBy("oldest")}
                  >
                    Сначала старые
                  </Button>
                  <Button
                    variant={sortBy === "amount_desc" ? "secondary" : "ghost"}
                    size="default"
                    className="w-full justify-start h-12"
                    onClick={() => setSortBy("amount_desc")}
                  >
                    По убыванию суммы
                  </Button>
                  <Button
                    variant={sortBy === "amount_asc" ? "secondary" : "ghost"}
                    size="default"
                    className="w-full justify-start h-12"
                    onClick={() => setSortBy("amount_asc")}
                  >
                    По возрастанию суммы
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <Card className="p-12 text-center text-gray-500 dark:text-gray-400 dark:bg-gray-800 dark:border-gray-700">
            Сделки не найдены
          </Card>
        ) : (
          <>
            {filteredTransactions.map((transaction) => {
              const getStatusIcon = () => {
                switch (transaction.status) {
                  case "CREATED":
                    return (
                      <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    );
                  case "IN_PROGRESS":
                    return (
                      <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    );
                  case "READY":
                    return (
                      <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
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
                switch (transaction.status) {
                  case "READY":
                    return "Платеж зачислен";
                  case "CREATED":
                  case "IN_PROGRESS":
                    return "Платеж ожидает зачисления";
                  default:
                    return "Платеж не зачислен";
                }
              };

              const getStatusBadgeText = () => {
                switch (transaction.status) {
                  case "READY":
                    return "Зачислен";
                  case "CREATED":
                  case "IN_PROGRESS":
                    return formatRemainingTime(transaction.expired_at);
                  case "EXPIRED":
                    return "Истекло";
                  case "CANCELED":
                    return "Отменено";
                  default:
                    return "Не зачислен";
                }
              };

              const getStatusBadgeColor = () => {
                switch (transaction.status) {
                  case "READY":
                    return "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800";
                  case "CREATED":
                  case "IN_PROGRESS":
                    return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
                  default:
                    return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";
                }
              };

              // Use frozen USDT amount or calculate from rate
              const usdtAmount = transaction.frozenUsdtAmount
                ? (
                    Math.round(transaction.frozenUsdtAmount * 100) / 100
                  ).toFixed(2)
                : transaction.rate
                  ? (
                      Math.round(
                        (transaction.amount / transaction.rate) * 100,
                      ) / 100
                    ).toFixed(2)
                  : (Math.round((transaction.amount / 95) * 100) / 100).toFixed(
                      2,
                    );

              return (
                <Card
                  key={transaction.id}
                  className={cn(
                    "p-3 md:p-4 hover:shadow-md dark:hover:shadow-gray-700 transition-all duration-300 cursor-pointer dark:bg-gray-800 dark:border-gray-700",
                    transaction.isNew && "flash-once",
                  )}
                  onClick={() => setSelectedTransaction(transaction)}
                >
                  <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                    {/* Status Icon */}
                    <div className="flex-shrink-0">{getStatusIcon()}</div>

                    {/* Transaction ID and Device */}
                    <div className="w-20 md:w-24 flex-shrink-0">
                      <div className="text-xs md:text-sm font-semibold text-gray-900 dark:text-[#eeeeee]">
                        {transaction.numericId}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 hidden sm:block">
                        {transaction.method?.name || "—"}
                      </div>
                      {/* Mobile status */}
                      <div className="sm:hidden mt-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            "px-1.5 py-0.5 text-[10px] font-medium border rounded-md whitespace-nowrap",
                            getStatusBadgeColor(),
                          )}
                        >
                          {getStatusBadgeText()}
                        </Badge>
                      </div>
                    </div>

                    {/* Payment Status and Date */}
                    <div className="w-48 flex-shrink-0 hidden xl:block">
                      <div className="text-sm font-medium text-gray-900 dark:text-[#eeeeee]">
                        {getPaymentStatus()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Создан{" "}
                        {format(
                          new Date(transaction.createdAt),
                          "HH:mm dd.MM.yyyy",
                        )}
                      </div>
                    </div>

                    {/* Bank and Requisites */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="hidden sm:block">
                          {transaction.requisites?.bankType &&
                            getBankIcon(transaction.requisites.bankType, "sm")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs md:text-sm font-medium text-gray-900 dark:text-[#eeeeee] truncate">
                            {transaction.requisites?.cardNumber || "—"}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 md:mt-1 truncate">
                            {transaction.clientName}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="w-24 md:w-32 flex-shrink-0 text-right md:text-left">
                      <div className="text-xs md:text-sm font-semibold text-gray-900 dark:text-[#eeeeee]">
                        {usdtAmount} USDT
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {transaction.amount.toLocaleString("ru-RU")} ₽
                      </div>
                    </div>

                    {/* Rate */}
                    <div className="w-20 flex-shrink-0 hidden lg:block">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {transaction.rate
                          ? `${transaction.rate.toFixed(2)} ₽`
                          : "—"}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex-shrink-0 hidden sm:block">
                      <Badge
                        variant="outline"
                        className={cn(
                          "px-2 md:px-3 py-1 md:py-1.5 text-xs font-medium border rounded-xl whitespace-nowrap",
                          getStatusBadgeColor(),
                        )}
                      >
                        {getStatusBadgeText()}
                      </Badge>
                    </div>
                  </div>
                </Card>
              );
            })}

            {/* Count */}
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-4">
              Найдено {filteredTransactions.length} записей
            </div>

            {/* Loading more indicator */}
            {loadingMore && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-[#530FAD]" />
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  Загрузка...
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Transaction Details Dialog */}
      <Dialog
        open={!!selectedTransaction}
        onOpenChange={() => {
          setSelectedTransaction(null);
          setShowRequisiteDetails(false);
        }}
      >
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] md:w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-0 border bg-background dark:border-gray-700 p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] overflow-hidden rounded-2xl md:rounded-3xl">
            {/* Hidden DialogTitle for accessibility */}
            <DialogTitle className="sr-only">
              {showRequisiteDetails
                ? "Информация о реквизите"
                : "Детали транзакции"}
            </DialogTitle>
            <div className="bg-white dark:bg-gray-800">
              {/* Header */}
              <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                {showRequisiteDetails ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRequisiteDetails(false)}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 -ml-2"
                    >
                      <ChevronDown className="h-4 w-4 mr-1 rotate-90 text-[#530FAD]" />
                      Назад
                    </Button>
                    <h3 className="font-medium dark:text-white">
                      Информация о реквизите
                    </h3>
                    <div className="w-8" />
                  </>
                ) : (
                  <>
                    <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 ml-0 md:ml-[124px]">
                      {selectedTransaction &&
                        format(
                          new Date(selectedTransaction.createdAt),
                          "d MMM 'в' HH:mm",
                          { locale: ru },
                        )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTransaction(null);
                        setShowRequisiteDetails(false);
                      }}
                      className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                    >
                      <X className="h-4 w-4 text-[#530FAD]" />
                    </Button>
                  </>
                )}
              </div>

              {selectedTransaction && !showRequisiteDetails && (
                <>
                  {/* Status Icon and Info */}
                  <div className="px-6 py-6 text-center">
                    {/* Status Icon */}
                    <div className="mb-4 flex justify-center">
                      {selectedTransaction.status === "READY" ? (
                        <div className="w-20 h-20 rounded-3xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                          <CheckCircle2 className="h-10 w-10 text-purple-600 dark:text-purple-400" />
                        </div>
                      ) : selectedTransaction.status === "CREATED" ||
                        selectedTransaction.status === "IN_PROGRESS" ? (
                        <div className="w-20 h-20 rounded-3xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Clock className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-3xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                          <X className="h-10 w-10 text-red-600 dark:text-red-400" />
                        </div>
                      )}
                    </div>

                    {/* Transaction Title */}
                    <h2 className="text-lg font-semibold mb-1 dark:text-white">
                      {selectedTransaction.status === "READY"
                        ? "Платеж зачислен"
                        : selectedTransaction.status === "CREATED" ||
                            selectedTransaction.status === "IN_PROGRESS"
                          ? "Ожидание платежа"
                          : "Платеж не зачислен"}
                    </h2>

                    {/* Transaction ID */}
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      {selectedTransaction.numericId}
                    </p>

                    {/* Amount */}
                    <div className="mb-1">
                      <span className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                        {selectedTransaction.frozenUsdtAmount
                          ? selectedTransaction.frozenUsdtAmount.toFixed(2)
                          : selectedTransaction.rate
                            ? (
                                selectedTransaction.amount /
                                selectedTransaction.rate
                              ).toFixed(2)
                            : (selectedTransaction.amount / 95).toFixed(2)}{" "}
                        USDT
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedTransaction.amount.toLocaleString("ru-RU")} RUB
                    </p>
                  </div>

                  {/* Dispute Badge if exists */}
                  {selectedTransaction.status === "DISPUTE" && (
                    <div className="px-6 pb-4">
                      <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-800 flex items-center justify-center">
                            <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-300" />
                          </div>
                          <div>
                            <p className="text-sm font-medium dark:text-white">
                              Спор принят
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {format(new Date(), "d MMMM yyyy 'г., в' HH:mm", {
                                locale: ru,
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Requisite Card */}
                  <div className="px-6 pb-4">
                    <Button
                      variant="outline"
                      className="w-full p-4 h-auto justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:bg-gray-800 dark:border-gray-700"
                      onClick={() => setShowRequisiteInfoModal(true)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-[92px] h-[62px] rounded-md bg-gradient-to-tr from-purple-800 via-purple-400 to-purple-400 relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-800  to-transparent"></div>
                          <div className="absolute top-2 right-4">
                            <svg
                              viewBox="0 0 30 18"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-6 h-4"
                            >
                              <circle
                                cx="9"
                                cy="9"
                                r="9"
                                fill="#fff"
                                fillOpacity="0.8"
                              ></circle>
                              <circle
                                cx="21"
                                cy="9"
                                r="9"
                                fill="#fff"
                                fillOpacity="0.8"
                              ></circle>
                            </svg>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-xl dark:text-white">
                            {selectedTransaction.requisites?.recipientName ||
                              selectedTransaction.clientName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {selectedTransaction.requisites?.cardNumber
                              ?.replace(/(\d{4})/g, "$1 ")
                              .trim() || "—"}
                          </p>
                        </div>
                      </div>
                      <ChevronDown className="h-5 w-5 text-[#530FAD] -rotate-90" />
                    </Button>
                  </div>

                  {/* Transaction Details */}
                  <div className="px-6 pb-4 space-y-3">
                    {/* Rate */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Ставка
                        </span>
                        <span className="text-lg font-semibold dark:text-white">
                          1 USDT ={" "}
                          {selectedTransaction.rate
                            ? selectedTransaction.rate.toFixed(2)
                            : "95.00"}{" "}
                          RUB
                        </span>
                      </div>
                    </div>

                    {/* Profit */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Прибыль
                        </span>
                        <span className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                          +{" "}
                          {selectedTransaction.calculatedCommission
                            ? selectedTransaction.calculatedCommission.toFixed(
                                2,
                              )
                            : "0.00"}{" "}
                          USDT
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Action Button */}
                  <div className="px-6 pb-6">
                    {selectedTransaction.status === "READY" ? (
                      <div className="text-center space-y-3">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Сделка готова к закрытию{" "}
                          <span className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                            спором
                          </span>
                        </p>
                        <div className="space-y-2">
                          <Button
                            className="w-full bg-purple-600 hover:bg-purple-700"
                            onClick={() =>
                              manualCloseTransaction(selectedTransaction.id)
                            }
                          >
                            Закрыть сделку вручную
                          </Button>
                          <Button
                            className="w-full"
                            variant="outline"
                            onClick={() => setSelectedTransaction(null)}
                          >
                            Отмена
                          </Button>
                        </div>
                      </div>
                    ) : selectedTransaction.status === "IN_PROGRESS" ? (
                      <Button
                        className="w-full bg-[#530FAD] hover:bg-[#530FAD]/90"
                        onClick={() => confirmPayment(selectedTransaction.id)}
                      >
                        Подтвердить платеж
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => setSelectedTransaction(null)}
                      >
                        Закрыть
                      </Button>
                    )}
                  </div>
                </>
              )}

              {/* Requisite Details View */}
              {selectedTransaction && showRequisiteDetails && (
                <div className="">
                  {/* Requisite Header */}
                  <div className="px-6 py-6 text-center border-b dark:border-gray-700">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                      {selectedTransaction.requisites?.bankType && (
                        <div className="scale-125">
                          {getBankIcon(selectedTransaction.requisites.bankType)}
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold mb-1 dark:text-white">
                      {selectedTransaction.clientName}
                    </h3>
                    <p className="text-2xl font-bold mb-1 dark:text-white">
                      {selectedTransaction.requisites?.cardNumber || "—"}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Банк:{" "}
                      {selectedTransaction.requisites?.bankType ||
                        selectedTransaction.assetOrBank}{" "}
                      • Россия
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      Счет:{" "}
                      {selectedTransaction.requisites?.id?.slice(-8) ||
                        "00000000"}
                    </p>
                  </div>

                  {/* Requisite Stats */}
                  <div className="px-6 py-4 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Прием по номеру карты: Не подтверждено
                        </span>
                        <Button
                          variant="link"
                          size="sm"
                          className="text-blue-600 dark:text-blue-400 p-0 h-auto"
                        >
                          Карта выбрана как основная
                        </Button>
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        Прием по номеру счета: Не подтверждено
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        Прием по номеру телефона: Подтверждено
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-sm dark:text-white">
                        Статистика за 24 часа
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            Объем сделок
                          </span>
                          <span className="font-medium dark:text-white">
                            0 USDT = 0 RUB{" "}
                            <span className="text-gray-400 dark:text-gray-500">
                              (0 сделок)
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            Прибыль
                          </span>
                          <span className="font-medium dark:text-white">
                            0 USDT
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            Конверсия
                          </span>
                          <span className="font-medium text-gray-400 dark:text-gray-500">
                            0%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t dark:border-gray-700 space-y-3">
                      <h4 className="font-medium text-sm dark:text-white">
                        Привязка к устройству
                      </h4>
                      <Button
                        variant="outline"
                        className="w-full p-3 h-auto justify-between hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800 dark:border-gray-700"
                        onClick={() => {
                          if (selectedTransaction.method?.id) {
                            router.push(
                              `/trader/devices/${selectedTransaction.method.id}`,
                            );
                          } else {
                            toast.error("ID устройства не найден");
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <Smartphone className="h-5 w-5 text-[#530FAD] dark:text-purple-400" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium dark:text-white">
                              {selectedTransaction.method?.name ||
                                "Tinkoff iOS 17.2"}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {selectedTransaction.method?.id ||
                                "5f779d3c-7f63-424e-ac7e-97f5924af501"}
                            </p>
                          </div>
                        </div>
                        <ChevronDown className="h-5 w-5 text-[#530FAD] dark:text-purple-400 -rotate-90" />
                      </Button>
                    </div>

                    <div className="pt-4 space-y-3">
                      <h4 className="font-medium text-sm dark:text-white">
                        Управление реквизитом
                      </h4>
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          className="w-full justify-start dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
                          onClick={() => toast.info("Функция в разработке")}
                        >
                          <X className="h-4 w-4 mr-2 text-red-500" />
                          Удалить
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
                          onClick={() => toast.info("Функция в разработке")}
                        >
                          <Eye className="h-4 w-4 mr-2 text-[#530FAD] dark:text-purple-400" />
                          Просмотр сделок по реквизиту
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
                          onClick={() => toast.info("Функция в разработке")}
                        >
                          <CreditCard className="h-4 w-4 mr-2 text-[#530FAD] dark:text-purple-400" />
                          Подтвердить номер карты
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
                          onClick={() => toast.info("Функция в разработке")}
                        >
                          <CreditCard className="h-4 w-4 mr-2 text-[#530FAD] dark:text-purple-400" />
                          Подтвердить номер счета
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Close Button */}
                  <div className="px-6 pb-6">
                    <Button
                      className="w-full bg-[#530FAD] hover:bg-[#530FAD]/90"
                      onClick={() => setShowRequisiteDetails(false)}
                    >
                      Закрыть
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      {/* Requisite Info Modal */}
      {selectedTransaction && (
        <RequisiteInfoModal
          open={showRequisiteInfoModal}
          onOpenChange={setShowRequisiteInfoModal}
          requisite={{
            id: selectedTransaction.requisites?.id || selectedTransaction.id,
            bankType:
              selectedTransaction.requisites?.bankType ||
              selectedTransaction.assetOrBank,
            cardNumber:
              selectedTransaction.requisites?.cardNumber ||
              "2200 0000 0000 0000",
            recipientName:
              selectedTransaction.requisites?.recipientName ||
              selectedTransaction.clientName,
            phoneNumber: "+7 900 000 00 00",
            accountNumber: "40817810490069500347",
            status:
              selectedTransaction.status === "READY" ? "active" : "inactive",
            device: {
              id: "device-123",
              name: "Рабочее устройство",
            },
            stats: {
              turnover24h: selectedTransaction.amount || 0,
              deals24h: 1,
              profit24h: selectedTransaction.calculatedCommission || 0,
              conversion24h: 95,
            },
            verifications: {
              cardNumber: false,
              accountNumber: false,
              phoneNumber: true,
            },
          }}
        />
      )}

      {/* Requisites List Dialog */}
      <RequisitesListDialog
        open={requisitesDialogOpen}
        onOpenChange={setRequisitesDialogOpen}
      />
    </div>
  );
}
