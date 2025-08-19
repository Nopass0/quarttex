"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AuthLayout } from "@/components/layouts/auth-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { adminApi as api } from "@/services/api";
import { useAdminAuth } from "@/stores/auth";
import { formatAmount, formatDateTime } from "@/lib/utils";
import {
  CreditCard,
  Search,
  Loader2,
  Eye,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  MessageSquare,
  RefreshCw,
  Send,
  Copy,
  Users,
  DollarSign,
  Wallet,
  Calendar,
  Shield,
  Globe,
  Hash,
  Info,
  Phone,
  Smartphone,
} from "lucide-react";

interface CallbackHistory {
  id: string;
  transactionId: string;
  url: string;
  payload: any;
  response: string | null;
  statusCode: number | null;
  error: string | null;
  createdAt: string;
}

interface Transaction {
  id: string;
  numericId: number;
  amount: number;
  status: string;
  type: string;
  assetOrBank: string;
  orderId: string;
  clientName: string;
  rate?: number;
  commission: number;
  feeInPercent?: number;
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  expiredAt: string;
  expired_at?: string;
  error?: string;
  currency?: string;
  userId: string;
  userIp?: string;
  callbackUri: string;
  successUri: string;
  failUri: string;
  merchantId: string;
  methodId: string;
  isMock?: boolean;
  merchant?: {
    id: string;
    name: string;
    token?: string;
  };
  trader?: {
    id: string;
    numericId: number;
    email: string;
    name?: string;
    banned?: boolean;
  };
  method?: {
    id: string;
    name: string;
    code: string;
    type?: string;
    currency?: string;
  };
  requisites?: {
    id?: string;
    cardNumber: string;
    bankType: string;
    recipientName: string;
    phoneNumber?: string;
    deviceId?: string;
    device?: { id: string; name?: string };
    minAmount?: number;
    maxAmount?: number;
    totalAmountLimit?: number;
    currentTotalAmount?: number;
    intervalMinutes?: number;
    operationLimit?: number;
    sumLimit?: number;
  } | null;
  dealDispute?: {
    id: string;
    status: string;
  };
}

interface TransactionAttempt {
  id: string;
  transactionId: string | null;
  transactionNumericId: number | null;
  merchantId: string;
  merchantName: string | null;
  methodId: string;
  methodName: string | null;
  amount: number;
  success: boolean;
  status: string | null;
  errorCode?: string | null;
  message?: string | null;
  createdAt: string;
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  CREATED: {
    label: "Создана",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    icon: Clock,
  },
  IN_PROGRESS: {
    label: "В работе",
    color:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    icon: RefreshCw,
  },
  DISPUTE: {
    label: "Спор",
    color:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
    icon: AlertCircle,
  },
  EXPIRED: {
    label: "Истекла",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
    icon: XCircle,
  },
  READY: {
    label: "Готова",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
    icon: CheckCircle,
  },
  MILK: {
    label: "Слив",
    color:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
    icon: AlertCircle,
  },
  CANCELED: {
    label: "Отменена",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
    icon: XCircle,
  },
};

export default function AdminDealsPage() {
  const adminToken = useAdminAuth((state) => state.token);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [attempts, setAttempts] = useState<TransactionAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [idFilter, setIdFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [amountFilter, setAmountFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [methodTypeFilter, setMethodTypeFilter] = useState("all");
  const [merchantFilter, setMerchantFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [methods, setMethods] = useState<{ id: string; name: string }[]>([]);
  const [merchants, setMerchants] = useState<{ id: string; name: string }[]>(
    []
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        const headers = { "x-admin-key": adminToken || "" };
        const [methodsRes, merchantsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/methods`, {
            headers,
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/merchants`, {
            headers,
          }),
        ]);
        const methodsData = await methodsRes.json();
        const merchantsData = await merchantsRes.json();
        const methodList = methodsData.data || methodsData.methods || [];
        const merchantList =
          merchantsData.data || merchantsData.merchants || [];
        setMethods(methodList);
        setMerchants(merchantList);
      } catch (error) {
        console.error("Failed to load methods or merchants", error);
      }
    };
    loadData();
  }, [adminToken]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [callbackHistory, setCallbackHistory] = useState<CallbackHistory[]>([]);
  const [loadingCallbacks, setLoadingCallbacks] = useState(false);

  useEffect(() => {
    if (activeTab === "requests") {
      loadAttempts();
    } else {
      loadTransactions();
    }
  }, [
    statusFilter,
    amountFilter,
    methodFilter,
    methodTypeFilter,
    merchantFilter,
    dateFrom,
    dateTo,
    currentPage,
    activeTab,
  ]);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        limit: 20,
        page: currentPage,
      };

      // Apply status filter based on active tab
      if (activeTab === "disputes") {
        params.status = "DISPUTE";
      } else if (activeTab === "active") {
        params.status = "IN_PROGRESS";
      } else if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      if (idFilter) {
        // Поиск по ID транзакции, numericId или orderId
        const searchValue = idFilter.trim();
        if (searchValue) {
          // Проверяем, является ли это числом (numericId)
          const numericId = parseInt(searchValue);
          if (!isNaN(numericId)) {
            params.numericId = numericId;
          } else {
            // Если не число, используем общий поиск для ID транзакции и orderId
            params.search = searchValue;
          }
        }
      }

      if (amountFilter) {
        const n = parseFloat(amountFilter);
        if (!isNaN(n)) params.amount = n;
      }

      if (methodFilter !== "all") {
        params.methodId = methodFilter;
      }

      if (methodTypeFilter !== "all") {
        params.methodType = methodTypeFilter;
      }

      if (merchantFilter !== "all") {
        params.merchantId = merchantFilter;
      }

      if (dateFrom) params.createdFrom = dateFrom;
      if (dateTo) params.createdTo = dateTo;

      const response = await api.getTransactionDeals(params);
      setTransactions(response.data || response.transactions || []);
      setTotalPages(response.meta?.totalPages || response.totalPages || 1);
    } catch (error: any) {
      toast.error("Ошибка загрузки сделок");
      console.error("Failed to load transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAttempts = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        limit: 20,
        page: currentPage,
      };
      if (idFilter) {
        params.id = idFilter;
      }
      if (amountFilter) {
        const n = parseFloat(amountFilter);
        if (!isNaN(n)) params.amount = n;
      }
      if (methodFilter !== "all") {
        params.methodId = methodFilter;
      }
      if (methodTypeFilter !== "all") {
        params.methodType = methodTypeFilter;
      }
      if (merchantFilter !== "all") {
        params.merchantId = merchantFilter;
      }

      if (dateFrom) params.createdFrom = dateFrom;
      if (dateTo) params.createdTo = dateTo;
      const response = await api.getTransactionAttempts(params);
      setAttempts(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (error: any) {
      toast.error("Ошибка загрузки запросов");
      console.error("Failed to load attempts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const testApiConnection = async () => {
    try {
      const response = await fetch("/api/health");
      console.log(
        "[Debug] API Health check:",
        response.status,
        await response.json()
      );
    } catch (error) {
      console.error("[Debug] API Health check failed:", error);
    }
  };

  const loadCallbackHistory = async (transactionId: string) => {
    setLoadingCallbacks(true);
    try {
      const token = adminToken || "";
      console.log(
        "[Debug] Loading callback history for transaction:",
        transactionId
      );
      console.log(
        "[Debug] Using admin token:",
        token ? `${token.substring(0, 10)}...` : "EMPTY"
      );

      const response = await fetch(
        `/api/admin/transactions/${transactionId}/callbacks`,
        {
          headers: {
            "X-Admin-Key": token,
          },
        }
      );

      console.log("[Debug] Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("[Debug] Callback history data:", data);
        setCallbackHistory(data.callbackHistory || []);
        toast.success(
          `Загружено ${
            data.callbackHistory?.length || 0
          } записей истории колбэков`
        );
      } else {
        const errorData = await response.text();
        console.error("[Debug] Error response:", errorData);
        toast.error(
          `Ошибка загрузки истории колбэков: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("Failed to load callback history:", error);
      toast.error(
        "Ошибка загрузки истории колбэков: " +
          (error instanceof Error ? error.message : "Неизвестная ошибка")
      );
    } finally {
      setLoadingCallbacks(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    if (activeTab === "requests") {
      loadAttempts();
    } else {
      loadTransactions();
    }
  };

  const getStatusIcon = (status: string) => {
    const config = statusConfig[status];
    const Icon = config?.icon || FileText;
    return <Icon className="h-4 w-4" />;
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || {
      label: status,
      color: "bg-gray-100 text-gray-800",
    };
    return (
      <Badge className={`${config.color} gap-1`}>
        {getStatusIcon(status)}
        {config.label}
      </Badge>
    );
  };

  const handleUpdateStatus = async (
    transactionId: string,
    newStatus: string
  ) => {
    try {
      await api.updateTransactionStatus(transactionId, newStatus);
      toast.success("Статус сделки обновлен");
      loadTransactions();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Ошибка при обновлении статуса"
      );
    }
  };

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast.success(message);
  };

  const sendCallback = async (url: string, transaction: Transaction) => {
    if (!url || url === "") {
      toast.error("URL для колбэка не указан");
      return;
    }

    try {
      // Используем прокси-эндпоинт для отправки callback через бэкенд
      const response = await fetch("/api/callback-proxy/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url,
          data: {
            id: transaction.orderId,
            amount: transaction.amount,
            status: transaction.status,
          },
          headers: {
            "X-Merchant-Token": transaction.merchant?.token || undefined,
          },
          transactionId: transaction.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Колбэк успешно отправлен");
      } else {
        toast.error(
          `Ошибка отправки колбэка: ${result.status} ${
            result.error || "Unknown error"
          }`
        );
      }
    } catch (error) {
      toast.error(
        "Не удалось отправить колбэк: " +
          (error instanceof Error ? error.message : "Неизвестная ошибка")
      );
    }
  };

  const openTransactionDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    loadCallbackHistory(transaction.id);
  };

  const TransactionDetailsDialog = () => {
    if (!selectedTransaction) return null;

    return (
      <Dialog
        open={!!selectedTransaction}
        onOpenChange={() => {
          setSelectedTransaction(null);
          setCallbackHistory([]);
        }}
      >
        <DialogContent className="w-full max-w-[98vw] sm:max-w-[95vw] md:max-w-[90vw] lg:max-w-[85vw] xl:max-w-7xl h-[95vh] sm:h-[90vh] md:h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="flex-shrink-0 px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-2">
                  <div className="p-1.5 sm:p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  Сделка #{selectedTransaction.numericId}
                </DialogTitle>
                <DialogDescription className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {formatDateTime(selectedTransaction.createdAt)} •{" "}
                  {selectedTransaction.merchant?.name || "N/A"}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedTransaction.status)}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 md:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4 md:space-y-5">
            {/* Основные идентификаторы */}
            <div className="bg-white dark:bg-gray-800 rounded-lg md:rounded-xl p-3 sm:p-4 md:p-5 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4 flex items-center gap-2">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                Идентификаторы
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    ID транзакции
                  </Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded-lg font-mono text-gray-700 dark:text-gray-300 break-all">
                      {selectedTransaction.id}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() =>
                        copyToClipboard(selectedTransaction.id, "ID скопирован")
                      }
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Order ID
                  </Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded-lg font-mono text-gray-700 dark:text-gray-300 break-all">
                      {selectedTransaction.orderId}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() =>
                        copyToClipboard(
                          selectedTransaction.orderId,
                          "Order ID скопирован"
                        )
                      }
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Участники сделки */}
            <div className="bg-white dark:bg-gray-800 rounded-lg md:rounded-xl p-3 sm:p-4 md:p-5 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4 flex items-center gap-2">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                Участники сделки
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <Label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Мерчант
                  </Label>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 mt-1">
                    {selectedTransaction.merchant?.name || "N/A"}
                  </p>
                  {selectedTransaction.merchantId && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      ID: {selectedTransaction.merchantId}
                    </p>
                  )}
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <Label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Трейдер
                  </Label>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 mt-1">
                    {selectedTransaction.trader
                      ? `${
                          selectedTransaction.trader.name ||
                          selectedTransaction.trader.email
                        }`
                      : "Не назначен"}
                  </p>
                  {selectedTransaction.trader && (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        #{selectedTransaction.trader.numericId}
                      </p>
                    </div>
                  )}
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <Label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Клиент
                  </Label>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 mt-1">
                    {selectedTransaction.clientName}
                  </p>
                  {selectedTransaction.userIp && (
                    <button
                      onClick={() =>
                        copyToClipboard(
                          selectedTransaction.userIp || "",
                          "IP адрес скопирован"
                        )
                      }
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mt-1"
                    >
                      IP: {selectedTransaction.userIp}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Финансовая информация */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-lg md:rounded-xl p-3 sm:p-4 md:p-5 shadow-sm border border-blue-200 dark:border-gray-700">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4 flex items-center gap-2">
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                Финансовые детали
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                  <Label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Сумма
                  </Label>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {formatAmount(selectedTransaction.amount)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedTransaction.currency || "RUB"}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                  <Label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Тип
                  </Label>
                  <div className="mt-2">
                    <Badge
                      variant={
                        selectedTransaction.type === "IN"
                          ? "default"
                          : "secondary"
                      }
                      className="font-semibold"
                    >
                      {selectedTransaction.type === "IN"
                        ? "↓ Входящая"
                        : "↑ Исходящая"}
                    </Badge>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                  <Label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Курс
                  </Label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-1">
                    {selectedTransaction.rate || "-"}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                  <Label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Комиссия (ввод)
                  </Label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-1">
                    {selectedTransaction.type === "IN"
                      ? selectedTransaction.feeInPercent ?? "-"
                      : "-"}
                    {selectedTransaction.type === "IN" &&
                    selectedTransaction.feeInPercent != null
                      ? "%"
                      : ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Метод оплаты */}
            <div className="bg-white dark:bg-gray-800 rounded-lg md:rounded-xl p-3 sm:p-4 md:p-5 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4 flex items-center gap-2">
                <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                Метод оплаты
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {selectedTransaction.method?.name || "N/A"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Код: {selectedTransaction.method?.code || "N/A"}
                  </p>
                </div>
                {selectedTransaction.method?.type && (
                  <Badge variant="outline">
                    {selectedTransaction.method.type}
                  </Badge>
                )}
              </div>
            </div>

            {selectedTransaction.requisites && (
              <div className="bg-gray-50 p-3 rounded-md">
                <Label className="text-gray-600">Реквизиты</Label>
                <div className="mt-2">
                  <p className="font-medium">
                    {selectedTransaction.requisites.cardNumber}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedTransaction.requisites.bankType} •{" "}
                    {selectedTransaction.requisites.recipientName}
                  </p>
                  {selectedTransaction.requisites.phoneNumber && (
                    <p className="text-sm text-gray-600">
                      Телефон: {selectedTransaction.requisites.phoneNumber}
                    </p>
                  )}
                  {selectedTransaction.requisites.device && (
                    <p className="text-sm text-gray-600">
                      Устройство:{" "}
                      {selectedTransaction.requisites.device.name ||
                        selectedTransaction.requisites.device.id}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-600">
                    {selectedTransaction.requisites.minAmount !== undefined && (
                      <div>Мин: {selectedTransaction.requisites.minAmount}</div>
                    )}
                    {selectedTransaction.requisites.maxAmount !== undefined && (
                      <div>
                        Макс: {selectedTransaction.requisites.maxAmount}
                      </div>
                    )}
                    {selectedTransaction.requisites.totalAmountLimit !==
                      undefined && (
                      <div>
                        Лимит суммы:{" "}
                        {selectedTransaction.requisites.totalAmountLimit}
                      </div>
                    )}
                    {selectedTransaction.requisites.currentTotalAmount !==
                      undefined && (
                      <div>
                        Текущий оборот:{" "}
                        {selectedTransaction.requisites.currentTotalAmount}
                      </div>
                    )}
                    {selectedTransaction.requisites.intervalMinutes !==
                      undefined && (
                      <div>
                        Интервал:{" "}
                        {selectedTransaction.requisites.intervalMinutes} мин
                      </div>
                    )}
                    {selectedTransaction.requisites.operationLimit !==
                      undefined && (
                      <div>
                        Лимит операций:{" "}
                        {selectedTransaction.requisites.operationLimit}
                      </div>
                    )}
                    {selectedTransaction.requisites.sumLimit !== undefined && (
                      <div>
                        Сумм. лимит: {selectedTransaction.requisites.sumLimit}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-600">Создано</Label>
                <p className="font-medium">
                  {formatDateTime(selectedTransaction.createdAt)}
                </p>
              </div>
              <div>
                <Label className="text-gray-600">Обновлено</Label>
                <p className="font-medium">
                  {formatDateTime(selectedTransaction.updatedAt)}
                </p>
              </div>
              <div>
                <Label className="text-gray-600">Истекает</Label>
                <p className="font-medium">
                  {formatDateTime(
                    selectedTransaction.expired_at ||
                      selectedTransaction.expiredAt
                  )}
                </p>
              </div>
            </div>

            {/* Callback URLs */}
            <div className="space-y-3">
              <Label className="text-gray-600">Callback URLs</Label>
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium">Callback URI</div>
                      <div className="text-xs text-gray-600 break-all mt-1">
                        {selectedTransaction.callbackUri || "Не указан"}
                      </div>
                    </div>
                    {selectedTransaction.callbackUri && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          sendCallback(
                            selectedTransaction.callbackUri,
                            selectedTransaction
                          )
                        }
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Отправить
                      </Button>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium">Success URI</div>
                      <div className="text-xs text-gray-600 break-all mt-1">
                        {selectedTransaction.successUri || "Не указан"}
                      </div>
                    </div>
                    {selectedTransaction.successUri && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          sendCallback(
                            selectedTransaction.successUri,
                            selectedTransaction
                          )
                        }
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Отправить
                      </Button>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium">Fail URI</div>
                      <div className="text-xs text-gray-600 break-all mt-1">
                        {selectedTransaction.failUri || "Не указан"}
                      </div>
                    </div>
                    {selectedTransaction.failUri && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          sendCallback(
                            selectedTransaction.failUri,
                            selectedTransaction
                          )
                        }
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Отправить
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* История колбэков */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-gray-600">История колбэков</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testApiConnection}
                  >
                    Test API
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadCallbackHistory(selectedTransaction.id)}
                    disabled={loadingCallbacks}
                  >
                    {loadingCallbacks ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    Обновить
                  </Button>
                </div>
              </div>

              {loadingCallbacks ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : callbackHistory.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {callbackHistory.map((callback) => (
                    <div
                      key={callback.id}
                      className="bg-gray-50 p-3 rounded-md border"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {formatDateTime(callback.createdAt)}
                          </div>
                          <div className="text-xs text-gray-600 break-all">
                            {callback.url}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {callback.statusCode ? (
                            <Badge
                              className={
                                callback.statusCode >= 200 &&
                                callback.statusCode < 300
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-red-100 text-red-800"
                              }
                            >
                              {callback.statusCode}
                            </Badge>
                          ) : null}
                          {callback.error && (
                            <Badge className="bg-red-100 text-red-800">
                              Ошибка
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1">
                            Отправлено:
                          </div>
                          <pre className="text-xs bg-white p-2 rounded border overflow-x-auto max-h-48 overflow-y-auto">
                            {JSON.stringify(callback.payload, null, 2)}
                          </pre>
                        </div>

                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1">
                            Ответ:
                          </div>
                          <pre className="text-xs bg-white p-2 rounded border overflow-x-auto max-h-48 overflow-y-auto">
                            {callback.response ||
                              (callback.error ? callback.error : "Нет ответа")}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-4">
                  История колбэков пуста
                </div>
              )}
            </div>

            {/* Дополнительная информация */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Info className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                Дополнительная информация
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    User ID
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1 font-mono break-all">
                    {selectedTransaction.userId}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Тип
                  </p>
                  <Badge
                    variant={
                      selectedTransaction.isMock ? "secondary" : "default"
                    }
                    className="mt-1"
                  >
                    {selectedTransaction.isMock ? "Тестовая" : "Реальная"}
                  </Badge>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Актив/Банк
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                    {selectedTransaction.assetOrBank}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Валюта
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                    {selectedTransaction.currency || "RUB"}
                  </p>
                </div>
              </div>
            </div>

            {selectedTransaction.acceptedAt && (
              <div>
                <Label className="text-gray-600">Принята в работу</Label>
                <p className="font-medium">
                  {formatDateTime(selectedTransaction.acceptedAt)}
                </p>
              </div>
            )}

            {selectedTransaction.error && (
              <div className="bg-red-50 p-3 rounded-md">
                <Label className="text-gray-600">Ошибка</Label>
                <p className="text-red-600 mt-1">{selectedTransaction.error}</p>
              </div>
            )}

            {selectedTransaction.dealDispute && (
              <div className="p-4 bg-orange-50 rounded-lg">
                <Label className="text-gray-600">Информация о споре</Label>
                <div className="mt-2">
                  <Badge className="bg-orange-100 text-orange-800">
                    Статус спора: {selectedTransaction.dealDispute.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-2"
                    onClick={() =>
                      (window.location.href = `/admin/disputes/deal/${selectedTransaction.dealDispute?.id}`)
                    }
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Перейти к спору
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Панель действий */}
          <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
            <div className="flex flex-wrap justify-end gap-2">
              {/* Кнопка подтверждения сделки - доступна для всех статусов кроме READY и CANCELED */}
              {!["READY", "CANCELED"].includes(selectedTransaction.status) && (
                <Button
                  variant="default"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  onClick={() =>
                    handleUpdateStatus(selectedTransaction.id, "READY")
                  }
                  title="Подтвердить сделку от имени трейдера - разморозить средства и начислить прибыль"
                >
                  <CheckCircle className="h-4 w-4 mr-2 text-white" />
                  Подтвердить сделку (админ)
                </Button>
              )}

              {/* Кнопки для статуса IN_PROGRESS */}
              {selectedTransaction.status === "IN_PROGRESS" && (
                <>
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={() =>
                      handleUpdateStatus(selectedTransaction.id, "CANCELED")
                    }
                    title="Отменить сделку - разморозить средства трейдера"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Отменить сделку
                  </Button>
                  <Button
                    variant="outline"
                    className="text-orange-600 hover:text-orange-700"
                    onClick={() =>
                      handleUpdateStatus(selectedTransaction.id, "EXPIRED")
                    }
                    title="Пометить как истекшую"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Пометить как истекшую
                  </Button>
                </>
              )}

              {/* Кнопки для статуса CREATED */}
              {selectedTransaction.status === "CREATED" && (
                <>
                  <Button
                    variant="outline"
                    className="text-blue-600 hover:text-blue-700"
                    onClick={() =>
                      handleUpdateStatus(selectedTransaction.id, "IN_PROGRESS")
                    }
                    title="Взять сделку в работу"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Взять в работу
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={() =>
                      handleUpdateStatus(selectedTransaction.id, "CANCELED")
                    }
                    title="Отменить сделку"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Отменить сделку
                  </Button>
                  <Button
                    variant="outline"
                    className="text-orange-600 hover:text-orange-700"
                    onClick={() =>
                      handleUpdateStatus(selectedTransaction.id, "EXPIRED")
                    }
                    title="Пометить как истекшую"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Пометить как истекшую
                  </Button>
                </>
              )}

              {/* Кнопки для статуса DISPUTE */}
              {selectedTransaction.status === "DISPUTE" && (
                <>
                  <Button
                    variant="default"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    onClick={() =>
                      handleUpdateStatus(selectedTransaction.id, "READY")
                    }
                    title="Разрешить спор в пользу мерчанта - завершить сделку"
                  >
                    <CheckCircle className="h-4 w-4 text-white" />
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={() =>
                      handleUpdateStatus(selectedTransaction.id, "CANCELED")
                    }
                    title="Разрешить спор в пользу трейдера - отменить сделку"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </>
              )}

              {/* Кнопки для статуса READY */}
              {selectedTransaction.status === "READY" && (
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  onClick={() =>
                    handleUpdateStatus(selectedTransaction.id, "CANCELED")
                  }
                  title="Отменить завершенную сделку"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Отменить сделку
                </Button>
              )}

              {/* Кнопки для статуса EXPIRED */}
              {selectedTransaction.status === "EXPIRED" && (
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  onClick={() =>
                    handleUpdateStatus(selectedTransaction.id, "CANCELED")
                  }
                  title="Отменить истекшую сделку"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Отменить сделку
                </Button>
              )}

              {/* Кнопки для статуса MILK */}
              {selectedTransaction.status === "MILK" && (
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  onClick={() =>
                    handleUpdateStatus(selectedTransaction.id, "CANCELED")
                  }
                  title="Отменить слитую сделку"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Отменить сделку
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const TransactionsTable = () => (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Мерчант</TableHead>
            <TableHead>Трейдер</TableHead>
            <TableHead>Сумма</TableHead>
            <TableHead>Метод</TableHead>
            <TableHead>Комиссия (ввод)</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Создана</TableHead>
            <TableHead className="text-center">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell className="font-mono">
                #{transaction.numericId}
              </TableCell>
              <TableCell>{transaction.merchant?.name || "N/A"}</TableCell>
              <TableCell>
                {transaction.trader ? (
                  <div className="space-y-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {transaction.trader.email || "Без имени"}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      #{transaction.trader.numericId}
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">
                    Не назначен
                  </span>
                )}
              </TableCell>
              <TableCell>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatAmount(transaction.amount)} ₽
                </span>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {transaction.method?.name || "N/A"}
                </Badge>
              </TableCell>
              <TableCell>
                {transaction.type === "IN"
                  ? transaction.feeInPercent ?? "-"
                  : "-"}
                {transaction.type === "IN" && transaction.feeInPercent != null
                  ? " %"
                  : ""}
              </TableCell>
              <TableCell>{getStatusBadge(transaction.status)}</TableCell>
              <TableCell>{formatDateTime(transaction.createdAt)}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openTransactionDetails(transaction)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>

                  {/* Кнопка подтверждения сделки - доступна для всех статусов кроме READY и CANCELED */}
                  {!["READY", "CANCELED"].includes(transaction.status) && (
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() =>
                        handleUpdateStatus(transaction.id, "READY")
                      }
                      title="Подтвердить сделку (админ)"
                    >
                      <CheckCircle className="h-4 w-4 text-white" />
                    </Button>
                  )}

                  {/* Кнопка взять в работу */}
                  {transaction.status === "CREATED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-600 hover:text-blue-700"
                      onClick={() =>
                        handleUpdateStatus(transaction.id, "IN_PROGRESS")
                      }
                      title="Взять в работу"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Кнопки для разрешения споров */}
                  {transaction.status === "DISPUTE" && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() =>
                          handleUpdateStatus(transaction.id, "READY")
                        }
                        title="Разрешить в пользу мерчанта"
                      >
                        <CheckCircle className="h-4 w-4 text-white" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() =>
                          handleUpdateStatus(transaction.id, "CANCELED")
                        }
                        title="Разрешить в пользу трейдера"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}

                  {/* Кнопка отмены сделки */}
                  {["CREATED", "IN_PROGRESS", "DISPUTE"].includes(
                    transaction.status
                  ) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() =>
                        handleUpdateStatus(transaction.id, "CANCELED")
                      }
                      title="Отменить сделку"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Кнопка пометки как истекшей */}
                  {["CREATED", "IN_PROGRESS"].includes(transaction.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-orange-600 hover:text-orange-700"
                      onClick={() =>
                        handleUpdateStatus(transaction.id, "EXPIRED")
                      }
                      title="Пометить как истекшую"
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                  )}

                  {transaction.dealDispute && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-orange-600 hover:text-orange-700"
                      onClick={() =>
                        (window.location.href = `/admin/disputes/deal/${transaction.dealDispute.id}`)
                      }
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const AttemptsTable = () => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Дата</TableHead>
            <TableHead>Мерчант</TableHead>
            <TableHead>Метод</TableHead>
            <TableHead>Сумма</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Ошибка</TableHead>
            <TableHead>Сделка</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attempts.map((a) => (
            <TableRow key={a.id}>
              <TableCell>{formatDateTime(a.createdAt)}</TableCell>
              <TableCell>{a.merchantName || a.merchantId}</TableCell>
              <TableCell>{a.methodName || a.methodId}</TableCell>
              <TableCell>{formatAmount(a.amount)} ₽</TableCell>
              <TableCell>{a.success ? "Успех" : "Ошибка"}</TableCell>
              <TableCell>{a.errorCode || "-"}</TableCell>
              <TableCell>
                {a.transactionNumericId ? `#${a.transactionNumericId}` : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <div className="space-y-4 sm:space-y-6">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3 text-gray-900 dark:text-gray-100">
              <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-600 dark:text-emerald-500" />
              Управление сделками
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
              Просмотр и управление всеми транзакциями в системе
            </p>
          </div>

          <Card className="shadow-sm border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <Search className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-500" />
                Фильтры
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-3 sm:space-y-4">
                <Input
                  placeholder="Поиск по ID сделки, numericId или orderId"
                  value={idFilter}
                  onChange={(e) => setIdFilter(e.target.value)}
                  className="w-full"
                />
                <div className="flex flex-wrap gap-2">
                  {activeTab === "all" && (
                    <Select
                      value={statusFilter}
                      onValueChange={(v) => {
                        setStatusFilter(v);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Статус" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все статусы</SelectItem>
                        <SelectItem value="CREATED">Создана</SelectItem>
                        <SelectItem value="IN_PROGRESS">В работе</SelectItem>
                        <SelectItem value="DISPUTE">Спор</SelectItem>
                        <SelectItem value="READY">Готова</SelectItem>
                        <SelectItem value="EXPIRED">Истекла</SelectItem>
                        <SelectItem value="CANCELED">Отменена</SelectItem>
                        <SelectItem value="MILK">Слив</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Input
                    type="number"
                    placeholder="Сумма"
                    value={amountFilter}
                    onChange={(e) => {
                      setAmountFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-[140px]"
                  />
                  <Select
                    value={methodFilter}
                    onValueChange={(v) => {
                      setMethodFilter(v);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Метод" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все методы</SelectItem>
                      {methods.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={methodTypeFilter}
                    onValueChange={(v) => {
                      setMethodTypeFilter(v);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Тип метода" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все типы</SelectItem>
                      <SelectItem value="c2c">C2C</SelectItem>
                      <SelectItem value="sbp">СБП</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={merchantFilter}
                    onValueChange={(v) => {
                      setMerchantFilter(v);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Мерчант" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все мерчанты</SelectItem>
                      {merchants.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="datetime-local"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-[200px]"
                    placeholder="От"
                  />
                  <Input
                    type="datetime-local"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-[200px]"
                    placeholder="До"
                  />
                  <Button
                    type="submit"
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Поиск
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="mt-4 sm:mt-6"
          >
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-gray-100 dark:bg-gray-800">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
              >
                Все сделки
              </TabsTrigger>
              <TabsTrigger
                value="active"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
              >
                <span className="flex items-center gap-2">
                  Активные
                  {transactions.filter((t) => t.status === "IN_PROGRESS")
                    .length > 0 && (
                    <Badge className="ml-1 px-1.5 py-0 text-xs bg-yellow-500 text-white">
                      {
                        transactions.filter((t) => t.status === "IN_PROGRESS")
                          .length
                      }
                    </Badge>
                  )}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="disputes"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
              >
                <span className="flex items-center gap-2">
                  Споры
                  {transactions.filter((t) => t.status === "DISPUTE").length >
                    0 && (
                    <Badge className="ml-1 px-1.5 py-0 text-xs bg-orange-500 text-white">
                      {
                        transactions.filter((t) => t.status === "DISPUTE")
                          .length
                      }
                    </Badge>
                  )}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="requests"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
              >
                Запросы
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <Card>
                <CardHeader>
                  <CardTitle>Все сделки</CardTitle>
                  <CardDescription>
                    Всего найдено: {transactions.length} сделок
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <TransactionsTable />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="active">
              <Card>
                <CardHeader>
                  <CardTitle>Активные сделки</CardTitle>
                  <CardDescription>
                    Сделки, находящиеся в работе
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <TransactionsTable />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="disputes">
              <Card>
                <CardHeader>
                  <CardTitle>Спорные сделки</CardTitle>
                  <CardDescription>Сделки с открытыми спорами</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <TransactionsTable />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="requests">
              <Card>
                <CardHeader>
                  <CardTitle>Запросы на сделки</CardTitle>
                  <CardDescription>
                    Всего найдено: {attempts.length} запросов
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <AttemptsTable />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Назад
              </Button>
              <span className="flex items-center px-4">
                Страница {currentPage} из {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
              >
                Вперед
              </Button>
            </div>
          )}
        </div>

        <TransactionDetailsDialog />
      </AuthLayout>
    </ProtectedRoute>
  );
}
