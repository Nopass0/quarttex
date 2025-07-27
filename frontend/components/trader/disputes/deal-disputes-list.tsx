"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { traderApi } from "@/services/api";
import { formatAmount } from "@/lib/utils";
import { DisputeMessagesRealtime } from "@/components/disputes/dispute-messages-realtime";
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
  ChevronRight,
  FileText,
  Building2,
  Calendar,
  Eye,
  Ban,
  CreditCard,
  Smartphone,
  Filter,
  ArrowUpDown,
  SlidersHorizontal,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CustomCalendarPopover } from "@/components/ui/custom-calendar-popover";
// import { io, Socket } from "socket.io-client";

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

interface DealDispute {
  id: string;
  dealId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolution?: string;
  deal: {
    id: string;
    numericId: number;
    amount: number;
    status: string;
    createdAt: string;
    method?: {
      name: string;
    };
    requisites?: {
      id: string;
      recipientName: string;
      cardNumber: string;
      bankType: string;
      device?: {
        id: string;
        name: string;
      };
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
    label: "Идет спор",
    description: "Спор открыт",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
    badgeColor: "bg-yellow-50 text-yellow-700 border-yellow-200",
    icon: Clock
  },
  IN_PROGRESS: {
    label: "Идет спор",
    description: "На рассмотрении",
    color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Clock
  },
  RESOLVED_SUCCESS: {
    label: "Спор принят в сторону мерчанта",
    description: "Решен не в вашу пользу",
    color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    badgeColor: "bg-red-50 text-red-700 border-red-200",
    icon: XCircle
  },
  RESOLVED_FAIL: {
    label: "Спор принят в сторону трейдера",
    description: "Решен в вашу пользу",
    color: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    icon: CheckCircle
  },
  CANCELLED: {
    label: "Отменен",
    description: "Спор отменен",
    color: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600",
    badgeColor: "bg-gray-50 text-gray-700 border-gray-200",
    icon: Ban
  }
};

// Format card number function
const formatCardNumber = (cardNumber: string) => {
  if (!cardNumber) return "****";
  return cardNumber.replace(/(\d{4})(\d{2})(\d+)(\d{4})/, "$1 $2** **** $4");
};

export function DealDisputesList() {
  const { user } = useTraderAuth();
  const { getCurrentTimeoutMinutes, loading: settingsLoading } = useDisputeSettings();
  const [disputes, setDisputes] = useState<DealDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("active");

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterMerchant, setFilterMerchant] = useState("");
  const [filterBank, setFilterBank] = useState("");
  const [filterDevice, setFilterDevice] = useState("");
  const [filterDateRange, setFilterDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  const [sortBy, setSortBy] = useState("date_desc");
  
  // Selected dispute for details
  const [selectedDispute, setSelectedDispute] = useState<DealDispute | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [disputeDetails, setDisputeDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // WebSocket
  // const [socket, setSocket] = useState<Socket | null>(null);
  // const [isConnected, setIsConnected] = useState(false);


  useEffect(() => {
    fetchDisputes();
  }, [filterStatus]);

  // WebSocket connection
  /* useEffect(() => {
    if (!user) return;

    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000';
    const newSocket = io(socketUrl, {
      transports: ['websocket'],
      auth: {
        token: localStorage.getItem('trader-auth-token') || '',
        userType: 'trader'
      }
    });

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket');
      setIsConnected(true);
      
      // Join all dispute rooms for this trader
      disputes.forEach(dispute => {
        newSocket.emit('join-dispute', { disputeId: dispute.id });
      });
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
      setIsConnected(false);
    });

    // Listen for new messages
    newSocket.on('dispute-message', (data: any) => {
      console.log('New dispute message:', data);
      
      // Update dispute details if this dispute is open
      if (disputeDetails && disputeDetails.id === data.disputeId) {
        setDisputeDetails((prev: any) => ({
          ...prev,
          messages: [...prev.messages, data.message]
        }));
      }
      
      // Update dispute in list to show new message count
      setDisputes(prev => prev.map(dispute => 
        dispute.id === data.disputeId
          ? { ...dispute, messages: [...dispute.messages, data.message] }
          : dispute
      ));
    });

    // Listen for dispute status updates
    newSocket.on('dispute-status-update', (data: any) => {
      console.log('Dispute status updated:', data);
      
      // Update dispute in list
      setDisputes(prev => prev.map(dispute => 
        dispute.id === data.disputeId
          ? { ...dispute, status: data.status, resolvedAt: data.resolvedAt, resolution: data.resolution }
          : dispute
      ));
      
      // Update dispute details if open
      if (disputeDetails && disputeDetails.id === data.disputeId) {
        setDisputeDetails((prev: any) => ({
          ...prev,
          status: data.status,
          resolvedAt: data.resolvedAt,
          resolution: data.resolution
        }));
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user, disputes.length]); */

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterStatus !== "all") {
        params.status = filterStatus;
      }

      const response = await traderApi.getDealDisputes(params);
      setDisputes(response.data || []);
    } catch (error) {
      console.error("Failed to fetch disputes:", error);
      toast.error("Не удалось загрузить споры");
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterMerchant("");
    setFilterBank("");
    setFilterDevice("");
    setFilterDateRange({ from: undefined, to: undefined });
    setSortBy("date_desc");
    setSearchQuery("");
  };

  const fetchDisputeDetails = async (id: string) => {
    try {
      setLoadingDetails(true);
      const response = await traderApi.getDealDispute(id);
      setDisputeDetails(response.data);
    } catch (error) {
      console.error("Failed to fetch dispute details:", error);
      toast.error("Не удалось загрузить детали спора");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewDetails = async (dispute: DealDispute) => {
    setSelectedDispute(dispute);
    setShowDetailsDialog(true);
    await fetchDisputeDetails(dispute.id);
    
    // Join dispute room for real-time updates
    // if (socket && isConnected) {
    //   socket.emit('join-dispute', { disputeId: dispute.id });
    // }
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
        dispute.deal.numericId.toString().includes(searchQuery) ||
        dispute.merchant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dispute.deal.requisites?.cardNumber.includes(searchQuery) ||
        dispute.deal.requisites?.recipientName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(d => d.status === filterStatus);
    }

    // Merchant filter
    if (filterMerchant) {
      filtered = filtered.filter(d => 
        d.merchant.name.toLowerCase().includes(filterMerchant.toLowerCase())
      );
    }

    // Bank filter
    if (filterBank) {
      filtered = filtered.filter(d => 
        d.deal.requisites?.bankType === filterBank
      );
    }

    // Device filter
    if (filterDevice) {
      filtered = filtered.filter(d => 
        d.deal.requisites?.device?.name.toLowerCase().includes(filterDevice.toLowerCase())
      );
    }

    // Date range filter
    if (filterDateRange.from || filterDateRange.to) {
      filtered = filtered.filter(d => {
        const disputeDate = new Date(d.createdAt);
        if (filterDateRange.from && disputeDate < filterDateRange.from) return false;
        if (filterDateRange.to && disputeDate > filterDateRange.to) return false;
        return true;
      });
    }

    // Tab filter
    if (activeTab === "active") {
      filtered = filtered.filter(d => ["OPEN", "IN_PROGRESS"].includes(d.status));
    } else {
      filtered = filtered.filter(d => ["RESOLVED_SUCCESS", "RESOLVED_FAIL", "CANCELLED"].includes(d.status));
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "date_asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "date_desc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "amount_asc":
          return a.deal.amount - b.deal.amount;
        case "amount_desc":
          return b.deal.amount - a.deal.amount;
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredDisputes = getFilteredDisputes();

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
        <h1 className="text-3xl font-bold">Споры по сделкам</h1>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Status Filter */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full lg:w-[200px]">
              <SelectValue placeholder="Статус споров" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="OPEN">Открытые</SelectItem>
              <SelectItem value="IN_PROGRESS">На рассмотрении</SelectItem>
              <SelectItem value="RESOLVED_SUCCESS">В пользу мерчанта</SelectItem>
              <SelectItem value="RESOLVED_FAIL">В пользу трейдера</SelectItem>
              <SelectItem value="CANCELLED">Отменены</SelectItem>
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Поиск по ID, карте, имени..."
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
              <SelectItem value="amount_desc">По сумме ↓</SelectItem>
              <SelectItem value="amount_asc">По сумме ↑</SelectItem>
            </SelectContent>
          </Select>

          {/* Filters Button */}
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Фильтры
                {(filterMerchant || filterBank || filterDevice || filterDateRange.from || filterDateRange.to) && (
                  <Badge className="ml-2" variant="secondary">
                    {[filterMerchant, filterBank, filterDevice, filterDateRange.from].filter(Boolean).length}
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
                    <Label className="text-xs">Устройство</Label>
                    <Input
                      placeholder="Название устройства"
                      value={filterDevice}
                      onChange={(e) => setFilterDevice(e.target.value)}
                      className="mt-1"
                    />
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
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            Активные ({disputes.filter(d => d && ["OPEN", "IN_PROGRESS"].includes(d.status)).length})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Завершенные ({disputes.filter(d => d && ["RESOLVED_SUCCESS", "RESOLVED_FAIL", "CANCELLED"].includes(d.status)).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-3 mt-4">
          
          {filteredDisputes.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? "Споры не найдены" : "Нет споров"}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredDisputes.map((dispute) => {
                const statusConfig = disputeStatusConfig[dispute.status as keyof typeof disputeStatusConfig] || disputeStatusConfig.OPEN;
                const StatusIcon = statusConfig?.icon || Clock;
                const isActive = ["OPEN", "IN_PROGRESS"].includes(dispute.status);

                return (
                  <Card
                    key={dispute.id}
                    className="group hover:shadow-lg transition-all cursor-pointer border-gray-200 dark:border-gray-700"
                    onClick={() => handleViewDetails(dispute)}
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

                          {/* Dispute Info */}
                          <div className="flex-1 space-y-3">
                            {/* Status and Date */}
                            <div>
                              <h3 className="font-semibold text-base">
                                {statusConfig?.label || "Неизвестный статус"}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {format(new Date(dispute.createdAt), "d MMMM yyyy 'г.', 'в' HH:mm", { locale: ru })}
                              </p>
                            </div>

                            {/* Deal Details */}
                            <div className="flex items-center gap-6">
                              {/* Bank and Card */}
                              {dispute.deal.requisites && (
                                <div className="flex items-center gap-3">
                                  {getBankIcon(dispute.deal.requisites.bankType, "sm")}
                                  <div>
                                    <p className="text-sm font-medium">
                                      {formatCardNumber(dispute.deal.requisites.cardNumber)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {dispute.deal.requisites.recipientName || "Неизвестно"}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Amount */}
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-semibold">
                                  {formatAmount(dispute.deal.amount)} ₽
                                </span>
                              </div>

                              {/* Device */}
                              {dispute.deal.requisites?.device && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Smartphone className="h-4 w-4" />
                                  <span>{dispute.deal.requisites.device.name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right section - Status Badge or Timer */}
                        <div className="flex items-center gap-3">
                          {isActive && !settingsLoading ? (
                            <DisputeTimerBadge
                              createdAt={dispute.createdAt}
                              timeoutMinutes={getCurrentTimeoutMinutes()}
                              onExpired={() => {
                                toast.error(`Время ответа на спор истекло`);
                                fetchDisputes();
                              }}
                            />
                          ) : (
                            <Badge 
                              className={cn(
                                "px-3 py-1.5",
                                statusConfig?.badgeColor || "bg-gray-50 text-gray-700 border-gray-200"
                              )}
                            >
                              {dispute.status === 'RESOLVED_SUCCESS' ? 'Отклонен' : 
                               dispute.status === 'RESOLVED_FAIL' ? 'Принят' : 
                               'Завершен'}
                            </Badge>
                          )}
                          
                          {/* Messages count */}
                          {dispute.messages && dispute.messages.length > 0 && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <MessageSquare className="h-4 w-4" />
                              <span>{dispute.messages.length}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Additional info */}
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <span className="text-sm text-muted-foreground">
                          ID сделки: #{dispute.deal.numericId}
                        </span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">
                          Мерчант: {dispute.merchant.name}
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

      {/* Details Dialog */}
      <Dialog 
        open={showDetailsDialog} 
        onOpenChange={(open) => {
          setShowDetailsDialog(open);
          // Leave dispute room when closing dialog
          // if (!open && socket && isConnected && selectedDispute) {
          //   socket.emit('leave-dispute', { disputeId: selectedDispute.id });
          // }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Детали спора</DialogTitle>
            {selectedDispute && (
              <DialogDescription>
                Сделка #{selectedDispute.deal.numericId} • {disputeStatusConfig[selectedDispute.status as keyof typeof disputeStatusConfig]?.label || "Неизвестный статус"}
              </DialogDescription>
            )}
          </DialogHeader>

          {loadingDetails ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : disputeDetails ? (
            <div className="flex flex-col h-[calc(90vh-120px)]">
              {/* Deal info */}
              <div className="p-6 pt-4 border-b">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Сумма</p>
                    <p className="font-medium">{formatAmount(disputeDetails.deal.amount)} ₽</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Метод</p>
                    <p className="font-medium">{disputeDetails.deal.method?.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Мерчант</p>
                    <p className="font-medium">{disputeDetails.merchant.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Создан</p>
                    <p className="font-medium">
                      {format(new Date(disputeDetails.createdAt), "d MMM yyyy HH:mm", { locale: ru })}
                    </p>
                  </div>
                </div>
                
                {/* Timer for active disputes */}
                {(disputeDetails.status === 'OPEN' || disputeDetails.status === 'IN_PROGRESS') && !settingsLoading && (
                  <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
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
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-hidden">
                <DisputeMessagesRealtime
                  disputeId={disputeDetails.id}
                  messages={disputeDetails.messages || []}
                  userType="trader"
                  userId={user?.id || ""}
                  disputeType="deal"
                  onMessageSent={handleMessageSent}
                  socket={null}
                  isConnected={false}
                  api={traderApi}
                />
              </div>

            </div>
          ) : null}
        </DialogContent>
      </Dialog>

    </div>
  );
}