"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2, Send, Package, BarChart3, History } from "lucide-react";
import { adminApi } from "@/services/api";

interface Merchant {
  id: string;
  name: string;
  token: string;
  stats: {
    payouts: number;
    deals: number;
    total: number;
  };
}

interface EmulatorLog {
  _id: string;
  timestamp: string;
  merchantName: string;
  transactionType: string;
  status: string;
  error?: string;
  request: any;
  response: any;
}

interface Statistics {
  deals: { success: number; error: number };
  withdrawals: { success: number; error: number };
  total: number;
}

export default function MerchantEmulatorPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<string>("");
  const [transactionType, setTransactionType] = useState<"deal" | "withdrawal">("deal");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [batchCount, setBatchCount] = useState("10");
  const [batchMinAmount, setBatchMinAmount] = useState("1000");
  const [batchMaxAmount, setBatchMaxAmount] = useState("50000");
  const [logs, setLogs] = useState<EmulatorLog[]>([]);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("single");

  useEffect(() => {
    fetchMerchants();
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === "logs") {
      fetchLogs();
    }
  }, [activeTab]);

  const fetchMerchants = async () => {
    try {
      const { data } = await adminApi.get("/merchant-emulator/merchants");
      if (data.success) {
        setMerchants(data.merchants);
        if (data.merchants.length > 0 && !selectedMerchant) {
          setSelectedMerchant(data.merchants[0].id);
        }
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить список мерчантов",
        variant: "destructive",
      });
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const { data } = await adminApi.get("/admin/merchant-emulator/logs", {
        params: { limit: 50 },
      });
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (error) {
      toast.error("Не удалось загрузить логи");
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await adminApi.get("/admin/merchant-emulator/stats");
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleSingleTransaction = async () => {
    const merchant = merchants.find(m => m.id === selectedMerchant);
    if (!merchant) return;

    setLoading(true);
    try {
      const { data } = await adminApi.post("/admin/merchant-emulator/generate", {
        merchantToken: merchant.token,
        type: transactionType,
        amount: amount ? parseInt(amount) : undefined,
        merchantRate: 100,
      });

      if (data.success) {
        toast.success(`${transactionType === "deal" ? "Сделка" : "Вывод"} создан успешно`);
        fetchStats();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Не удалось создать транзакцию");
    } finally {
      setLoading(false);
    }
  };

  const handleBatchGeneration = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.post("/admin/merchant-emulator/batch", {
        merchantId: selectedMerchant,
        transactionType,
        count: parseInt(batchCount),
        minAmount: parseInt(batchMinAmount),
        maxAmount: parseInt(batchMaxAmount),
        delayMs: 100,
      });

      if (data.success) {
        toast.success(`Пакет создан. Успешно: ${data.successful}, Ошибок: ${data.failed}`);
        fetchStats();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Не удалось создать пакет");
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Эмулятор мерчанта</CardTitle>
          <CardDescription>
            Создание тестовых сделок и выводов через Merchant API
          </CardDescription>
        </CardHeader>
      </Card>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Сделки</p>
                  <p className="text-2xl font-bold">{stats.deals.success + stats.deals.error}</p>
                </div>
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Успешно: {stats.deals.success}, Ошибок: {stats.deals.error}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Выводы</p>
                  <p className="text-2xl font-bold">{stats.withdrawals.success + stats.withdrawals.error}</p>
                </div>
                <Send className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Успешно: {stats.withdrawals.success}, Ошибок: {stats.withdrawals.error}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Всего транзакций</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Успешность</p>
                  <p className="text-2xl font-bold">
                    {stats.total > 0 
                      ? Math.round(((stats.deals.success + stats.withdrawals.success) / stats.total) * 100)
                      : 0}%
                  </p>
                </div>
                <History className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="single">Одиночная транзакция</TabsTrigger>
              <TabsTrigger value="batch">Пакетная генерация</TabsTrigger>
              <TabsTrigger value="logs">История</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="merchant">Мерчант</Label>
                  <Select value={selectedMerchant} onValueChange={setSelectedMerchant}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите мерчанта" />
                    </SelectTrigger>
                    <SelectContent>
                      {merchants.map((merchant) => (
                        <SelectItem key={merchant.id} value={merchant.id}>
                          {merchant.name} ({merchant.stats.total} транзакций)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="type">Тип транзакции</Label>
                  <Select value={transactionType} onValueChange={(v) => setTransactionType(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deal">Сделка (пополнение)</SelectItem>
                      <SelectItem value="withdrawal">Вывод</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="amount">Сумма (необязательно)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Случайная сумма"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                <Button onClick={handleSingleTransaction} disabled={loading || !selectedMerchant}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Создать транзакцию
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="batch" className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="batchMerchant">Мерчант</Label>
                  <Select value={selectedMerchant} onValueChange={setSelectedMerchant}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите мерчанта" />
                    </SelectTrigger>
                    <SelectContent>
                      {merchants.map((merchant) => (
                        <SelectItem key={merchant.id} value={merchant.id}>
                          {merchant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="batchType">Тип транзакций</Label>
                  <Select value={transactionType} onValueChange={(v) => setTransactionType(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deal">Сделки</SelectItem>
                      <SelectItem value="withdrawal">Выводы</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="count">Количество</Label>
                  <Input
                    id="count"
                    type="number"
                    value={batchCount}
                    onChange={(e) => setBatchCount(e.target.value)}
                    min="1"
                    max="1000"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minAmount">Мин. сумма</Label>
                    <Input
                      id="minAmount"
                      type="number"
                      value={batchMinAmount}
                      onChange={(e) => setBatchMinAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxAmount">Макс. сумма</Label>
                    <Input
                      id="maxAmount"
                      type="number"
                      value={batchMaxAmount}
                      onChange={(e) => setBatchMaxAmount(e.target.value)}
                    />
                  </div>
                </div>

                <Button onClick={handleBatchGeneration} disabled={loading || !selectedMerchant}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Сгенерировать пакет
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="logs">
              {logsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Время</TableHead>
                      <TableHead>Мерчант</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Сумма</TableHead>
                      <TableHead>Ошибка</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log._id}>
                        <TableCell>
                          {formatDistanceToNow(new Date(log.timestamp), {
                            addSuffix: true,
                            locale: ru,
                          })}
                        </TableCell>
                        <TableCell>{log.merchantName}</TableCell>
                        <TableCell>
                          <Badge variant={log.transactionType === "deal" ? "default" : "secondary"}>
                            {log.transactionType === "deal" ? "Сделка" : "Вывод"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.status === "success" ? "success" : "destructive"}>
                            {log.status === "success" ? "Успех" : "Ошибка"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatAmount(log.request.amount)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.error || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}