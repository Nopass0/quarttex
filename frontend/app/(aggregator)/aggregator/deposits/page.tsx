"use client";

import { useState, useEffect } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Copy,
  Plus,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Wallet,
  History,
} from "lucide-react";
import { formatAmount, formatDateTime } from "@/lib/utils";
import { aggregatorApi } from "@/services/api";
import { useAggregatorAuth } from "@/stores/aggregator-auth";
import QRCode from "react-qr-code";

interface DepositSettings {
  address: string;
  minAmount: number;
  confirmationsRequired: number;
  expiryMinutes: number;
  network: string;
}

interface DepositRequest {
  id: string;
  aggregatorId: string;
  amountUSDT: number;
  address: string;
  status: string;
  txHash: string | null;
  confirmations: number;
  createdAt: string;
  confirmedAt: string | null;
  processedAt: string | null;
}

interface DepositStats {
  totalDeposited: number;
  pendingCount: number;
  totalCount: number;
  currentBalance: number;
}

export default function AggregatorDepositsPage() {
  const aggregator = useAggregatorAuth();
  const [loading, setLoading] = useState(false);
  const [depositSettings, setDepositSettings] =
    useState<DepositSettings | null>(null);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [stats, setStats] = useState<DepositStats>({
    totalDeposited: 0,
    pendingCount: 0,
    totalCount: 0,
    currentBalance: 0,
  });
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("deposit");

  useEffect(() => {
    fetchDepositSettings();
    fetchDepositRequests();
    fetchStats();
  }, []);

  const fetchDepositSettings = async () => {
    try {
      const response = await aggregatorApi.getDepositSettings();
      setDepositSettings(response.data);
    } catch (error) {
      toast.error("Не удалось загрузить настройки пополнения");
    }
  };

  const fetchDepositRequests = async () => {
    try {
      const response = await aggregatorApi.getDepositRequests();
      setDepositRequests(response.data);
    } catch (error) {
      toast.error("Не удалось загрузить заявки на пополнение");
    }
  };

  const fetchStats = async () => {
    try {
      const response = await aggregatorApi.getDepositStats();
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch deposit stats:", error);
    }
  };

  const handleCreateDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Введите корректную сумму");
      return;
    }

    if (depositSettings && parseFloat(amount) < depositSettings.minAmount) {
      toast.error(
        `Минимальная сумма пополнения ${depositSettings.minAmount} USDT`
      );
      return;
    }

    if (!txHash || txHash.trim().length < 10) {
      toast.error("Введите хеш транзакции");
      return;
    }

    setLoading(true);
    try {
      await aggregatorApi.createDepositRequest({
        amountUSDT: parseFloat(amount),
        txHash: txHash.trim(),
      });

      toast.success("Заявка на пополнение создана и отправлена на модерацию");

      setAmount("");
      setTxHash("");
      setShowDepositDialog(false);
      fetchDepositRequests();
      fetchStats();

      // Обновляем данные агрегатора для синхронизации баланса
      try {
        const meResponse = await aggregatorApi.getMe();
        aggregator.setAuth(
          aggregator.sessionToken || "",
          aggregator.aggregatorId || "",
          aggregator.aggregatorName || "",
          aggregator.email || "",
          aggregator.apiToken || "",
          aggregator.apiBaseUrl,
          meResponse.aggregator.balanceUsdt,
          aggregator.twoFactorEnabled || false
        );
      } catch (error) {
        console.error("Failed to sync aggregator data:", error);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Не удалось создать заявку");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Адрес скопирован в буфер обмена");
    } catch (error) {
      toast.error("Не удалось скопировать адрес");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            Ожидание
          </Badge>
        );
      case "CHECKING":
        return (
          <Badge variant="secondary">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Проверка
          </Badge>
        );
      case "CONFIRMED":
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Подтверждено
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Ошибка
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge variant="secondary">
            <XCircle className="mr-1 h-3 w-3" />
            Истекло
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-8 w-8 text-[#006039]" />
            Пополнение баланса
          </h1>
          <p className="text-muted-foreground mt-1">
            Управление пополнениями USDT баланса
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Текущий баланс
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#006039]">
              {formatAmount(stats.currentBalance)} USDT
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Всего пополнено
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAmount(stats.totalDeposited)} USDT
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Ожидает подтверждения
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Всего заявок</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCount}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="deposit">Пополнить</TabsTrigger>
          <TabsTrigger value="requests">История заявок</TabsTrigger>
        </TabsList>

        <TabsContent value="deposit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Пополнение баланса</CardTitle>
              <CardDescription>
                Пополните баланс через криптовалюту USDT (TRC-20)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {depositSettings && (
                <>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Минимальная сумма пополнения: {depositSettings.minAmount}{" "}
                      USDT
                      <br />
                      Сеть: {depositSettings.network}
                      <br />
                      Требуется подтверждений:{" "}
                      {depositSettings.confirmationsRequired}
                    </AlertDescription>
                  </Alert>

                  <Dialog
                    open={showDepositDialog}
                    onOpenChange={setShowDepositDialog}
                  >
                    <DialogTrigger asChild>
                      <Button
                        size="lg"
                        className="w-full bg-[#006039] hover:bg-[#004d2e]"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Создать заявку на пополнение
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Пополнение баланса</DialogTitle>
                        <DialogDescription>
                          Отправьте USDT на указанный адрес и введите хеш
                          транзакции
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Адрес для пополнения</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              value={depositSettings.address}
                              readOnly
                              className="font-mono text-sm"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() =>
                                copyToClipboard(depositSettings.address)
                              }
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex justify-center p-4 bg-white rounded-lg">
                          <QRCode value={depositSettings.address} size={200} />
                        </div>

                        <div className="space-y-2">
                          <Label>Сумма (USDT)</Label>
                          <Input
                            type="number"
                            placeholder={`Минимум ${depositSettings.minAmount}`}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min={depositSettings.minAmount}
                            step="0.01"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Хеш транзакции</Label>
                          <Input
                            placeholder="Введите хеш после отправки USDT"
                            value={txHash}
                            onChange={(e) => setTxHash(e.target.value)}
                            className="font-mono text-sm"
                          />
                        </div>

                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            После отправки USDT введите хеш транзакции и
                            создайте заявку. Средства будут зачислены после
                            подтверждения администратором.
                          </AlertDescription>
                        </Alert>

                        <Button
                          className="w-full bg-[#006039] hover:bg-[#004d2e]"
                          onClick={handleCreateDeposit}
                          disabled={loading || !amount || !txHash}
                        >
                          {loading && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Создать заявку
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>История заявок</CardTitle>
              <CardDescription>
                Все ваши заявки на пополнение баланса
              </CardDescription>
            </CardHeader>
            <CardContent>
              {depositRequests.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    У вас пока нет заявок на пополнение
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Сумма</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Хеш транзакции</TableHead>
                      <TableHead>Дата создания</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {depositRequests.map((deposit) => (
                      <TableRow key={deposit.id}>
                        <TableCell className="font-medium">
                          {formatAmount(deposit.amountUSDT)} USDT
                        </TableCell>
                        <TableCell>{getStatusBadge(deposit.status)}</TableCell>
                        <TableCell>
                          {deposit.txHash ? (
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {deposit.txHash.slice(0, 10)}...
                              {deposit.txHash.slice(-10)}
                            </code>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(deposit.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
