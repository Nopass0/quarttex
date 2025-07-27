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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { traderApi } from "@/services/api";
import { toast } from "sonner";
import { useTraderAuth } from "@/stores/auth";
import { formatAmount } from "@/lib/utils";
import { BtEntranceList, AddBtRequisiteForm } from "./bt-entrance-list";
import {
  Loader2,
  Search,
  ArrowUpDown,
  SlidersHorizontal,
  X,
  CreditCard,
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
  Settings,
  Plus,
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

interface BtDeal {
  id: string;
  numericId: number;
  amount: number;
  merchantId: string;
  merchantName: string;
  methodType: string;
  bankType: string;
  cardNumber: string;
  recipientName: string;
  status: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  completedAt?: string;
  expiredAt?: string;
  requisiteId: string;
  commission: number;
  rate: number;
  btOnly: boolean;
}

const dealStatusConfig = {
  PENDING: {
    label: "Ожидает принятия",
    description: "Новая сделка",
    color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Clock
  },
  ACCEPTED: {
    label: "Принята",
    description: "Сделка принята трейдером",
    color: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
    badgeColor: "bg-orange-50 text-orange-700 border-orange-200",
    icon: AlertCircle
  },
  READY: {
    label: "Готово",
    description: "Сделка выполнена",
    color: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    icon: CheckCircle
  },
  EXPIRED: {
    label: "Просрочена",
    description: "Время выполнения истекло",
    color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    badgeColor: "bg-red-50 text-red-700 border-red-200",
    icon: XCircle
  },
  CANCELLED: {
    label: "Отменена",
    description: "Сделка отменена",
    color: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600",
    badgeColor: "bg-gray-50 text-gray-700 border-gray-200",
    icon: XCircle
  }
};

// Format card number function
const formatCardNumber = (cardNumber: string) => {
  if (!cardNumber) return "****";
  return cardNumber.replace(/(\d{4})(\d{2})(\d+)(\d{4})/, "$1 $2** **** $4");
};

export function BtEntranceDeals() {
  const { user } = useTraderAuth();
  const [deals, setDeals] = useState<BtDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("deals");
  const [showRequisitesDialog, setShowRequisitesDialog] = useState(false);
  const [showAddRequisiteDialog, setShowAddRequisiteDialog] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDeals, setTotalDeals] = useState(0);

  useEffect(() => {
    fetchDeals();
  }, [filterStatus, searchQuery, currentPage]);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 50,
        ...(filterStatus !== "all" && { status: filterStatus }),
        ...(searchQuery && { search: searchQuery }),
      };

      const response = await traderApi.getBtDeals(params);
      setDeals(response.data || []);
      setTotalDeals(response.total || 0);
      setTotalPages(Math.ceil((response.total || 0) / 50));
    } catch (error) {
      console.error("Failed to fetch BT deals:", error);
      toast.error("Не удалось загрузить BT сделки");
      // Fallback to empty array
      setDeals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (dealId: string, newStatus: string) => {
    try {
      await traderApi.updateBtDealStatus(dealId, newStatus);
      toast.success("Статус сделки обновлен");
      fetchDeals(); // Refresh the list
    } catch (error) {
      console.error("Failed to update deal status:", error);
      toast.error("Не удалось обновить статус сделки");
    }
  };

  const filteredDeals = deals.filter(deal => {
    if (filterStatus !== "all" && deal.status !== filterStatus) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        deal.numericId.toString().includes(query) ||
        deal.merchantName.toLowerCase().includes(query) ||
        deal.cardNumber.includes(query) ||
        deal.recipientName.toLowerCase().includes(query)
      );
    }
    return true;
  });

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
            Сделки для реквизитов без устройств (ручная обработка)
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showRequisitesDialog} onOpenChange={setShowRequisitesDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Реквизиты БТ
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Управление реквизитами БТ-входа</DialogTitle>
              </DialogHeader>
              <BtEntranceList 
                onAddRequisiteClick={() => {
                  setShowRequisitesDialog(false);
                  setShowAddRequisiteDialog(true);
                }}
              />
            </DialogContent>
          </Dialog>

          {/* Add Requisite Dialog */}
          <Dialog 
            open={showAddRequisiteDialog} 
            onOpenChange={(open) => {
              setShowAddRequisiteDialog(open);
              if (!open) {
                // When closing add requisite dialog, reopen the requisites list dialog
                setShowRequisitesDialog(true);
              }
            }}
          >
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Добавление реквизита БТ-входа</DialogTitle>
              </DialogHeader>
              <AddBtRequisiteForm
                onSuccess={async (newRequisite) => {
                  toast.success("Реквизит успешно добавлен");
                  setShowAddRequisiteDialog(false);
                  // Reopen the requisites list dialog
                  setShowRequisitesDialog(true);
                }}
                onCancel={() => {
                  setShowAddRequisiteDialog(false);
                  // Reopen the requisites list dialog
                  setShowRequisitesDialog(true);
                }}
                loading={false}
                setLoading={() => {}}
              />
            </DialogContent>
          </Dialog>
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
              <SelectItem value="PENDING">Ожидает принятия</SelectItem>
              <SelectItem value="ACCEPTED">Принята</SelectItem>
              <SelectItem value="READY">Готово</SelectItem>
              <SelectItem value="EXPIRED">Просрочена</SelectItem>
              <SelectItem value="CANCELLED">Отменена</SelectItem>
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Поиск по номеру, мерчанту, карте..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Deals List */}
      <div className="space-y-3">
        {filteredDeals.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? "Сделки не найдены" : "Нет сделок БТ-входа"}
            </p>
          </Card>
        ) : (
          filteredDeals.map((deal) => {
            const statusConfig = dealStatusConfig[deal.status as keyof typeof dealStatusConfig];
            const StatusIcon = statusConfig?.icon || Clock;

            return (
              <Card
                key={deal.id}
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

                      {/* Deal Info */}
                      <div className="flex-1 space-y-3">
                        {/* Status and Date */}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-base">
                              Сделка #{deal.numericId}
                            </h3>
                            <span className="text-sm text-muted-foreground">
                              • {statusConfig?.label || "Неизвестный статус"}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {format(new Date(deal.createdAt), "d MMMM yyyy 'г.', 'в' HH:mm", { locale: ru })}
                          </p>
                        </div>

                        {/* Deal Details */}
                        <div className="flex items-center gap-6">
                          {/* Bank and Card */}
                          <div className="flex items-center gap-3">
                            {getBankIcon(deal.bankType, "sm")}
                            <div>
                              <p className="text-sm font-medium">
                                {formatCardNumber(deal.cardNumber)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {deal.recipientName || "Неизвестно"}
                              </p>
                            </div>
                          </div>

                          {/* Amount */}
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-primary">
                              {formatAmount(deal.amount)}
                            </span>
                            <span className="text-sm text-muted-foreground">RUB</span>
                          </div>

                          {/* Merchant */}
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {deal.merchantName}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right section - Actions */}
                    <div className="flex items-center gap-3">
                      {deal.status === "PENDING" && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(deal.id, "ACCEPTED")}
                        >
                          Принять
                        </Button>
                      )}
                      {deal.status === "ACCEPTED" && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(deal.id, "READY")}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          Подтвердить
                        </Button>
                      )}
                      <Badge 
                        className={cn(
                          "px-3 py-1.5",
                          statusConfig?.badgeColor || "bg-gray-50 text-gray-700 border-gray-200"
                        )}
                      >
                        {statusConfig?.label || deal.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Additional info */}
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-muted-foreground">
                      БТ-сделка (ручная обработка)
                    </span>
                    <span className="text-sm text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">
                      Комиссия: {formatAmount(deal.commission)} RUB
                    </span>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Предыдущая
          </Button>
          <span className="text-sm text-muted-foreground">
            Страница {currentPage} из {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Следующая
          </Button>
        </div>
      )}
    </div>
  );
}