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
import { DisputeMessages } from "@/components/disputes/dispute-messages";
import { useTraderAuth } from "@/stores/auth";
import { 
  Loader2, 
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Search,
  ChevronRight,
  Calendar,
  Ban,
  CheckCircle2,
  Building2,
  Send,
  RefreshCw,
  Filter
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
    currency: string;
    status: string;
    createdAt: string;
    method?: {
      name: string;
      type: string;
    };
    recipient?: {
      name: string;
      cardNumber?: string;
      walletAddress?: string;
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
    color: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
    icon: AlertCircle
  },
  IN_PROGRESS: {
    label: "На рассмотрении",
    color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    icon: Clock
  },
  RESOLVED_SUCCESS: {
    label: "Решен не в вашу пользу",
    color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    icon: XCircle
  },
  RESOLVED_FAIL: {
    label: "Решен в вашу пользу",
    color: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    icon: CheckCircle
  },
  CANCELLED: {
    label: "Отменен",
    color: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600",
    icon: Ban
  }
};

export function PayoutDisputesList() {
  const { user } = useTraderAuth();
  const [disputes, setDisputes] = useState<PayoutDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("active");

  // Selected dispute for details
  const [selectedDispute, setSelectedDispute] = useState<PayoutDispute | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [disputeDetails, setDisputeDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Resolution dialog
  const [showResolutionDialog, setShowResolutionDialog] = useState(false);
  const [resolutionStatus, setResolutionStatus] = useState<"RESOLVED_SUCCESS" | "RESOLVED_FAIL">("RESOLVED_SUCCESS");
  const [resolutionText, setResolutionText] = useState("");
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    fetchDisputes();
  }, [filterStatus]);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const params: any = { type: "PAYOUT" };
      if (filterStatus !== "all") {
        params.status = filterStatus;
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

  const handleResolveDispute = async () => {
    if (!selectedDispute || !resolutionText.trim()) {
      toast.error("Пожалуйста, укажите решение");
      return;
    }

    try {
      setResolving(true);
      await traderApi.resolvePayoutDispute(selectedDispute.id, {
        status: resolutionStatus,
        resolution: resolutionText
      });

      toast.success("Спор успешно разрешен");
      setShowResolutionDialog(false);
      setShowDetailsDialog(false);
      setResolutionText("");
      await fetchDisputes();
    } catch (error) {
      console.error("Failed to resolve dispute:", error);
      toast.error("Не удалось разрешить спор");
    } finally {
      setResolving(false);
    }
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
        dispute.merchant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dispute.payout.recipient?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Tab filter
    if (activeTab === "active") {
      filtered = filtered.filter(d => ["OPEN", "IN_PROGRESS"].includes(d.status));
    } else {
      filtered = filtered.filter(d => ["RESOLVED_SUCCESS", "RESOLVED_FAIL", "CANCELLED"].includes(d.status));
    }

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
        <h2 className="text-2xl font-bold">Споры по выплатам</h2>
        <Button
          variant="outline"
          onClick={() => fetchDisputes()}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Всего споров</p>
              <p className="text-2xl font-bold">{disputes.length}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-gray-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Активные</p>
              <p className="text-2xl font-bold">
                {disputes.filter(d => ["OPEN", "IN_PROGRESS"].includes(d.status)).length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-blue-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">В вашу пользу</p>
              <p className="text-2xl font-bold">
                {disputes.filter(d => d.status === "RESOLVED_FAIL").length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Не в вашу пользу</p>
              <p className="text-2xl font-bold">
                {disputes.filter(d => d.status === "RESOLVED_SUCCESS").length}
              </p>
            </div>
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Поиск по ID выплаты или мерчанту..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Все статусы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="OPEN">Открытые</SelectItem>
              <SelectItem value="IN_PROGRESS">На рассмотрении</SelectItem>
              <SelectItem value="RESOLVED_SUCCESS">Решены не в вашу пользу</SelectItem>
              <SelectItem value="RESOLVED_FAIL">Решены в вашу пользу</SelectItem>
              <SelectItem value="CANCELLED">Отменены</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            Активные ({disputes.filter(d => ["OPEN", "IN_PROGRESS"].includes(d.status)).length})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Завершенные ({disputes.filter(d => ["RESOLVED_SUCCESS", "RESOLVED_FAIL", "CANCELLED"].includes(d.status)).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-4">
          {filteredDisputes.length === 0 ? (
            <Card className="p-12 text-center">
              <Send className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? "Споры не найдены" : "Нет споров по выплатам"}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredDisputes.map((dispute) => {
                const statusConfig = disputeStatusConfig[dispute.status as keyof typeof disputeStatusConfig];
                const StatusIcon = statusConfig.icon;

                return (
                  <Card
                    key={dispute.id}
                    className="p-4 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => handleViewDetails(dispute)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "p-2 rounded-lg",
                          statusConfig.color.split(" ")[0]
                        )}>
                          <StatusIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">
                              Выплата #{dispute.payout.numericId}
                            </h3>
                            <Badge className={statusConfig.color}>
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {dispute.merchant.name}
                            </span>
                            <span>
                              {formatAmount(dispute.payout.amount)} {dispute.payout.currency}
                            </span>
                            {dispute.payout.method && (
                              <span>{dispute.payout.method.name}</span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(dispute.createdAt), "d MMM yyyy", { locale: ru })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {dispute.messages.length > 0 && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <MessageSquare className="h-4 w-4" />
                            {dispute.messages.length}
                          </div>
                        )}
                        <ChevronRight className="h-5 w-5 text-gray-400" />
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
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Детали спора по выплате</DialogTitle>
            {selectedDispute && (
              <DialogDescription>
                Выплата #{selectedDispute.payout.numericId} • {disputeStatusConfig[selectedDispute.status as keyof typeof disputeStatusConfig].label}
              </DialogDescription>
            )}
          </DialogHeader>

          {loadingDetails ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : disputeDetails ? (
            <div className="flex flex-col h-[calc(90vh-120px)]">
              {/* Payout info */}
              <div className="p-6 pt-4 border-b">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Сумма</p>
                    <p className="font-medium">{formatAmount(disputeDetails.payout.amount)} {disputeDetails.payout.currency}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Метод</p>
                    <p className="font-medium">{disputeDetails.payout.method?.name || "—"}</p>
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
                
                {disputeDetails.payout.recipient && (
                  <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Получатель: </span>
                    <span className="font-medium">{disputeDetails.payout.recipient.name}</span>
                    {disputeDetails.payout.recipient.cardNumber && (
                      <span className="ml-2 font-mono text-sm"> • {disputeDetails.payout.recipient.cardNumber}</span>
                    )}
                    {disputeDetails.payout.recipient.walletAddress && (
                      <span className="ml-2 font-mono text-sm"> • {disputeDetails.payout.recipient.walletAddress}</span>
                    )}
                  </div>
                )}
                
                {disputeDetails.resolution && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">Решение:</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">{disputeDetails.resolution}</p>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-hidden">
                <DisputeMessages
                  disputeId={disputeDetails.id}
                  messages={disputeDetails.messages || []}
                  userType="trader"
                  userId={user?.id || ""}
                  onMessageSent={handleMessageSent}
                  api={traderApi}
                />
              </div>

              {/* Actions */}
              {["OPEN", "IN_PROGRESS"].includes(disputeDetails.status) && (
                <div className="p-6 pt-4 border-t">
                  <Button
                    onClick={() => setShowResolutionDialog(true)}
                    className="w-full"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Разрешить спор
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Resolution Dialog */}
      <Dialog open={showResolutionDialog} onOpenChange={setShowResolutionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Разрешение спора</DialogTitle>
            <DialogDescription>
              Укажите результат разрешения спора и комментарий
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Результат</Label>
              <Select value={resolutionStatus} onValueChange={(v) => setResolutionStatus(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESOLVED_SUCCESS">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      Подтвердить выплату (в пользу мерчанта)
                    </div>
                  </SelectItem>
                  <SelectItem value="RESOLVED_FAIL">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Отменить выплату (в вашу пользу)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="resolution">Комментарий *</Label>
              <Textarea
                id="resolution"
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
                placeholder="Опишите причину решения..."
                className="min-h-[100px]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowResolutionDialog(false)}
              disabled={resolving}
            >
              Отмена
            </Button>
            <Button
              onClick={handleResolveDispute}
              disabled={resolving || !resolutionText.trim()}
            >
              {resolving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Разрешить спор
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}