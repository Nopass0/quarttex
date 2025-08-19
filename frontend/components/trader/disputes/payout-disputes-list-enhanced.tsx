"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { traderApi } from "@/services/api";
import { formatAmount, cn } from "@/lib/utils";
import { DisputeMessages } from "@/components/disputes/dispute-messages";
import { useTraderAuth } from "@/stores/auth";
import { DisputeTimer, DisputeTimerBadge } from "@/components/disputes/dispute-timer";
import { useDisputeSettings } from "@/hooks/use-dispute-settings";
import { 
  Loader2, 
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Search,
  ChevronDown,
  Calendar,
  Ban,
  CheckCircle2,
  Building2,
  Send,
  RefreshCw,
  Filter,
  Copy,
  Eye,
  DollarSign,
  CreditCard,
  Hash
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CustomCalendarPopover } from "@/components/ui/custom-calendar-popover";

interface PayoutDispute {
  id: string;
  payoutId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolution?: string;
  payout: {
    id: string;
    numericId: number;
    amount: number;
    total: number;
    totalUsdt: number;
    currency: string;
    status: string;
    createdAt: string;
    wallet?: string;
    bank?: string;
    merchant?: {
      name: string;
    };
  };
  merchant: {
    id: string;
    name: string;
  };
  messages: any[];
}

const disputeStatusConfig = {
  OPEN: {
    label: "Открыт",
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    icon: AlertCircle
  },
  IN_PROGRESS: {
    label: "На рассмотрении",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    icon: Clock
  },
  RESOLVED_SUCCESS: {
    label: "В вашу пользу",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    icon: CheckCircle
  },
  RESOLVED_FAIL: {
    label: "Не в вашу пользу",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    icon: XCircle
  },
  CANCELLED: {
    label: "Отменен",
    color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    icon: Ban
  }
};

// Bank logos mapping
const bankLogos: Record<string, string> = {
  Сбербанк: "/bank-logos/sberbank.svg",
  Тинькофф: "/bank-logos/tinkoff.svg",
  ВТБ: "/bank-logos/vtb.svg",
  "Альфа-банк": "/bank-logos/alfabank.svg",
  Райффайзен: "/bank-logos/raiffeisen.svg",
  Открытие: "/bank-logos/otkritie.svg",
  Газпромбанк: "/bank-logos/gazprombank.svg",
  СБП: "/bank-logos/sbp.svg",
};

const getBankIcon = (bankType: string, size: "sm" | "md" = "md") => {
  const logoPath = bankLogos[bankType];
  const sizeClasses = size === "sm" ? "w-8 h-8" : "w-10 h-10";

  if (logoPath) {
    return (
      <img
        src={logoPath}
        alt={bankType}
        className={cn(sizeClasses, "object-contain rounded-lg")}
      />
    );
  }

  return (
    <div className={cn(sizeClasses, "bg-gray-100 rounded-lg flex items-center justify-center")}>
      <CreditCard className="h-5 w-5 text-gray-400" />
    </div>
  );
};

export function PayoutDisputesListEnhanced() {
  const { user } = useTraderAuth();
  const { getCurrentTimeoutMinutes, loading: settingsLoading } = useDisputeSettings();
  const [disputes, setDisputes] = useState<PayoutDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("active");
  const [teamEnabled, setTeamEnabled] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState<Date | null>(null);
  const [filterDateTo, setFilterDateTo] = useState<Date | null>(null);

  // Selected dispute for details
  const [selectedDispute, setSelectedDispute] = useState<PayoutDispute | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [disputeDetails, setDisputeDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchDisputes();
  }, [filterStatus, filterDateFrom, filterDateTo]);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const params: any = { type: "PAYOUT" };
      if (filterStatus !== "all") {
        params.status = filterStatus;
      }
      if (filterDateFrom) {
        params.dateFrom = filterDateFrom.toISOString().split("T")[0];
      }
      if (filterDateTo) {
        params.dateTo = filterDateTo.toISOString().split("T")[0];
      }

      const response = await traderApi.getPayoutDisputes(params);
      setDisputes(response.data || []);
    } catch (error) {
      console.error("Failed to fetch payout disputes:", error);
      toast.error("Не удалось загрузить споры по выплатам");
    } finally {
      setLoading(false);
    }
  };

  const fetchDisputeDetails = async (id: string) => {
    try {
      setLoadingDetails(true);
      const response = await traderApi.getPayoutDispute(id);
      setDisputeDetails(response.data);
    } catch (error) {
      console.error("Failed to fetch dispute details:", error);
      toast.error("Не удалось загрузить детали спора");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewDetails = async (dispute: PayoutDispute) => {
    setSelectedDispute(dispute);
    setShowDetailsDialog(true);
    await fetchDisputeDetails(dispute.id);
  };

  const handleMessageSent = (message: any) => {
    if (disputeDetails) {
      setDisputeDetails({
        ...disputeDetails,
        messages: [...disputeDetails.messages, message]
      });
    }
  };

  const getFilteredDisputes = () => {
    let filtered = disputes;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(dispute => 
        dispute.payout.numericId.toString().includes(searchQuery) ||
        dispute.merchant.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Tab filter
    if (activeTab === "active") {
      filtered = filtered.filter(d => ["OPEN", "IN_PROGRESS"].includes(d.status));
    } else if (activeTab === "resolved") {
      filtered = filtered.filter(d => ["RESOLVED_SUCCESS", "RESOLVED_FAIL", "CANCELLED"].includes(d.status));
    }

    return filtered;
  };

  const filteredDisputes = getFilteredDisputes();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#006039]" />
      </div>
    );
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} скопирован`);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4 bg-card">
        <h1 className="text-2xl font-semibold">Споры по выплатам</h1>
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

          <Button
            variant="outline"
            onClick={() => fetchDisputes()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить
          </Button>
        </div>
      </div>

      {/* Filters - Sticky */}
      <div className="sticky top-0 z-10 bg-card px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3 max-xl:flex-wrap">
          {/* Search */}
          <div className="flex-1 max-w-sm max-xl:w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Поиск по ID или мерчанту"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-12"
              />
            </div>
          </div>

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-12 justify-between min-w-[200px] max-xl:w-full"
              >
                <span className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-[#006039]" />
                  {filterStatus === "all" ? "Все статусы" : disputeStatusConfig[filterStatus as keyof typeof disputeStatusConfig]?.label || filterStatus}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px]">
              <DropdownMenuItem onClick={() => setFilterStatus("all")}>
                Все статусы
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterStatus("OPEN")}>
                <AlertCircle className="h-4 w-4 mr-2 text-yellow-600" />
                Открыт
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus("IN_PROGRESS")}>
                <Clock className="h-4 w-4 mr-2 text-blue-600" />
                На рассмотрении
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus("RESOLVED_SUCCESS")}>
                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                В вашу пользу
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus("RESOLVED_FAIL")}>
                <XCircle className="h-4 w-4 mr-2 text-red-600" />
                Не в вашу пользу
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus("CANCELLED")}>
                <Ban className="h-4 w-4 mr-2 text-gray-600" />
                Отменен
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Date Range */}
          <div className="flex items-center gap-2 max-xl:w-full">
            <CustomCalendarPopover
              date={filterDateFrom}
              onDateChange={setFilterDateFrom}
              placeholder="Дата от"
              className="h-12"
            />
            <span className="text-gray-400">—</span>
            <CustomCalendarPopover
              date={filterDateTo}
              onDateChange={setFilterDateTo}
              placeholder="Дата до"
              className="h-12"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="h-12 bg-muted p-1">
            <TabsTrigger value="all" className="h-10">
              Все ({disputes.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="h-10">
              Активные ({disputes.filter(d => ["OPEN", "IN_PROGRESS"].includes(d.status)).length})
            </TabsTrigger>
            <TabsTrigger value="resolved" className="h-10">
              Завершенные ({disputes.filter(d => ["RESOLVED_SUCCESS", "RESOLVED_FAIL", "CANCELLED"].includes(d.status)).length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 pt-2">
        {filteredDisputes.length === 0 ? (
          <Card className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Нет споров для отображения</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredDisputes.map((dispute) => {
              const statusConfig = disputeStatusConfig[dispute.status as keyof typeof disputeStatusConfig];
              const StatusIcon = statusConfig?.icon || AlertCircle;

              return (
                <Card
                  key={dispute.id}
                  className={cn(
                    "p-4 cursor-pointer hover:shadow-md transition-all duration-200",
                    "dark:bg-[#29382f] dark:hover:bg-[#29382f]/80"
                  )}
                  onClick={() => handleViewDetails(dispute)}
                >
                  <div className="flex items-center gap-4">
                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center",
                        dispute.status === "OPEN" && "bg-yellow-100 dark:bg-yellow-900/30",
                        dispute.status === "IN_PROGRESS" && "bg-blue-100 dark:bg-blue-900/30",
                        dispute.status === "RESOLVED_SUCCESS" && "bg-green-100 dark:bg-green-900/30",
                        dispute.status === "RESOLVED_FAIL" && "bg-red-100 dark:bg-red-900/30",
                        dispute.status === "CANCELLED" && "bg-gray-100 dark:bg-gray-700"
                      )}>
                        <StatusIcon className={cn(
                          "h-6 w-6",
                          dispute.status === "OPEN" && "text-yellow-600 dark:text-yellow-400",
                          dispute.status === "IN_PROGRESS" && "text-blue-600 dark:text-blue-400",
                          dispute.status === "RESOLVED_SUCCESS" && "text-green-600 dark:text-green-400",
                          dispute.status === "RESOLVED_FAIL" && "text-red-600 dark:text-red-400",
                          dispute.status === "CANCELLED" && "text-gray-600 dark:text-gray-400"
                        )} />
                      </div>
                    </div>

                    {/* Payout Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-lg">
                          #{dispute.payout.numericId}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", statusConfig?.color)}
                        >
                          {statusConfig?.label}
                        </Badge>
                        {/* Timer for active disputes */}
                        {(dispute.status === 'OPEN' || dispute.status === 'IN_PROGRESS') && !settingsLoading && (
                          <DisputeTimerBadge
                            createdAt={dispute.createdAt}
                            timeoutMinutes={getCurrentTimeoutMinutes()}
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          {dispute.merchant.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(dispute.createdAt), "dd.MM.yyyy HH:mm")}
                        </span>
                      </div>
                    </div>

                    {/* Bank/Wallet */}
                    {dispute.payout.bank && (
                      <div className="flex items-center gap-3">
                        {getBankIcon(dispute.payout.bank, "sm")}
                        <div>
                          <div className="text-sm font-medium">
                            {dispute.payout.wallet}
                          </div>
                          <div className="text-xs text-gray-500">
                            {dispute.payout.bank}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Amount */}
                    <div className="text-right">
                      <div className="font-semibold text-lg">
                        {dispute.payout.totalUsdt?.toFixed(2) || "0.00"} USDT
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatAmount(dispute.payout.total || dispute.payout.amount)} ₽
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(dispute);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(dispute.payout.numericId.toString(), "ID выплаты");
                            }}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Копировать ID
                          </DropdownMenuItem>
                          {dispute.payout.wallet && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(dispute.payout.wallet, "Реквизиты");
                              }}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Копировать реквизиты
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Спор по выплате #{selectedDispute?.payout.numericId}</DialogTitle>
            <DialogDescription>
              {selectedDispute && (
                <div className="flex items-center gap-4 mt-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-sm",
                      disputeStatusConfig[selectedDispute.status as keyof typeof disputeStatusConfig]?.color
                    )}
                  >
                    {disputeStatusConfig[selectedDispute.status as keyof typeof disputeStatusConfig]?.label}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    Создан {format(new Date(selectedDispute.createdAt), "dd.MM.yyyy HH:mm")}
                  </span>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {loadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : disputeDetails ? (
            <div className="flex-1 overflow-y-auto">
              {/* Timer for active disputes */}
              {(disputeDetails.status === 'OPEN' || disputeDetails.status === 'IN_PROGRESS') && !settingsLoading && (
                <div className="mx-6 mt-4 mb-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                        Время на ответ:
                      </p>
                      <DisputeTimer
                        createdAt={disputeDetails.createdAt}
                        timeoutMinutes={getCurrentTimeoutMinutes()}
                        onExpired={() => {
                          toast.error('Время ответа истекло. Спор будет закрыт в пользу мерчанта.');
                          setShowDetailsDialog(false);
                          fetchDisputes();
                        }}
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-orange-600 dark:text-orange-400">
                        {getCurrentTimeoutMinutes()} минут на ответ
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <DisputeMessages
                disputeId={disputeDetails.id}
                messages={disputeDetails.messages}
                userType="TRADER"
                userId={user?.id}
                onMessageSent={handleMessageSent}
                disputeType="PAYOUT"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}