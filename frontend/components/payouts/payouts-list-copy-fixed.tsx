"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  X,
  CreditCard,
  Clock,
  Copy,
  CalendarIcon,
  ChevronDown,
  Eye,
  CheckCircle,
  Building2,
  Wallet,
  Hash,
  UserRound,
  Phone,
  Filter,
  User,
  LogOut,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTraderAuth } from "@/stores/auth";
import { traderApi } from "@/services/api";
import { payoutApi, type Payout as ApiPayout } from "@/services/payout-api";
import { useRouter } from "next/navigation";

interface Payout {
  id: number;
  uuid: string; // The actual payout ID for API calls
  amount: number;
  amountUsdt: number;
  wallet: string;
  bank: string;
  total: number;
  totalUsdt: number;
  rate: number;
  isCard: boolean;
  created_at: string;
  accepted_at?: string | null;
  expire_at: string;
  confirmed_at: string | null;
  status?: "created" | "active" | "checking" | "expired" | "completed" | "cancelled";
}

interface TraderProfile {
  id: number;
  numericId: number;
  email: string;
}

export function PayoutsList() {
  const router = useRouter();
  const logout = useTraderAuth((state) => state.logout);
  const [selectedTrafficType, setSelectedTrafficType] = useState<number[]>([]);
  const [selectedBanks, setSelectedBanks] = useState<number[]>([]);
  const [selectedCardBanks, setSelectedCardBanks] = useState<number[]>([]);
  const [balanceInput, setBalanceInput] = useState("");
  const [showIdSearch, setShowIdSearch] = useState(false);
  const [searchId, setSearchId] = useState("");
  const [showRequisitesSearch, setShowRequisitesSearch] = useState(false);
  const [searchRequisites, setSearchRequisites] = useState("");
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [teamEnabled, setTeamEnabled] = useState(false);
  const [traderProfile, setTraderProfile] = useState<TraderProfile | null>(
    null,
  );
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [selectedPayoutForAction, setSelectedPayoutForAction] = useState<number | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [payoutBalance, setPayoutBalance] = useState({
    available: 0,
    frozen: 0,
    total: 0,
  });
  const [activeTab, setActiveTab] = useState("all");

  // Bank logos mapping
  const bankLogos: Record<string, string> = {
    Сбербанк: "/bank-logos/sberbank.svg",
    Тинькофф: "/bank-logos/tinkoff.svg",
    ВТБ: "/bank-logos/vtb.svg",
    "Альфа-банк": "/bank-logos/alfabank.svg",
    Райффайзен: "/bank-logos/raiffeisen.svg",
    Открытие: "/bank-logos/otkritie.svg",
    Газпромбанк: "/bank-logos/gazprombank.svg",
    Росбанк: "/bank-logos/rosbank.svg",
    "МТС Банк": "/bank-logos/mts.svg",
    "Почта Банк": "/bank-logos/pochtabank.svg",
    Совкомбанк: "/bank-logos/sovcombank.svg",
    "Хоум Кредит": "/bank-logos/homecredit.svg",
    СБП: "/bank-logos/sbp.svg",
  };

  // Helper functions
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} скопирован`);
  };

  const formatRemainingTime = (expire_at: string) => {
    const now = new Date().getTime();
    const expiresAt = new Date(expire_at).getTime();
    const diff = expiresAt - now;

    if (diff <= 0) return "Истекло";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
    } else {
      return `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    }
  };

  const getStatusColor = (payout: Payout) => {
    const now = new Date().getTime();
    const expiresAt = new Date(payout.expire_at).getTime();

    if (payout.status === "completed" || payout.confirmed_at) {
      return "bg-green-100 text-green-700";
    } else if (payout.status === "cancelled") {
      return "bg-red-100 text-red-700";
    } else if (payout.status === "checking") {
      return "bg-purple-100 text-purple-700";
    } else if (
      payout.status === "expired" ||
      (expiresAt < now && !payout.accepted_at)
    ) {
      return "bg-gray-100 text-gray-700";
    } else if (payout.status === "active" || payout.accepted_at) {
      return "bg-blue-100 text-blue-700";
    } else {
      return "bg-yellow-100 text-yellow-700";
    }
  };

  const getStatusText = (payout: Payout) => {
    const now = new Date().getTime();
    const expiresAt = new Date(payout.expire_at).getTime();

    if (payout.status === "completed" || payout.confirmed_at) {
      return "Выполнено";
    } else if (payout.status === "cancelled") {
      return "Отменено";
    } else if (payout.status === "checking") {
      return "Проверка";
    } else if (
      payout.status === "expired" ||
      (expiresAt < now && !payout.accepted_at)
    ) {
      return "Истекло";
    } else if (payout.status === "active" || payout.accepted_at) {
      return formatRemainingTime(payout.expire_at);
    } else {
      return "Доступно";
    }
  };

  // Effects
  useEffect(() => {
    // Update timers every second
    const interval = setInterval(() => {
      // Force re-render to update timers
      setBalanceInput((prev) => prev);
    }, 1000);

    return () => clearInterval(interval);
  }, []);
  
  // Handle scroll to load more
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const scrolledToBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
    
    if (scrolledToBottom && hasMore && !loadingMore) {
      fetchPayouts(true);
    }
  };

  useEffect(() => {
    // Load team state from localStorage
    const savedTeamState = localStorage.getItem("teamEnabled");
    if (savedTeamState !== null) {
      setTeamEnabled(savedTeamState === "true");
    }

    // Fetch initial data
    fetchTraderProfile();
    fetchPayouts();
    fetchPayoutBalance();
  }, []);

  useEffect(() => {
    // Save team state to localStorage whenever it changes
    localStorage.setItem("teamEnabled", teamEnabled.toString());
  }, [teamEnabled]);
  
  useEffect(() => {
    // Refetch payouts when tab changes
    fetchPayouts();
  }, [activeTab]);

  const fetchTraderProfile = async () => {
    try {
      const response = await traderApi.getProfile();
      if (response) {
        setTraderProfile({
          id: response.id || 0,
          numericId: response.numericId || 0,
          email: response.email || "trader@example.com",
        });
      }
    } catch (error) {
      console.error("Failed to fetch trader profile:", error);
      // Don't set mock data, just leave it null
    }
  };

  const handleLogout = () => {
    logout();
    if (typeof window !== "undefined") {
      localStorage.removeItem("trader-auth");
    }
    router.push("/trader/login");
  };
  
  const fetchPayouts = async (loadMore = false) => {
    if (loadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setPage(0);
    }
    
    try {
      let status: string | undefined;
      switch (activeTab) {
        case "active":
          status = "ACTIVE";
          break;
        case "check":
          status = "CHECKING";
          break;
        case "finalization":
          status = "DISPUTED";
          break;
        case "history":
          status = "COMPLETED";
          break;
        case "cancelled":
          status = "CANCELLED,EXPIRED";
          break;
        case "all":
        default:
          status = undefined;
          break;
      }
      
      const limit = 20;
      const offset = loadMore ? page * limit : 0;
      
      const response = await payoutApi.getPayouts({
        status,
        search: searchId || searchRequisites || undefined,
        limit,
        offset,
      });
      
      if (response.success) {
        // Convert API payouts to component format
        const formattedPayouts: Payout[] = response.payouts.map(p => ({
          id: p.numericId,
          uuid: p.id, // Store the UUID for API calls
          amount: p.amount,
          amountUsdt: p.amountUsdt,
          wallet: p.wallet,
          bank: p.bank,
          total: p.total,
          totalUsdt: p.totalUsdt,
          rate: p.rate,
          isCard: p.isCard,
          created_at: p.createdAt,
          accepted_at: p.acceptedAt,
          expire_at: p.expireAt,
          confirmed_at: p.confirmedAt,
          status: p.status.toLowerCase() as any,
        }));
        
        if (loadMore) {
          setPayouts(prev => [...prev, ...formattedPayouts]);
          setPage(prev => prev + 1);
        } else {
          setPayouts(formattedPayouts);
          setPage(1);
        }
        
        setHasMore(formattedPayouts.length === limit);
      }
    } catch (error) {
      console.error("Failed to fetch payouts:", error);
      // Don't use mock data, just show empty state
      if (!loadMore) {
        setPayouts([]);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };
  
  const fetchPayoutBalance = async () => {
    try {
      const response = await payoutApi.getBalance();
      if (response.success) {
        setPayoutBalance(response.balance);
        setBalanceInput(response.balance.available.toString());
      }
    } catch (error) {
      console.error("Failed to fetch payout balance:", error);
      toast.error("Не удалось загрузить баланс");
    }
  };
  
  const handleSaveBalance = async () => {
    try {
      const balance = parseFloat(balanceInput);
      if (isNaN(balance) || balance < 0) {
        toast.error("Неверная сумма баланса");
        return;
      }
      
      const response = await payoutApi.updateBalance(balance);
      if (response.success) {
        setPayoutBalance(response.balance);
        toast.success("Баланс обновлен");
      }
    } catch (error) {
      console.error("Failed to update balance:", error);
      toast.error("Не удалось обновить баланс");
    }
  };
  
  const handleAcceptPayout = async (payoutId: number) => {
    try {
      const payout = payouts.find(p => p.id === payoutId);
      if (!payout) return;
      
      const response = await payoutApi.acceptPayout(payout.uuid);
      if (response.success) {
        toast.success("Выплата принята в работу");
        fetchPayouts();
        fetchPayoutBalance();
      }
    } catch (error: any) {
      console.error("Failed to accept payout:", error);
      const errorMessage = error.response?.data?.error || "Не удалось принять выплату";
      toast.error(errorMessage);
    }
  };
  
  const handleConfirmPayout = async (payoutId: number) => {
    if (!proofFile) {
      toast.error("Загрузите файл подтверждения");
      return;
    }
    
    try {
      const payout = payouts.find(p => p.id === payoutId);
      if (!payout) return;
      
      // TODO: Implement file upload when backend endpoint is ready
      // For now, use mock proof URL
      const mockProofUrl = `proof_${Date.now()}_${proofFile.name}`;
      
      const response = await payoutApi.confirmPayout(payout.uuid, [mockProofUrl]);
      if (response.success) {
        toast.success("Выплата подтверждена");
        setConfirmDialogOpen(false);
        setProofFile(null);
        setSelectedPayoutForAction(null);
        fetchPayouts();
        fetchPayoutBalance();
      }
    } catch (error: any) {
      console.error("Failed to confirm payout:", error);
      const errorMessage = error.response?.data?.error || "Не удалось подтвердить выплату";
      toast.error(errorMessage);
    }
  };
  
  const handleCancelPayout = async (payoutId: number) => {
    if (cancelReason.length < 5) {
      toast.error("Причина отмены должна содержать минимум 5 символов");
      return;
    }
    
    try {
      const payout = payouts.find(p => p.id === payoutId);
      if (!payout) return;
      
      const response = await payoutApi.cancelPayout(payout.uuid, cancelReason);
      if (response.success) {
        toast.success("Выплата отменена");
        setCancelDialogOpen(false);
        setCancelReason("");
        setSelectedPayoutForAction(null);
        fetchPayouts();
        fetchPayoutBalance();
      }
    } catch (error: any) {
      console.error("Failed to cancel payout:", error);
      const errorMessage = error.response?.data?.error || "Не удалось отменить выплату";
      toast.error(errorMessage);
    }
  };

  // Filter payouts locally (server already filters by status)
  const filteredPayouts = payouts.filter((payout) => {
    if (searchId && !payout.id.toString().includes(searchId)) {
      return false;
    }
    if (
      searchRequisites &&
      !payout.wallet.toLowerCase().includes(searchRequisites.toLowerCase()) &&
      !payout.bank.toLowerCase().includes(searchRequisites.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const PayoutCard = ({ payout }: { payout: Payout }) => (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className="bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
          onClick={() => setSelectedPayout(payout)}
        >
          <div className="grid grid-cols-[60px_140px_1fr_160px_160px_100px_180px] gap-4 items-center h-full">
            {/* Icon */}
            <div className="flex items-center justify-center">
              <div className="w-12 h-12 bg-gray-50 rounded-lg shadow-sm flex items-center justify-center">
                {payout.isCard ? (
                  <CreditCard className="h-7 w-7 text-blue-600" />
                ) : (
                  bankLogos[payout.bank] ? (
                    <img
                      src={bankLogos[payout.bank]}
                      alt={payout.bank}
                      className="h-7 w-7"
                    />
                  ) : (
                    <Building2 className="h-7 w-7 text-gray-400" />
                  )
                )}
              </div>
            </div>

            {/* ID and Date */}
            <div className="space-y-0.5">
              <div className="flex items-center gap-1">
                <div
                  className="font-medium text-base hover:text-blue-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(payout.id.toString(), "ID");
                  }}
                >
                  ${payout.id}
                </div>
                <button
                  className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(payout.id.toString(), "ID");
                  }}
                >
                  <Copy className="h-3.5 w-3.5 text-gray-500" />
                </button>
              </div>
              <div className="text-xs text-gray-500">
                {format(new Date(payout.created_at), "HH:mm", {
                  locale: ru,
                })}
              </div>
              {payout.accepted_at && (
                <div className="text-xs text-green-600">
                  {format(new Date(payout.accepted_at), "HH:mm", {
                    locale: ru,
                  })}
                </div>
              )}
            </div>

            {/* Requisites */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-50 rounded-lg shadow-sm flex items-center justify-center flex-shrink-0">
                {bankLogos[payout.bank] ? (
                  <img
                    src={bankLogos[payout.bank]}
                    alt={payout.bank}
                    className="h-7 w-7"
                  />
                ) : (
                  <Building2 className="h-7 w-7 text-gray-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <div className="font-medium text-base truncate">
                    {payout.wallet}
                  </div>
                  <button
                    className="p-0.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(payout.wallet, "Реквизиты");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {payout.bank}
                </div>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <div
                  className="font-medium text-base cursor-pointer hover:text-blue-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(payout.amount.toString(), "Сумма");
                  }}
                >
                  {payout.amount.toLocaleString("ru-RU")} ₽
                </div>
                <button
                  className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(payout.amount.toString(), "Сумма");
                  }}
                >
                  <Copy className="h-3.5 w-3.5 text-gray-500" />
                </button>
              </div>
              <div className="text-sm text-gray-500">
                {payout.amountUsdt.toFixed(2)} USDT
              </div>
            </div>

            {/* Total */}
            <div className="space-y-1">
              <div className="font-medium text-base">
                {payout.total.toLocaleString("ru-RU")} ₽
              </div>
              <div className="text-sm text-gray-500">
                {payout.totalUsdt.toFixed(2)} USDT
              </div>
            </div>

            {/* Rate */}
            <div
              className="font-semibold text-base"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(payout.rate.toFixed(2), "Курс");
              }}
            >
              {payout.rate.toFixed(2)}
            </div>

            {/* Status */}
            {payout.status === "created" ? (
              <Button
                size="sm"
                className="h-9 px-4 bg-[#006039] hover:bg-[#004d2e] text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAcceptPayout(payout.id);
                }}
              >
                Взять в работу
              </Button>
            ) : payout.status === "active" && payout.accepted_at ? (
              <div className="flex items-center gap-2">
                <Badge
                  className={cn(
                    "h-9 px-3 rounded-md flex items-center justify-center gap-1.5 text-sm font-medium transition-none hover:brightness-100",
                    getStatusColor(payout),
                  )}
                  data-badge
                >
                  <Clock className="h-4 w-4" />
                  <span>{getStatusText(payout)}</span>
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-green-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPayoutForAction(payout.id);
                    setConfirmDialogOpen(true);
                  }}
                >
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPayoutForAction(payout.id);
                    setCancelDialogOpen(true);
                  }}
                >
                  <X className="h-5 w-5 text-red-600" />
                </Button>
              </div>
            ) : (
              <Badge
                className={cn(
                  "h-9 px-3 rounded-md flex items-center justify-center gap-1.5 text-sm font-medium transition-none hover:brightness-100",
                  getStatusColor(payout),
                )}
                data-badge
              >
                {payout.status === "completed" || payout.confirmed_at ? (
                  <CheckCircle className="h-4 w-4" />
                ) : payout.status === "cancelled" ? (
                  <X className="h-4 w-4" />
                ) : payout.status === "expired" ||
                  new Date(payout.expire_at).getTime() < new Date().getTime() ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
                <span>{getStatusText(payout)}</span>
              </Badge>
            )}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() =>
            copyToClipboard(`${payout.wallet} ${payout.bank}`, "Реквизиты")
          }
        >
          <Copy className="h-4 w-4 mr-2" />
          Копировать всё
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => copyToClipboard(payout.wallet, "Номер")}
        >
          Копировать номер
        </ContextMenuItem>
        <ContextMenuItem onClick={() => copyToClipboard(payout.bank, "Банк")}>
          Копировать банк
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => setSelectedPayout(payout)}>
          <Eye className="h-4 w-4 mr-2" />
          Подробнее
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );

  const renderPayoutsList = () => (
    <>
      {/* Column Headers */}
      <div className="grid grid-cols-[60px_140px_1fr_160px_160px_100px_180px] gap-4 items-center px-6 py-3 text-sm font-medium text-gray-600 bg-white border-b">
        <div></div>
        <div>Заявка</div>
        <div>Реквизиты</div>
        <div>Сумма</div>
        <div>Сумма к списанию</div>
        <div>Курс</div>
        <div>Статус</div>
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto" onScroll={handleScroll}>
        <div className="p-6 space-y-4">
          {filteredPayouts.map((payout) => (
            <PayoutCard key={payout.id} payout={payout} />
          ))}
          {loadingMore && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-[#006039]" />
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4 bg-white">
        <h1 className="text-2xl font-semibold">Выплаты</h1>
        <div className="flex items-center gap-4">
          {/* Team toggle switch */}
          <div className="flex items-center gap-2">
            <Label htmlFor="team-switch" className="text-sm text-gray-700">
              Команда
            </Label>
            <Switch
              id="team-switch"
              checked={teamEnabled}
              onCheckedChange={setTeamEnabled}
            />
          </div>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 text-sm font-normal hover:bg-black/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-[#006039]" />
                  </div>
                  <span className="text-gray-700 font-medium">
                    ${traderProfile?.numericId || "0000"}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-[#006039]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 focus:text-red-600 hover:bg-gray-50 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4 text-[#006039]" />
                Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Balance and Filters */}
      <div className="bg-white px-6 py-4">
        <div className="flex items-end gap-3">
          {/* Balance Display */}
          <div className="bg-gray-100 rounded-lg px-5 h-12 flex flex-col justify-center min-w-[180px] mr-auto">
            <div className="text-xs text-gray-600">Баланс</div>
            <div className="text-lg font-semibold leading-tight">
              {payoutBalance.available.toLocaleString("ru-RU")} ₽
            </div>
          </div>

          {/* Traffic Type Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Выбор типа трафика:</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-12 justify-between w-[200px]"
                >
                  <span className="flex items-center gap-2">
                    {selectedTrafficType.length === 0
                      ? "СБП"
                      : selectedTrafficType.includes(0) && selectedTrafficType.includes(1)
                      ? "СБП, Карты"
                      : selectedTrafficType.includes(0)
                      ? "СБП"
                      : "Карты"}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuCheckboxItem
                  checked={selectedTrafficType.includes(0)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedTrafficType([...selectedTrafficType, 0]);
                    } else {
                      setSelectedTrafficType(
                        selectedTrafficType.filter((t) => t !== 0),
                      );
                    }
                  }}
                  className="cursor-pointer"
                >
                  {selectedTrafficType.includes(0) && (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  СБП
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={selectedTrafficType.includes(1)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedTrafficType([...selectedTrafficType, 1]);
                    } else {
                      setSelectedTrafficType(
                        selectedTrafficType.filter((t) => t !== 1),
                      );
                    }
                  }}
                  className="cursor-pointer"
                >
                  {selectedTrafficType.includes(1) && (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Карты
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Banks Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Выбор банков СБП:</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-12 justify-between w-[250px]"
                >
                  <span className="flex items-center gap-2">
                    {selectedBanks.length === 0
                      ? "Выберите банки"
                      : `Выбрано: ${selectedBanks.length}`}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[250px]">
                {["Сбербанк", "Тинькофф", "ВТБ", "Альфа-банк", "Райффайзен"]
                  .map((bank, index) => (
                    <DropdownMenuCheckboxItem
                      key={bank}
                      checked={selectedBanks.includes(index)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedBanks([...selectedBanks, index]);
                        } else {
                          setSelectedBanks(
                            selectedBanks.filter((b) => b !== index),
                          );
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {selectedBanks.includes(index) && (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      {bank}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Card Banks Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">
              Выбор банков по картам:
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-12 justify-between w-[250px]"
                >
                  <span className="flex items-center gap-2">
                    {selectedCardBanks.length === 0
                      ? "Выберите банки"
                      : `Выбрано: ${selectedCardBanks.length}`}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[250px]">
                {["Сбербанк", "Тинькофф", "ВТБ", "Альфа-банк", "Райффайзен"]
                  .map((bank, index) => (
                    <DropdownMenuCheckboxItem
                      key={bank}
                      checked={selectedCardBanks.includes(index)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedCardBanks([...selectedCardBanks, index]);
                        } else {
                          setSelectedCardBanks(
                            selectedCardBanks.filter((b) => b !== index),
                          );
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {selectedCardBanks.includes(index) && (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      {bank}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Balance Input */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Баланс</label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="0.00"
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                className="h-12 w-32 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <Button 
                variant="outline" 
                className="h-12 hover:text-current"
                onClick={handleSaveBalance}
              >
                Сохранить
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content with Tabs */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="bg-white px-6 pb-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-12 p-1">
              <TabsTrigger value="all" className="h-10 px-6">
                Все
              </TabsTrigger>
              <TabsTrigger value="active" className="h-10 px-6">
                Активные
              </TabsTrigger>
              <TabsTrigger value="check" className="h-10 px-6">
                Проверка
              </TabsTrigger>
              <TabsTrigger value="finalization" className="h-10 px-6">
                Финализация
              </TabsTrigger>
              <TabsTrigger value="history" className="h-10 px-6">
                История
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="h-10 px-6">
                Отменённые
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Tab Content - Conditional Rendering */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {renderPayoutsList()}
        </div>
      </div>

      {/* Dialogs */}
      {/* Payout Details Dialog */}
      <Dialog
        open={!!selectedPayout}
        onOpenChange={() => setSelectedPayout(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <span>Детали выплаты ${selectedPayout?.id}</span>
                {selectedPayout && (
                  <button
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    onClick={() => copyToClipboard(selectedPayout.id.toString(), "ID выплаты")}
                  >
                    <Copy className="h-4 w-4 text-gray-500" />
                  </button>
                )}
              </div>
            </DialogTitle>
            <DialogDescription>Полная информация о выплате</DialogDescription>
          </DialogHeader>
          {selectedPayout && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Создана</p>
                  <p className="font-medium">
                    {format(
                      new Date(selectedPayout.created_at),
                      "dd.MM.yyyy HH:mm",
                      {
                        locale: ru,
                      },
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Статус</p>
                  <Badge className={cn("mt-1", getStatusColor(selectedPayout))}>
                    {getStatusText(selectedPayout)}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Реквизиты</p>
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="font-medium">{selectedPayout.wallet}</p>
                      <p className="text-sm text-gray-600">{selectedPayout.bank}</p>
                    </div>
                    <button
                      className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                      onClick={() => copyToClipboard(`${selectedPayout.wallet} ${selectedPayout.bank}`, "Реквизиты")}
                    >
                      <Copy className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Курс</p>
                  <p className="font-medium text-lg">{selectedPayout.rate}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Сумма</p>
                  <p className="font-medium">
                    {selectedPayout.amount.toLocaleString("ru-RU")} ₽
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedPayout.amountUsdt.toFixed(2)} USDT
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">К списанию</p>
                  <p className="font-medium">
                    {selectedPayout.total.toLocaleString("ru-RU")} ₽
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedPayout.totalUsdt.toFixed(2)} USDT
                  </p>
                </div>
              </div>
              {selectedPayout.confirmed_at && (
                <div>
                  <p className="text-sm text-gray-500">Подтверждена</p>
                  <p className="font-medium">
                    {format(
                      new Date(selectedPayout.confirmed_at),
                      "dd.MM.yyyy HH:mm",
                      {
                        locale: ru,
                      },
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Отменить выплату</DialogTitle>
            <DialogDescription>
              Укажите причину отмены выплаты. Минимум 5 символов.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Причина отмены</Label>
              <textarea
                id="cancel-reason"
                className="w-full min-h-[100px] px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Опишите причину отмены..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCancelDialogOpen(false);
                  setCancelReason("");
                  setSelectedPayoutForAction(null);
                }}
              >
                Отмена
              </Button>
              <Button
                onClick={() => handleCancelPayout(selectedPayoutForAction!)}
                disabled={cancelReason.length < 5}
                className="bg-red-600 hover:bg-red-700"
              >
                Отменить выплату
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Подтвердить выплату</DialogTitle>
            <DialogDescription>
              Проверьте данные выплаты и загрузите подтверждение.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Payout Details Display */}
            {selectedPayoutForAction && (() => {
              const payout = payouts.find(p => p.id === selectedPayoutForAction);
              if (!payout) return null;
              
              return (
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <h4 className="font-medium text-sm text-gray-700">Данные выплаты:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Реквизиты:</span>
                      <p className="font-medium">{payout.wallet}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Банк:</span>
                      <p className="font-medium">{payout.bank}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Сумма:</span>
                      <p className="font-medium">{payout.amount.toLocaleString("ru-RU")} ₽</p>
                    </div>
                    <div>
                      <span className="text-gray-500">ID транзакции:</span>
                      <p className="font-medium">${payout.id}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
            
            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="proof-file">Файл подтверждения</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
                <input
                  id="proof-file"
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setProofFile(file);
                    }
                  }}
                />
                <label
                  htmlFor="proof-file"
                  className="cursor-pointer flex flex-col items-center"
                >
                  {proofFile ? (
                    <>
                      <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
                      <p className="text-sm font-medium">{proofFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(proofFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        Нажмите для загрузки файла
                      </p>
                      <p className="text-xs text-gray-500">
                        Поддерживаются изображения и PDF
                      </p>
                    </>
                  )}
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setConfirmDialogOpen(false);
                  setProofFile(null);
                  setSelectedPayoutForAction(null);
                }}
              >
                Отмена
              </Button>
              <Button
                onClick={() => handleConfirmPayout(selectedPayoutForAction!)}
                disabled={!proofFile}
                className="bg-green-600 hover:bg-green-700"
              >
                Подтвердить выплату
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}