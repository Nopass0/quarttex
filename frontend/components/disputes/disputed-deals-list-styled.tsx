"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { traderApi } from "@/services/api";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Search,
  Filter,
  Calendar,
  ChevronDown,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TraderHeader } from "@/components/trader/trader-header";
import { DisputeDetailDialog } from "@/components/disputes/dispute-detail-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DisputedTransaction {
  id: string;
  numericId: number;
  amount: number;
  currency: string;
  status: string;
  clientName: string;
  assetOrBank: string;
  createdAt: string;
  acceptedAt: string | null;
  expired_at: string;
  merchantName?: string;
  disputeId: string;
  disputeStatus: string;
  disputeReason?: string;
  disputeCreatedAt: string;
}

const disputeStatusConfig = {
  OPEN: {
    label: "Открыт",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: AlertCircle,
  },
  IN_PROGRESS: {
    label: "На рассмотрении",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: Clock,
  },
  RESOLVED_SUCCESS: {
    label: "Решен в вашу пользу",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle,
  },
  RESOLVED_FAIL: {
    label: "Решен не в вашу пользу",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: XCircle,
  },
  CANCELLED: {
    label: "Отменен",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: XCircle,
  },
};

export function DisputedDealsListStyled() {
  const [disputes, setDisputes] = useState<DisputedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<any>(null);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const response = await traderApi.getDisputes({ type: "deal" });

      if (response?.disputes) {
        setDisputes(response.disputes);
      }
    } catch (error) {
      console.error("Error fetching disputes:", error);
      toast.error("Не удалось загрузить споры");
    } finally {
      setLoading(false);
    }
  };

  const filteredDisputes = disputes.filter((dispute) => {
    if (filterStatus !== "all" && dispute.disputeStatus !== filterStatus)
      return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        dispute.numericId.toString().includes(query) ||
        dispute.clientName.toLowerCase().includes(query) ||
        dispute.merchantName?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const sortedDisputes = [...filteredDisputes].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return (
          new Date(b.disputeCreatedAt).getTime() -
          new Date(a.disputeCreatedAt).getTime()
        );
      case "oldest":
        return (
          new Date(a.disputeCreatedAt).getTime() -
          new Date(b.disputeCreatedAt).getTime()
        );
      case "amount_asc":
        return a.amount - b.amount;
      case "amount_desc":
        return b.amount - a.amount;
      default:
        return 0;
    }
  });

  const handleViewDispute = (dispute: DisputedTransaction) => {
    setSelectedDispute({
      id: dispute.disputeId,
      type: "deal",
      status: dispute.disputeStatus,
      amount: dispute.amount,
      currency: dispute.currency,
      transactionId: dispute.numericId,
      reason: dispute.disputeReason,
      createdAt: dispute.disputeCreatedAt,
      merchantName: dispute.merchantName,
    });
    setShowDisputeDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-[#006039]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Споры по сделкам</h1>
        <TraderHeader />
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Поиск по номеру, клиенту или мерчанту..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Сортировка" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Сначала новые</SelectItem>
            <SelectItem value="oldest">Сначала старые</SelectItem>
            <SelectItem value="amount_desc">По сумме ↓</SelectItem>
            <SelectItem value="amount_asc">По сумме ↑</SelectItem>
          </SelectContent>
        </Select>

        <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Фильтры
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div>
                <Label>Статус спора</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="OPEN">Открытые</SelectItem>
                    <SelectItem value="IN_PROGRESS">На рассмотрении</SelectItem>
                    <SelectItem value="RESOLVED_SUCCESS">
                      Решены в вашу пользу
                    </SelectItem>
                    <SelectItem value="RESOLVED_FAIL">
                      Решены не в вашу пользу
                    </SelectItem>
                    <SelectItem value="CANCELLED">Отмененные</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Дата от</Label>
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Дата до</Label>
                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                  />
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setFilterStatus("all");
                  setFilterDateFrom("");
                  setFilterDateTo("");
                  setFiltersOpen(false);
                }}
              >
                Сбросить фильтры
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Всего споров</div>
          <div className="text-2xl font-bold">{disputes.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Открытых</div>
          <div className="text-2xl font-bold text-yellow-600">
            {disputes.filter((d) => d.disputeStatus === "OPEN").length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">На рассмотрении</div>
          <div className="text-2xl font-bold text-blue-600">
            {disputes.filter((d) => d.disputeStatus === "IN_PROGRESS").length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Решенных</div>
          <div className="text-2xl font-bold text-green-600">
            {
              disputes.filter((d) => d.disputeStatus.startsWith("RESOLVED"))
                .length
            }
          </div>
        </Card>
      </div>

      {/* Disputes List */}
      <div className="space-y-4">
        {sortedDisputes.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            Нет споров по заданным критериям
          </Card>
        ) : (
          sortedDisputes.map((dispute) => {
            const statusConfig =
              disputeStatusConfig[
                dispute.disputeStatus as keyof typeof disputeStatusConfig
              ];
            const StatusIcon = statusConfig?.icon || AlertCircle;

            return (
              <Card key={dispute.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{dispute.numericId}</h3>
                      <Badge className={cn("border", statusConfig?.color)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig?.label}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(
                          new Date(dispute.disputeCreatedAt),
                          "d MMM yyyy",
                          { locale: ru },
                        )}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-gray-600">Сумма</p>
                        <p className="font-medium">
                          {dispute.amount.toLocaleString("ru-RU")} ₽
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Клиент</p>
                        <p className="font-medium">{dispute.clientName}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Банк</p>
                        <p className="font-medium">{dispute.assetOrBank}</p>
                      </div>
                    </div>

                    {dispute.disputeReason && (
                      <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                        <span className="text-gray-600">Причина спора:</span>{" "}
                        <span className="text-gray-900">
                          {dispute.disputeReason}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                      <span>
                        Создан:{" "}
                        {format(
                          new Date(dispute.createdAt),
                          "d MMM yyyy 'в' HH:mm",
                          { locale: ru },
                        )}
                      </span>
                      {dispute.acceptedAt && (
                        <>
                          <span>•</span>
                          <span>
                            Принят:{" "}
                            {format(
                              new Date(dispute.acceptedAt),
                              "d MMM yyyy 'в' HH:mm",
                              { locale: ru },
                            )}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleViewDispute(dispute)}
                    className="bg-[#006039] hover:bg-[#006039]/90"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Открыть
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Dispute Detail Dialog */}
      <DisputeDetailDialog
        open={showDisputeDialog}
        onOpenChange={setShowDisputeDialog}
        dispute={selectedDispute}
      />
    </div>
  );
}
