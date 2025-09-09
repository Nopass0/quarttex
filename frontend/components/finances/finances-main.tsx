"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUrlModal } from "@/hooks/use-url-modal";
import {
  Search,
  Filter,
  Download,
  Upload,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Clock,
  ChevronRight,
  Wallet,
  CreditCard,
  DollarSign,
  Info,
  AlertCircle,
  Copy,
  CheckCircle2,
  Shield,
  Users,
  TrendingUpIcon,
  ArrowUpDown,
  ChevronDown,
  WalletIcon,
  Banknote,
  BanknoteIcon,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useTraderFinancials } from "@/hooks/use-trader-financials";
import { TraderHeader } from "@/components/trader/trader-header";
import { DepositDialog } from "@/components/finances/deposit-dialog";
import { WithdrawalDialog } from "@/components/finances/withdrawal-dialog";
import { cn } from "@/lib/utils";
import { traderApi } from "@/services/api";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface AccountOperation {
  id: string;
  type:
    | "deposit"
    | "withdrawal"
    | "commission"
    | "freeze"
    | "unfreeze"
    | "profit";
  amount: number;
  currency: string;
  status: "completed" | "pending" | "failed" | "active";
  date: string;
  description: string;
  txHash?: string;
  dealId?: number;
}

interface DepositRequest {
  id: string;
  amount: number;
  currency: string;
  status: "pending" | "confirmed" | "failed";
  date: string;
  network: string;
  txHash?: string;
}

const mockOperations: AccountOperation[] = [
  {
    id: "op-1",
    type: "deposit",
    amount: 5000,
    currency: "USDT",
    status: "completed",
    date: "2024-01-15T14:23:11Z",
    description: "Пополнение баланса",
    txHash: "0x1234567890abcdef",
  },
  {
    id: "op-2",
    type: "withdrawal",
    amount: 1500,
    currency: "USDT",
    status: "completed",
    date: "2024-01-14T10:15:33Z",
    description: "Вывод средств",
    txHash: "0x8765432109fedcba",
  },
  {
    id: "op-3",
    type: "commission",
    amount: 25.5,
    currency: "USDT",
    status: "completed",
    date: "2024-01-13T18:45:22Z",
    description: "Комиссия за сделку #12345",
    dealId: 12345,
  },
  {
    id: "op-4",
    type: "freeze",
    amount: 1000,
    currency: "USDT",
    status: "active",
    date: "2024-01-12T09:30:00Z",
    description: "Заморозка средств для сделки #12346",
    dealId: 12346,
  },
  {
    id: "op-5",
    type: "unfreeze",
    amount: 800,
    currency: "USDT",
    status: "completed",
    date: "2024-01-11T16:20:45Z",
    description: "Разморозка средств по сделке #12344",
    dealId: 12344,
  },
  {
    id: "op-6",
    type: "profit",
    amount: 150.75,
    currency: "USDT",
    status: "completed",
    date: "2024-01-10T12:30:15Z",
    description: "Прибыль с приема платежей",
    dealId: 12343,
  },
];

const mockDepositRequests: DepositRequest[] = [
  {
    id: "req-1",
    amount: 2000,
    currency: "USDT",
    status: "pending",
    date: "2024-01-15T12:00:00Z",
    network: "TRC-20",
    txHash: "0xabc123def456",
  },
  {
    id: "req-2",
    amount: 5000,
    currency: "USDT",
    status: "confirmed",
    date: "2024-01-14T15:30:00Z",
    network: "TRC-20",
    txHash: "0xdef456abc123",
  },
];

export function FinancesMain() {
  const [activeTab, setActiveTab] = useState("operations");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [operations, setOperations] = useState<AccountOperation[]>([]);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateRange, setDateRange] = useState("month");
  const [withdrawalBalanceType, setWithdrawalBalanceType] = useState<
    string | undefined
  >();
  const [depositType, setDepositType] = useState<"BALANCE" | "INSURANCE">(
    "BALANCE",
  );
  const { financials, fetchFinancials } = useTraderFinancials();

  const depositModal = useUrlModal({
    modalName: "deposit",
    onClose: () => {
      setDepositType("BALANCE");
    },
  });

  const withdrawalModal = useUrlModal({
    modalName: "withdrawal",
    onClose: () => {
      setWithdrawalBalanceType(undefined);
    },
  });

  useEffect(() => {
    // Загружаем финансовые данные при монтировании компонента
    console.log("FinancesMain: Fetching financials on mount");
    fetchFinancials();
  }, [fetchFinancials]);

  // Логируем финансовые данные для отладки
  useEffect(() => {
    console.log("FinancesMain: Current financials data:", financials);
  }, [financials]);

  useEffect(() => {
    fetchFinanceData();
  }, [filterType, filterStatus, dateRange]);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);

      // Fetch operations
      const operationsResponse = await traderApi.getFinanceOperations({
        filter: filterType,
        page: 1,
        limit: 50,
      });

      if (operationsResponse?.operations) {
        setOperations(operationsResponse.operations);
      }

      // Fetch deposit requests
      const depositsResponse = await traderApi.getDepositRequests({
        page: 1,
        limit: 20,
      });

      if (depositsResponse?.requests) {
        setDepositRequests(depositsResponse.requests);
      }
    } catch (error) {
      console.error("Error fetching finance data:", error);
      toast.error("Не удалось загрузить финансовые операции");
    } finally {
      setLoading(false);
    }
  };

  const filteredOperations = operations.filter((op) => {
    if (filterType !== "all" && op.type !== filterType) return false;
    if (filterStatus !== "all" && op.status !== filterStatus) return false;
    if (
      searchQuery &&
      !op.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  const getOperationIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <ArrowDownRight className="h-4 w-4" />;
      case "withdrawal":
        return <ArrowUpRight className="h-4 w-4" />;
      case "commission":
        return <DollarSign className="h-4 w-4" />;
      case "freeze":
        return <AlertCircle className="h-4 w-4" />;
      case "unfreeze":
        return <CheckCircle2 className="h-4 w-4" />;
      case "profit":
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  };

  const getOperationColor = (type: string) => {
    switch (type) {
      case "deposit":
        return "text-[#006039] dark:text-[#2d6a42]";
      case "withdrawal":
        return "text-red-600 dark:text-red-500";
      case "commission":
        return "text-orange-600 dark:text-orange-500";
      case "freeze":
        return "text-blue-600 dark:text-blue-500";
      case "unfreeze":
        return "text-[#006039] dark:text-[#2d6a42]";
      case "profit":
        return "text-[#006039] dark:text-[#2d6a42]";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge
            className="bg-green-100 border-green-200 dark:bg-green-900/30 dark:border-green-800"
            style={{ color: "#006039" }}
          >
            Завершено
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800">
            Ожидает
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
            Ошибка
          </Badge>
        );
      case "active":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
            Активно
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
            Неизвестно
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold dark:text-[#eeeeee]">
          Финансы
        </h1>
        <div className="hidden md:block">
          <TraderHeader />
        </div>
      </div>

      {/* Balance Cards */}
      <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-gray-400 dark:text-gray-500">
        Балансы
      </h2>

      <div className="flex flex-wrap gap-3 md:gap-4">
        {/* Депозит */}
        <Card className="p-4 md:p-6 flex-1 min-w-[150px] sm:min-w-[320px] dark:bg-[#29382f] dark:border-gray-700">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                Депозит
              </span>
              <Button
                size="sm"
                className="bg-[#006039]/10 hover:bg-[#006039]/20 dark:bg-[#2d6a42]/10 dark:hover:bg-[#2d6a42]/20 text-gray-700 dark:text-gray-300 h-6 md:h-7 px-1.5 md:px-2 text-xs md:text-sm"
                onClick={() => {
                  setDepositType("INSURANCE");
                  depositModal.open();
                }}
              >
                <Wallet
                  className="h-3 w-3 mr-0.5 md:mr-1"
                  style={{ color: "#006039" }}
                />
                <span className="hidden sm:inline">Пополнить</span>
                <span className="sm:hidden">+</span>
              </Button>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg md:text-2xl font-bold dark:text-[#eeeeee]">
                {(financials?.deposit || 0).toFixed(2)}
              </span>
              <span className="text-xs md:text-sm font-medium text-[#006039] dark:text-[#2d6a42]">
                USDT
              </span>
            </div>
            <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
              Доступный депозит
            </div>
          </div>
        </Card>

        {/* БАЛАНС */}
        <Card className="p-4 md:p-6 flex-1 min-w-[150px] sm:min-w-[320px] dark:bg-[#29382f] dark:border-gray-700">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                БАЛАНС
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-[#006039]/10 hover:bg-[#006039]/20 dark:bg-[#2d6a42]/10 dark:hover:bg-[#2d6a42]/20 text-gray-700 dark:text-gray-300 h-6 md:h-7 px-1.5 md:px-2 text-xs md:text-sm"
                  onClick={() => {
                    setDepositType("BALANCE");
                    depositModal.open();
                  }}
                >
                  <Wallet
                    className="h-3 w-3 mr-0.5 md:mr-1"
                    style={{ color: "#006039" }}
                  />
                  <span className="hidden sm:inline">Пополнить</span>
                  <span className="sm:hidden">+</span>
                </Button>
                <Button
                  size="sm"
                  className="bg-[#006039]/10 hover:bg-[#006039]/20 dark:bg-[#2d6a42]/10 dark:hover:bg-[#2d6a42]/20 text-gray-700 dark:text-gray-300 h-6 md:h-7 px-1.5 md:px-2 text-xs md:text-sm"
                  onClick={() => {
                    setWithdrawalBalanceType("BALANCE");
                    withdrawalModal.open();
                  }}
                >
                  <ArrowUpRight
                    className="h-3 w-3 mr-0.5 md:mr-1"
                    style={{ color: "#006039" }}
                  />
                  <span className="hidden sm:inline">Вывести</span>
                  <span className="sm:hidden">↑</span>
                </Button>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg md:text-2xl font-bold dark:text-[#eeeeee]">
                {(financials?.trustBalance || 0).toFixed(2)}
              </span>
              <span className="text-xs md:text-sm font-medium text-[#006039] dark:text-[#2d6a42]">
                USDT
              </span>
            </div>
            <div
              className="flex items-center gap-1 text-xs md:text-sm"
              style={{ color: "#006039" }}
            >
              <TrendingUp className="h-3 w-3" style={{ color: "#006039" }} />
              <span className="dark:text-[#2d6a42]">+12.5%</span>
            </div>
          </div>
        </Card>

        {/* Компенсация выплат */}
        <Card className="p-4 md:p-6 flex-1 min-w-[150px] sm:min-w-[320px] dark:bg-[#29382f] dark:border-gray-700">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                Компенсация выплат
              </span>
              <Button
                size="sm"
                className="bg-[#006039]/10 hover:bg-[#006039]/20 dark:bg-[#2d6a42]/10 dark:hover:bg-[#2d6a42]/20 text-gray-700 dark:text-gray-300 h-6 md:h-7 px-1.5 md:px-2 text-xs md:text-sm"
                onClick={() => {
                  setWithdrawalBalanceType("COMPENSATION");
                  withdrawalModal.open();
                }}
              >
                <Wallet
                  className="h-3 w-3 mr-0.5 md:mr-1"
                  style={{ color: "#006039" }}
                />
                <span className="hidden sm:inline">Вывод средств</span>
                <span className="sm:hidden">Вывод</span>
              </Button>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg md:text-2xl font-bold dark:text-[#eeeeee]">
                {(financials?.compensationBalance || 0).toFixed(2)}
              </span>
              <span className="text-xs md:text-sm font-medium text-[#006039] dark:text-[#2d6a42]">
                USDT
              </span>
            </div>
            <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
              Страховой резерв
            </div>
          </div>
        </Card>

        {/* Прибыль с приема */}
        <Card className="p-4 md:p-6 flex-1 min-w-[150px] sm:min-w-[320px] dark:bg-[#29382f] dark:border-gray-700">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                Прибыль с приема
              </span>
              <Button
                size="sm"
                className="bg-[#006039]/10 hover:bg-[#006039]/20 dark:bg-[#2d6a42]/10 dark:hover:bg-[#2d6a42]/20 text-gray-700 dark:text-gray-300 h-6 md:h-7 px-1.5 md:px-2 text-xs md:text-sm"
                onClick={() => {
                  setWithdrawalBalanceType("PROFIT_DEALS");
                  withdrawalModal.open();
                }}
              >
                <Wallet
                  className="h-3 w-3 mr-0.5 md:mr-1"
                  style={{ color: "#006039" }}
                />
                <span className="hidden sm:inline">Вывод средств</span>
                <span className="sm:hidden">Вывод</span>
              </Button>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg md:text-2xl font-bold text-[#006039] dark:text-[#2d6a42]">
                +{(financials?.profitFromDeals || 0).toFixed(2)}
              </span>
              <span className="text-xs md:text-sm font-medium text-[#006039] dark:text-[#2d6a42]">
                USDT
              </span>
            </div>
            <div
              className="flex items-center gap-1 text-xs md:text-sm"
              style={{ color: "#006039" }}
            >
              <TrendingUp className="h-3 w-3" style={{ color: "#006039" }} />
              <span className="dark:text-[#2d6a42]">+8.3%</span>
            </div>
          </div>
        </Card>

        {/* Прибыль с выплат */}
        <Card className="p-4 md:p-6 flex-1 min-w-[150px] sm:min-w-[320px] dark:bg-[#29382f] dark:border-gray-700">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                Прибыль с выплат
              </span>
              <Button
                size="sm"
                className="bg-[#006039]/10 hover:bg-[#006039]/20 dark:bg-[#2d6a42]/10 dark:hover:bg-[#2d6a42]/20 text-gray-700 dark:text-gray-300 h-6 md:h-7 px-1.5 md:px-2 text-xs md:text-sm"
                onClick={() => {
                  setWithdrawalBalanceType("PROFIT_PAYOUTS");
                  withdrawalModal.open();
                }}
              >
                <Wallet
                  className="h-3 w-3 mr-0.5 md:mr-1"
                  style={{ color: "#006039" }}
                />
                <span className="hidden sm:inline">Вывод средств</span>
                <span className="sm:hidden">Вывод</span>
              </Button>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg md:text-2xl font-bold text-[#006039] dark:text-[#2d6a42]">
                +{(financials?.profitFromPayouts || 0).toFixed(2)}
              </span>
              <span className="text-xs md:text-sm font-medium text-[#006039] dark:text-[#2d6a42]">
                USDT
              </span>
            </div>
            <div
              className="flex items-center gap-1 text-xs md:text-sm"
              style={{ color: "#006039" }}
            >
              <TrendingUp className="h-3 w-3" style={{ color: "#006039" }} />
              <span className="dark:text-[#2d6a42]">+15.2%</span>
            </div>
          </div>
        </Card>

        {/* РЕФЕРАЛЬНЫЙ БАЛАНС */}
        <Card className="p-4 md:p-6 flex-1 min-w-[150px] sm:min-w-[320px] dark:bg-[#29382f] dark:border-gray-700">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                РЕФЕРАЛЬНЫЙ БАЛАНС
              </span>
              <Button
                size="sm"
                className="bg-[#006039]/10 hover:bg-[#006039]/20 dark:bg-[#2d6a42]/10 dark:hover:bg-[#2d6a42]/20 text-gray-700 dark:text-gray-300 h-6 md:h-7 px-1.5 md:px-2 text-xs md:text-sm"
                onClick={() => {
                  setWithdrawalBalanceType("REFERRAL");
                  withdrawalModal.open();
                }}
              >
                <Wallet
                  className="h-3 w-3 mr-0.5 md:mr-1"
                  style={{ color: "#006039" }}
                />
                <span className="hidden sm:inline">Вывод средств</span>
                <span className="sm:hidden">Вывод</span>
              </Button>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg md:text-2xl font-bold dark:text-[#eeeeee]">
                {(financials?.referralBalance || 0).toFixed(2)}
              </span>
              <span className="text-xs md:text-sm font-medium text-[#006039] dark:text-[#2d6a42]">
                USDT
              </span>
            </div>
            <div
              className="flex items-center gap-1 text-xs md:text-sm"
              style={{ color: "#006039" }}
            >
              <TrendingUp className="h-3 w-3" style={{ color: "#006039" }} />
              <span className="dark:text-[#2d6a42]">+5.7%</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Frozen Funds Section */}
      <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-gray-400 dark:text-gray-500">
        Замороженные средства
      </h2>
      <div className="flex flex-wrap gap-3 md:gap-4">
        {/* Замороженные в сделках */}
        <Card className="p-4 md:p-6 flex-1 min-w-[150px] sm:min-w-[240px] dark:bg-[#29382f] dark:border-gray-700">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                ЗАМОРОЖЕНО В СДЕЛКАХ
              </span>
              <Shield className="h-4 w-4 text-[#006039] dark:text-[#2d6a42]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg md:text-2xl font-bold dark:text-[#eeeeee]">
                {(financials?.frozenUsdt || 0).toFixed(2)}
              </span>
              <span className="text-xs md:text-sm font-medium text-[#006039] dark:text-[#2d6a42]">
                USDT
              </span>
            </div>
            <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
              Средства в активных сделках и выводах
            </div>
          </div>
        </Card>

        {/* ЭСКРОУ-СЧЕТ */}
        <Card className="p-4 md:p-6 flex-1 min-w-[150px] sm:min-w-[240px] dark:bg-[#29382f] dark:border-gray-700">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                ЭСКРОУ-СЧЕТ (ПРОВОДИТСЯ СДЕЛКА)
              </span>
              <Shield className="h-4 w-4 text-[#006039] dark:text-[#2d6a42]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg md:text-2xl font-bold dark:text-[#eeeeee]">
                {(financials?.escrowBalance || 0).toFixed(2)}
              </span>
              <span className="text-xs md:text-sm font-medium text-[#006039] dark:text-[#2d6a42]">
                USDT
              </span>
            </div>
            <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
              Средства в эскроу для активных сделок (проводится сделка)
            </div>
          </div>
        </Card>

        {/* СПОРНЫЕ СДЕЛКИ */}
        <Card className="p-4 md:p-6 flex-1 min-w-[150px] sm:min-w-[240px] dark:bg-[#29382f] dark:border-gray-700">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                СПОРНЫЕ СДЕЛКИ
              </span>
              <AlertCircle className="h-4 w-4 text-[#006039] dark:text-[#2d6a42]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg md:text-2xl font-bold dark:text-[#eeeeee]">
                {(financials?.disputedBalance || 0).toFixed(2)}
              </span>
              <span className="text-xs md:text-sm font-medium text-[#006039] dark:text-[#2d6a42]">
                USDT
              </span>
            </div>
            <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
              Замороженные средства в спорных сделках
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full sm:w-fit grid-cols-2 gap-1 bg-gray-50 dark:bg-[#0f0f0f] p-1">
          <TabsTrigger
            value="operations"
            className="data-[state=active]:bg-[#006039]/10 dark:data-[state=active]:bg-[#2d6a42]/10 h-10 md:h-12 data-[state=active]:text-gray-900 dark:data-[state=active]:text-[#eeeeee] data-[state=active]:shadow-sm px-3 md:px-6 text-xs md:text-sm"
          >
            <WalletIcon
              className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-2"
              style={{ color: "#006039" }}
            />
            <span className="hidden sm:inline">Все операции</span>
            <span className="sm:hidden">Операции</span>
          </TabsTrigger>
          <TabsTrigger
            value="deposits"
            className="data-[state=active]:bg-[#006039]/10 dark:data-[state=active]:bg-[#2d6a42]/10 h-10 md:h-12 data-[state=active]:text-gray-900 dark:data-[state=active]:text-[#eeeeee] data-[state=active]:shadow-sm px-3 md:px-6 text-xs md:text-sm"
          >
            <BanknoteIcon
              className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-2"
              style={{ color: "#006039" }}
            />
            <span className="hidden sm:inline">Заявки на пополнение</span>
            <span className="sm:hidden">Пополнения</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="mt-4 md:mt-6">
          <Card className="p-4 md:p-6 dark:bg-[#29382f] dark:border-gray-700">
            {/* Filters */}
            <div className="sticky top-0 z-10 bg-white dark:bg-[#29382f] pb-4 md:pb-6 -mx-4 md:-mx-6 px-4 md:px-6 pt-4 md:pt-6 shadow-sm dark:shadow-none">
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 md:gap-3">
                <div className="flex-1 min-w-0 sm:min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <Input
                      placeholder="Поиск..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-9 md:h-10 text-sm md:text-base dark:bg-[#0f0f0f] dark:border-gray-600 dark:text-[#eeeeee] dark:placeholder-gray-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 flex-1 sm:flex-initial">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="flex-1 sm:flex-initial sm:w-[180px] h-9 md:h-10 text-sm md:text-base dark:bg-[#0f0f0f] dark:border-gray-600 dark:text-[#eeeeee]">
                      <Filter className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-2 text-green-700 dark:text-[#2d6a42]" />
                      <SelectValue placeholder="Тип" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-[#29382f] dark:border-gray-700">
                      <SelectItem value="all">Все операции</SelectItem>
                      <SelectItem value="deposit">Пополнения</SelectItem>
                      <SelectItem value="withdrawal">Выводы</SelectItem>
                      <SelectItem value="commission">Комиссии</SelectItem>
                      <SelectItem value="freeze">Заморозки</SelectItem>
                      <SelectItem value="unfreeze">Разморозки</SelectItem>
                      <SelectItem value="profit">Прибыль</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="flex-1 sm:flex-initial sm:w-[150px] h-9 md:h-10 text-sm md:text-base dark:bg-[#0f0f0f] dark:border-gray-600 dark:text-[#eeeeee]">
                      <ArrowUpDown className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-2 text-green-700 dark:text-[#2d6a42]" />
                      <SelectValue placeholder="Статус" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-[#29382f] dark:border-gray-700">
                      <SelectItem value="all">Все статусы</SelectItem>
                      <SelectItem value="completed">Завершено</SelectItem>
                      <SelectItem value="pending">Ожидает</SelectItem>
                      <SelectItem value="active">Активно</SelectItem>
                      <SelectItem value="failed">Ошибка</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="hidden sm:flex sm:w-[140px] h-9 md:h-10 text-sm md:text-base dark:bg-[#0f0f0f] dark:border-gray-600 dark:text-[#eeeeee]">
                      <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-2 text-green-700 dark:text-[#2d6a42]" />
                      <SelectValue placeholder="Период" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-[#29382f] dark:border-gray-700">
                      <SelectItem value="today">Сегодня</SelectItem>
                      <SelectItem value="week">Неделя</SelectItem>
                      <SelectItem value="month">Месяц</SelectItem>
                      <SelectItem value="year">Год</SelectItem>
                      <SelectItem value="all">Все время</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Operations List */}
            <div className="space-y-2 md:space-y-3">
              {filteredOperations.map((operation) => (
                <div
                  key={operation.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 md:p-4 bg-gray-50 dark:bg-[#29382f]/50 rounded-lg hover:bg-gray-100 dark:hover:bg-[#29382f]/70 transition-colors gap-3 sm:gap-0"
                >
                  <div className="flex items-start sm:items-center gap-3 md:gap-4">
                    <div
                      className={cn(
                        "p-1.5 md:p-2 bg-white dark:bg-[#0f0f0f] rounded-lg flex-shrink-0",
                        getOperationColor(operation.type),
                      )}
                    >
                      {getOperationIcon(operation.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm md:text-base dark:text-[#eeeeee] truncate">
                        {operation.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-1">
                        <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(operation.date)}
                        </span>
                        {operation.txHash && (
                          <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-mono">
                            {operation.txHash.slice(0, 6)}...
                          </span>
                        )}
                        {operation.dealId && (
                          <Badge variant="secondary" className="text-xs">
                            {operation.dealId}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:block sm:text-right">
                    <div
                      className={cn(
                        "font-semibold text-sm md:text-base",
                        operation.type === "deposit" ||
                          operation.type === "unfreeze" ||
                          operation.type === "profit"
                          ? "text-[#006039]"
                          : operation.type === "withdrawal" ||
                              operation.type === "commission" ||
                              operation.type === "freeze"
                            ? "text-red-600"
                            : "text-gray-900",
                      )}
                    >
                      {operation.type === "deposit" ||
                      operation.type === "unfreeze" ||
                      operation.type === "profit"
                        ? "+"
                        : "-"}
                      {operation.amount.toFixed(2)} {operation.currency}
                    </div>
                    <div className="sm:mt-1">
                      {getStatusBadge(operation.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredOperations.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Wallet className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p>Операции не найдены</p>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="deposits" className="mt-4 md:mt-6">
          <Card className="p-4 md:p-6 dark:bg-[#29382f] dark:border-gray-700">
            <div className="space-y-3 md:space-y-4"></div>

            {mockDepositRequests.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Upload className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p>Заявки на пополнение не найдены</p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <DepositDialog
        open={depositModal.isOpen}
        onOpenChange={depositModal.setOpen}
        depositType={depositType}
      />
      <WithdrawalDialog
        open={withdrawalModal.isOpen}
        onOpenChange={withdrawalModal.setOpen}
        defaultBalanceType={withdrawalBalanceType}
      />
    </div>
  );
}
