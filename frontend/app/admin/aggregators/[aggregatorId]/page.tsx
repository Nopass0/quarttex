"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useAdminAuth } from "@/stores/auth";
import { formatAmount, formatDateTime } from "@/lib/utils";
import AggregatorMetrics from "@/components/admin/aggregator-metrics";
import AggregatorMethodFees from "@/components/admin/aggregator-method-fees";
import AggregatorMerchants from "@/components/admin/aggregator-merchants";
import AggregatorSettlements from "@/components/admin/aggregator-settlements";
import {
  ArrowLeft,
  Globe,
  Loader2,
  Key,
  DollarSign,
  Shield,
  RefreshCw,
  Settings,
  Ban,
  CheckCircle,
  Copy,
  Clock,
  AlertCircle,
  User,
  CreditCard,
  MessageSquare,
  Activity,
  TrendingUp,
  Calendar,
  Eye,
  Plus,
  Minus,
} from "lucide-react";

interface Aggregator {
  id: string;
  email: string;
  name: string;
  apiToken: string;
  customApiToken?: string | null;
  apiBaseUrl?: string;
  apiSchema?: string;
  balanceUsdt: number;
  isActive: boolean;
  twoFactorEnabled: boolean;
  isChaseProject: boolean;
  isChaseCompatible: boolean;
  sbpMethodId?: string | null;
  c2cMethodId?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    transactions: number;
    disputes: number;
    apiLogs: number;
  };
}

interface Transaction {
  id: string;
  numericId: number;
  amount: number;
  status: string;
  createdAt: string;
  merchant: {
    name: string;
  };
}

interface Dispute {
  id: string;
  transactionId: string;
  status: string;
  createdAt: string;
  transaction: {
    numericId: number;
    amount: number;
  };
}

interface ApiLog {
  id: string;
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  error?: string;
  createdAt: string;
  headers: any;
  requestData: any;
  responseData: any;
}

interface DepositData {
  amount: number;
  description?: string;
}

export default function AggregatorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const aggregatorId = params.aggregatorId as string;
  const adminToken = useAdminAuth((state) => state.token);

  const [aggregator, setAggregator] = useState<Aggregator | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [apiLogs, setApiLogs] = useState<ApiLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [depositData, setDepositData] = useState<DepositData>({ amount: 0 });
  const [isDepositing, setIsDepositing] = useState(false);
  const [customTokenInput, setCustomTokenInput] = useState("");
  const [isUpdatingToken, setIsUpdatingToken] = useState(false);
  const [apiBaseUrlInput, setApiBaseUrlInput] = useState("");
  const [isUpdatingUrl, setIsUpdatingUrl] = useState(false);
  const [sbpMethodIdInput, setSbpMethodIdInput] = useState("");
  const [isUpdatingSbpMethodId, setIsUpdatingSbpMethodId] = useState(false);
  const [c2cMethodIdInput, setC2cMethodIdInput] = useState("");
  const [isUpdatingC2cMethodId, setIsUpdatingC2cMethodId] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null);
  const [logDetailModalOpen, setLogDetailModalOpen] = useState(false);

  useEffect(() => {
    if (aggregatorId) {
      fetchAggregatorDetails();
    }
  }, [aggregatorId]);

  const fetchAggregatorDetails = async () => {
    if (!adminToken) return;

    setIsLoading(true);
    try {
      // Получаем данные агрегатора
      const aggregatorRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators/${aggregatorId}`,
        {
          headers: { "x-admin-key": adminToken },
        }
      );

      if (!aggregatorRes.ok) {
        throw new Error("Failed to fetch aggregator");
      }

      const aggregatorData = await aggregatorRes.json();
      setAggregator(aggregatorData);
      setCustomTokenInput(aggregatorData.customApiToken || "");
      setApiBaseUrlInput(aggregatorData.apiBaseUrl || "");
      setSbpMethodIdInput(aggregatorData.sbpMethodId || "");
      setC2cMethodIdInput(aggregatorData.c2cMethodId || "");
      
      // Транзакции уже включены в ответ агрегатора
      setTransactions(aggregatorData.transactions || []);
      
      // Споры пока не реализованы на бэкенде
      setDisputes([]);
      
      // Получаем API логи отдельным запросом
      try {
        const apiLogsRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators/${aggregatorId}/api-logs`,
          {
            headers: { "x-admin-key": adminToken },
          }
        );
        
        if (apiLogsRes.ok) {
          const apiLogsData = await apiLogsRes.json();
          setApiLogs(apiLogsData.data || []);
        } else {
          setApiLogs([]);
        }
      } catch (error) {
        console.error("Error fetching API logs:", error);
        setApiLogs([]);
      }
    } catch (error) {
      console.error("Error fetching aggregator details:", error);
      toast.error("Ошибка при загрузке данных агрегатора");
      router.push("/admin/aggregators");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAggregatorStatus = async () => {
    if (!adminToken || !aggregator) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators/${aggregator.id}/toggle`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminToken,
          },
          body: JSON.stringify({ isActive: !aggregator.isActive }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to toggle aggregator status");
      }

      toast.success(
        aggregator.isActive
          ? "Агрегатор деактивирован"
          : "Агрегатор активирован"
      );
      fetchAggregatorDetails();
    } catch (error) {
      console.error("Error toggling aggregator status:", error);
      toast.error("Ошибка при изменении статуса агрегатора");
    }
  };

  const regenerateApiToken = async () => {
    if (!adminToken || !aggregator) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators/${aggregator.id}/regenerate-token`,
        {
          method: "POST",
          headers: {
            "x-admin-key": adminToken,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to regenerate API token");
      }

      toast.success("API токен перегенерирован");
      fetchAggregatorDetails();
    } catch (error) {
      console.error("Error regenerating API token:", error);
      toast.error("Ошибка при перегенерации токена");
    }
  };

  const updateCustomToken = async () => {
    if (!adminToken || !aggregator) return;

    setIsUpdatingToken(true);
    try {
      const requestBody = {
        customApiToken: customTokenInput || null,
      };
      
      console.log('Sending PATCH request with body:', requestBody);
      console.log('Current aggregator state:', aggregator);
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators/${aggregator.id}/custom-token`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminToken,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update custom API token");
      }

      toast.success(customTokenInput ? "Кастомный токен установлен" : "Кастомный токен удален");
      fetchAggregatorDetails(); // Refresh data
    } catch (error) {
      console.error("Error updating custom API token:", error);
      toast.error("Ошибка при обновлении кастомного токена");
    } finally {
      setIsUpdatingToken(false);
    }
  };

  const clearCustomToken = () => {
    setCustomTokenInput("");
  };

  const updateApiBaseUrl = async () => {
    if (!adminToken || !aggregator) return;

    setIsUpdatingUrl(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators/${aggregator.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminToken,
          },
          body: JSON.stringify({
            apiBaseUrl: apiBaseUrlInput || null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update API URL");
      }

      toast.success(apiBaseUrlInput ? "API URL обновлен" : "API URL удален");
      fetchAggregatorDetails(); // Refresh data
    } catch (error) {
      console.error("Error updating API URL:", error);
      toast.error("Ошибка при обновлении API URL");
    } finally {
      setIsUpdatingUrl(false);
    }
  };

  const clearApiUrl = () => {
    setApiBaseUrlInput("");
  };

  const updateSbpMethodId = async () => {
    if (!adminToken || !aggregator) return;

    setIsUpdatingSbpMethodId(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators/${aggregator.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminToken,
          },
          body: JSON.stringify({
            sbpMethodId: sbpMethodIdInput || null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update SBP Method ID");
      }

      toast.success(sbpMethodIdInput ? "SBP Method ID обновлен" : "SBP Method ID удален");
      fetchAggregatorDetails(); // Refresh data
    } catch (error) {
      console.error("Error updating SBP Method ID:", error);
      toast.error("Ошибка при обновлении SBP Method ID");
    } finally {
      setIsUpdatingSbpMethodId(false);
    }
  };

  const updateC2cMethodId = async () => {
    if (!adminToken || !aggregator) return;

    setIsUpdatingC2cMethodId(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators/${aggregator.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminToken,
          },
          body: JSON.stringify({
            c2cMethodId: c2cMethodIdInput || null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update C2C Method ID");
      }

      toast.success(c2cMethodIdInput ? "C2C Method ID обновлен" : "C2C Method ID удален");
      fetchAggregatorDetails(); // Refresh data
    } catch (error) {
      console.error("Error updating C2C Method ID:", error);
      toast.error("Ошибка при обновлении C2C Method ID");
    } finally {
      setIsUpdatingC2cMethodId(false);
    }
  };

  const addDeposit = async () => {
    if (!adminToken || !aggregator || depositData.amount <= 0) {
      toast.error("Введите корректную сумму депозита");
      return;
    }

    setIsDepositing(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators/${aggregator.id}/deposit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminToken,
          },
          body: JSON.stringify(depositData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add deposit");
      }

      toast.success("Депозит успешно добавлен");
      setDepositModalOpen(false);
      setDepositData({ amount: 0, description: "" });
      fetchAggregatorDetails();
    } catch (error) {
      console.error("Error adding deposit:", error);
      toast.error("Ошибка при добавлении депозита");
    } finally {
      setIsDepositing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Скопировано в буфер обмена");
  };

  const showLogDetails = (log: ApiLog) => {
    setSelectedLog(log);
    setLogDetailModalOpen(true);
  };

  if (isLoading) {
    return (
      <ProtectedRoute requiredRole="admin">
        <AuthLayout variant="admin">
          <div className="container mx-auto p-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </div>
        </AuthLayout>
      </ProtectedRoute>
    );
  }

  if (!aggregator) {
    return (
      <ProtectedRoute requiredRole="admin">
        <AuthLayout variant="admin">
          <div className="container mx-auto p-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">Агрегатор не найден</p>
            </div>
          </div>
        </AuthLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="admin">
      <AuthLayout variant="admin">
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                  <Globe className="h-8 w-8" />
                  {aggregator.name}
                </h1>
                <p className="text-muted-foreground">{aggregator.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Dialog
                open={depositModalOpen}
                onOpenChange={setDepositModalOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить депозит
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Добавить депозит</DialogTitle>
                    <DialogDescription>
                      Пополните баланс USDT агрегатора
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="amount">Сумма USDT *</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="100.00"
                        value={depositData.amount}
                        onChange={(e) =>
                          setDepositData({
                            ...depositData,
                            amount: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Описание</Label>
                      <Textarea
                        id="description"
                        placeholder="Описание депозита..."
                        value={depositData.description}
                        onChange={(e) =>
                          setDepositData({
                            ...depositData,
                            description: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDepositModalOpen(false)}
                    >
                      Отмена
                    </Button>
                    <Button onClick={addDeposit} disabled={isDepositing}>
                      {isDepositing && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Добавить
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button
                variant={aggregator.isActive ? "destructive" : "default"}
                onClick={toggleAggregatorStatus}
              >
                {aggregator.isActive ? (
                  <>
                    <Ban className="h-4 w-4 mr-2" />
                    Деактивировать
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Активировать
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Баланс USDT
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatAmount(aggregator.balanceUsdt)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Сделки</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {aggregator._count?.transactions || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Споры</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {aggregator._count?.disputes || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Логи</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {aggregator._count?.apiLogs || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Обзор</TabsTrigger>
              <TabsTrigger value="metrics">Метрики</TabsTrigger>
              <TabsTrigger value="merchants">Мерчанты</TabsTrigger>
              <TabsTrigger value="settlements">Сеттлы</TabsTrigger>
              <TabsTrigger value="transactions">Сделки</TabsTrigger>
              <TabsTrigger value="disputes">Споры</TabsTrigger>
              <TabsTrigger value="api-logs">API Логи</TabsTrigger>
              <TabsTrigger value="settings">Настройки</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Информация об агрегаторе</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Название</Label>
                      <p className="text-sm font-medium">{aggregator.name}</p>
                    </div>
                    <div>
                      <Label>Email</Label>
                      <p className="text-sm font-medium">{aggregator.email}</p>
                    </div>
                    <div>
                      <Label>API Base URL</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm font-medium flex-1">
                          {aggregator.apiBaseUrl || "Не указан"}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveTab("settings")}
                        >
                          Изменить
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Статус</Label>
                      <div className="flex items-center gap-2">
                        {aggregator.isActive ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Активен
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Ban className="h-3 w-3 mr-1" />
                            Неактивен
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label>2FA</Label>
                      <div className="flex items-center gap-2">
                        {aggregator.twoFactorEnabled ? (
                          <Badge
                            variant="default"
                            className="bg-green-100 text-green-800"
                          >
                            <Shield className="h-3 w-3 mr-1" />
                            Включена
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Выключена
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label>Создан</Label>
                      <p className="text-sm font-medium">
                        {formatDateTime(aggregator.createdAt)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>API Token</CardTitle>
                    <CardDescription>
                      Токен для авторизации API запросов
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Активный API токен</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <code className="flex-1 bg-muted px-3 py-2 rounded text-sm">
                          {aggregator.customApiToken || aggregator.apiToken}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(aggregator.customApiToken || aggregator.apiToken)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {aggregator.customApiToken ? 
                          `Используется кастомный токен (автогенерированный: ${aggregator.apiToken.substring(0, 16)}...)` : 
                          'Используется автогенерированный токен'
                        }
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={regenerateApiToken}
                      className="w-full"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Перегенерировать токен
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="metrics">
              <AggregatorMetrics 
                aggregatorId={aggregatorId} 
                aggregatorName={aggregator.name}
                aggregator={aggregator}
              />
            </TabsContent>

            <TabsContent value="merchants">
              <AggregatorMerchants aggregatorId={aggregatorId} />
            </TabsContent>

            <TabsContent value="settlements">
              <AggregatorSettlements aggregatorId={aggregatorId} />
            </TabsContent>

            <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <CardTitle>Последние сделки</CardTitle>
                </CardHeader>
                <CardContent>
                  {transactions.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Сумма</TableHead>
                          <TableHead>Мерчант</TableHead>
                          <TableHead>Статус</TableHead>
                          <TableHead>Дата</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>#{transaction.numericId}</TableCell>
                            <TableCell>
                              {formatAmount(transaction.amount)}
                            </TableCell>
                            <TableCell>{transaction.merchant.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {transaction.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatDateTime(transaction.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Нет сделок
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="disputes">
              <Card>
                <CardHeader>
                  <CardTitle>Споры</CardTitle>
                </CardHeader>
                <CardContent>
                  {disputes.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID сделки</TableHead>
                          <TableHead>Сумма</TableHead>
                          <TableHead>Статус</TableHead>
                          <TableHead>Дата</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {disputes.map((dispute) => (
                          <TableRow key={dispute.id}>
                            <TableCell>
                              #{dispute.transaction.numericId}
                            </TableCell>
                            <TableCell>
                              {formatAmount(dispute.transaction.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{dispute.status}</Badge>
                            </TableCell>
                            <TableCell>
                              {formatDateTime(dispute.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Нет споров
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="api-logs">
              <Card>
                <CardHeader>
                  <CardTitle>API Логи</CardTitle>
                </CardHeader>
                <CardContent>
                  {apiLogs.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Endpoint</TableHead>
                          <TableHead>Метод</TableHead>
                          <TableHead>Статус</TableHead>
                          <TableHead>Время ответа</TableHead>
                          <TableHead>Ошибка</TableHead>
                          <TableHead>Дата</TableHead>
                          <TableHead>Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {apiLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="max-w-xs truncate" title={log.endpoint}>
                              {log.endpoint}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{log.method}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  log.statusCode >= 400
                                    ? "destructive"
                                    : "default"
                                }
                              >
                                {log.statusCode || "N/A"}
                              </Badge>
                            </TableCell>
                            <TableCell>{log.duration || 0}ms</TableCell>
                            <TableCell className="max-w-xs">
                              {log.error ? (
                                <span className="text-red-600 text-sm truncate" title={log.error}>
                                  {log.error}
                                </span>
                              ) : (
                                <span className="text-green-600">OK</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {formatDateTime(log.createdAt)}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => showLogDetails(log)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Нет логов
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Настройки агрегатора</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Статус агрегатора</Label>
                      <p className="text-sm text-muted-foreground">
                        Включить или выключить агрегатора
                      </p>
                    </div>
                    <Switch
                      checked={aggregator.isActive}
                      onCheckedChange={toggleAggregatorStatus}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Работа без страхового депозита</Label>
                      <p className="text-sm text-muted-foreground">
                        Разрешить работу без обязательного страхового депозита
                      </p>
                    </div>
                    <Switch
                      checked={!aggregator.requiresInsuranceDeposit}
                      onCheckedChange={async (checked) => {
                        try {
                          const response = await fetch(
                            `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators-v2/${aggregatorId}`,
                            {
                              method: "PUT",
                              headers: {
                                "x-admin-key": adminToken!,
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                requiresInsuranceDeposit: !checked,
                              }),
                            }
                          );

                          if (!response.ok) {
                            throw new Error("Failed to update aggregator");
                          }

                          setAggregator((prev) => 
                            prev ? { ...prev, requiresInsuranceDeposit: !checked } : null
                          );
                          toast.success("Настройка депозита обновлена");
                        } catch (error) {
                          toast.error("Ошибка обновления настройки");
                        }
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Это наша платформа</Label>
                      <p className="text-sm text-muted-foreground">
                        Отметить, если это другой экземпляр Chase
                      </p>
                    </div>
                    <Switch
                      checked={aggregator.isChaseProject}
                      onCheckedChange={async (checked) => {
                        try {
                          const response = await fetch(
                            `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators-v2/${aggregatorId}`,
                            {
                              method: "PUT",
                              headers: {
                                "x-admin-key": adminToken!,
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                isChaseProject: checked,
                              }),
                            }
                          );

                          if (!response.ok) {
                            throw new Error("Failed to update aggregator");
                          }

                          setAggregator((prev) => 
                            prev ? { ...prev, isChaseProject: checked } : null
                          );
                          toast.success("Настройка платформы обновлена");
                        } catch (error) {
                          toast.error("Ошибка обновления настройки");
                        }
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Совместимость с Chase API</Label>
                      <p className="text-sm text-muted-foreground">
                        Поддерживает ли платформа Chase API
                      </p>
                    </div>
                    <Switch
                      checked={aggregator.isChaseCompatible}
                      onCheckedChange={async (checked) => {
                        try {
                          const response = await fetch(
                            `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators-v2/${aggregatorId}`,
                            {
                              method: "PUT",
                              headers: {
                                "x-admin-key": adminToken!,
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                isChaseCompatible: checked,
                              }),
                            }
                          );

                          if (!response.ok) {
                            throw new Error("Failed to update aggregator");
                          }

                          setAggregator((prev) => 
                            prev ? { ...prev, isChaseCompatible: checked } : null
                          );
                          toast.success("Настройка совместимости обновлена");
                        } catch (error) {
                          toast.error("Ошибка обновления настройки");
                        }
                      }}
                    />
                  </div>

                  {aggregator.isChaseCompatible && (
                    <div className="border-t pt-6 space-y-6">
                      <div>
                        <Label>Method ID для SBP платежей</Label>
                        <p className="text-sm text-muted-foreground mb-2">
                          ID метода для SBP платежей в Chase-совместимом агрегаторе
                        </p>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Например: cmf9y824y08spikmk4k0rcqs6"
                            value={sbpMethodIdInput}
                            onChange={(e) => setSbpMethodIdInput(e.target.value)}
                            className="flex-1"
                          />
                          <Button 
                            onClick={updateSbpMethodId}
                            disabled={isUpdatingSbpMethodId || sbpMethodIdInput === (aggregator?.sbpMethodId || "")}
                            size="sm"
                          >
                            {isUpdatingSbpMethodId ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            Сохранить
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label>Method ID для C2C платежей</Label>
                        <p className="text-sm text-muted-foreground mb-2">
                          ID метода для C2C платежей в Chase-совместимом агрегаторе
                        </p>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Например: cmf9zk4ug00quiks4xcytpfb4"
                            value={c2cMethodIdInput}
                            onChange={(e) => setC2cMethodIdInput(e.target.value)}
                            className="flex-1"
                          />
                          <Button 
                            onClick={updateC2cMethodId}
                            disabled={isUpdatingC2cMethodId || c2cMethodIdInput === (aggregator?.c2cMethodId || "")}
                            size="sm"
                          >
                            {isUpdatingC2cMethodId ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            Сохранить
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-6 space-y-6">
                    <div>
                      <Label>API Base URL</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        Базовый URL для API запросов к агрегатору
                      </p>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Например: https://api.aggregator.com"
                            value={apiBaseUrlInput}
                            onChange={(e) => setApiBaseUrlInput(e.target.value)}
                            className="flex-1"
                          />
                          <Button 
                            variant="outline" 
                            onClick={clearApiUrl}
                            disabled={!apiBaseUrlInput}
                          >
                            Очистить
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={updateApiBaseUrl}
                            disabled={isUpdatingUrl || apiBaseUrlInput === (aggregator?.apiBaseUrl || "")}
                            size="sm"
                          >
                            {isUpdatingUrl ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            Сохранить URL
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => setApiBaseUrlInput("http://localhost:4001")}
                            size="sm"
                          >
                            Использовать localhost:4001
                          </Button>
                          {aggregator?.apiSchema === "PSPWARE" && (
                            <Button 
                              variant="outline"
                              onClick={() => setApiBaseUrlInput("http://localhost:4002")}
                              size="sm"
                            >
                              Использовать PSPWare Mock
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Текущий URL: {aggregator?.apiBaseUrl || "Не задан"}
                      </p>
                    </div>

                    <div>
                      <Label>Кастомный API Token</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        Установите кастомный токен или оставьте пустым для использования автогенерированного
                      </p>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Введите кастомный токен (например: test-aggregator-token-123)"
                            value={customTokenInput}
                            onChange={(e) => setCustomTokenInput(e.target.value)}
                            className="flex-1"
                          />
                          <Button 
                            variant="outline" 
                            onClick={clearCustomToken}
                            disabled={!customTokenInput}
                          >
                            Очистить
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={updateCustomToken}
                            disabled={isUpdatingToken || customTokenInput === (aggregator?.customApiToken || "")}
                            size="sm"
                          >
                            {isUpdatingToken ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            Сохранить токен
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => setCustomTokenInput("test-aggregator-token-123")}
                            size="sm"
                          >
                            Использовать токен эмулятора
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Текущий активный токен: {aggregator?.customApiToken || aggregator?.apiToken || "Не задан"}
                      </p>
                    </div>
                    
                    <div>
                      <Label>Автогенерированный API Token</Label>
                      <p className="text-sm text-muted-foreground mb-4">
                        Перегенерировать автоматический API токен для агрегатора
                      </p>
                      <Button variant="outline" onClick={regenerateApiToken}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Перегенерировать токен
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Модальное окно для детального просмотра API лога */}
          <Dialog open={logDetailModalOpen} onOpenChange={setLogDetailModalOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Детали API запроса</DialogTitle>
                <DialogDescription>
                  Полная информация о запросе и ответе
                </DialogDescription>
              </DialogHeader>
              {selectedLog && (
                <div className="space-y-6">
                  {/* Основная информация */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Endpoint</Label>
                      <p className="text-sm bg-muted p-2 rounded break-all">
                        {selectedLog.endpoint}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Метод</Label>
                      <p className="text-sm">
                        <Badge variant="outline">{selectedLog.method}</Badge>
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">HTTP Статус</Label>
                      <p className="text-sm">
                        <Badge
                          variant={
                            selectedLog.statusCode >= 400 ? "destructive" : "default"
                          }
                        >
                          {selectedLog.statusCode || "N/A"}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Время ответа</Label>
                      <p className="text-sm">{selectedLog.duration || 0}ms</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Дата/время</Label>
                      <p className="text-sm">{formatDateTime(selectedLog.createdAt)}</p>
                    </div>
                    {selectedLog.error && (
                      <div>
                        <Label className="text-sm font-medium">Ошибка</Label>
                        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          {selectedLog.error}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Заголовки */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">Заголовки запроса</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(JSON.stringify(selectedLog.headers, null, 2))}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                      {selectedLog.headers
                        ? JSON.stringify(selectedLog.headers, null, 2)
                        : "Заголовки отсутствуют"}
                    </pre>
                  </div>

                  {/* Тело запроса */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">Тело запроса</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(JSON.stringify(selectedLog.requestData, null, 2))}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                      {selectedLog.requestData
                        ? JSON.stringify(selectedLog.requestData, null, 2)
                        : "Тело запроса отсутствует"}
                    </pre>
                  </div>

                  {/* Тело ответа */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">Тело ответа</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(JSON.stringify(selectedLog.responseData, null, 2))}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                      {selectedLog.responseData
                        ? JSON.stringify(selectedLog.responseData, null, 2)
                        : "Тело ответа отсутствует"}
                    </pre>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button onClick={() => setLogDetailModalOpen(false)}>
                  Закрыть
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </AuthLayout>
    </ProtectedRoute>
  );
}
