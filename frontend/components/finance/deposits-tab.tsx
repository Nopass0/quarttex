"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Copy, Plus, Loader2, AlertCircle, Clock, CheckCircle2, XCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { traderApi } from "@/services/api";
import { useTraderStore } from "@/stores/trader";
import QRCode from "react-qr-code";
import { DepositSettings, DepositRequest, DepositType } from "@/types/deposit";

export function DepositsTab() {
  const { financials } = useTraderStore();
  const [loading, setLoading] = useState(false);
  const [depositSettings, setDepositSettings] = useState<DepositSettings | null>(null);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [amount, setAmount] = useState("");
  const [depositType, setDepositType] = useState<DepositType>(DepositType.BALANCE);
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("deposit");
  const [stats, setStats] = useState({
    totalDeposited: 0,
    pendingCount: 0,
    totalCount: 0,
    currentBalance: 0,
    insuranceDeposit: 0
  });

  useEffect(() => {
    fetchDepositSettings();
    fetchDepositRequests();
    fetchStats();
  }, []);

  const fetchDepositSettings = async () => {
    try {
      const response = await traderApi.get("/deposits/settings");
      setDepositSettings(response.data.data);
    } catch (error) {
      toast.error("Не удалось загрузить настройки депозита");
    }
  };

  const fetchDepositRequests = async () => {
    try {
      const response = await traderApi.get("/deposits");
      setDepositRequests(response.data.data);
    } catch (error) {
      toast.error("Не удалось загрузить заявки на пополнение");
    }
  };

  const fetchStats = async () => {
    try {
      const response = await traderApi.get("/deposits/stats");
      setStats({
        ...response.data.data,
        insuranceDeposit: financials?.deposit || 0
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleCreateDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Введите корректную сумму");
      return;
    }

    if (depositSettings && parseFloat(amount) < depositSettings.minAmount) {
      toast.error(`Минимальная сумма пополнения ${depositSettings.minAmount} USDT`);
      return;
    }

    setLoading(true);
    try {
      await traderApi.post("/deposits", {
        amountUSDT: parseFloat(amount),
        type: depositType
      });

      toast.success(`Заявка на пополнение ${depositType === "insurance" ? "страхового депозита" : "баланса"} создана`);

      setAmount("");
      setShowDepositDialog(false);
      fetchDepositRequests();
      fetchStats();
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
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Ожидание</Badge>;
      case "CHECKING":
        return <Badge variant="secondary"><Loader2 className="mr-1 h-3 w-3 animate-spin" />Проверка</Badge>;
      case "CONFIRMED":
        return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3" />Подтверждено</Badge>;
      case "FAILED":
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Ошибка</Badge>;
      case "EXPIRED":
        return <Badge variant="secondary"><XCircle className="mr-1 h-3 w-3" />Истекло</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Всего пополнено</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalDeposited, "USDT")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ожидает подтверждения</CardTitle>
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Текущий баланс</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.currentBalance, "USDT")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Страховой депозит</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.insuranceDeposit, "USDT")}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="deposit">Пополнить</TabsTrigger>
          <TabsTrigger value="requests">Заявки на пополнение</TabsTrigger>
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
                      Минимальная сумма пополнения: {depositSettings.minAmount} USDT<br />
                      Сеть: {depositSettings.network}<br />
                      Требуется подтверждений: {depositSettings.confirmationsRequired}
                    </AlertDescription>
                  </Alert>

                  <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
                    <DialogTrigger asChild>
                      <Button size="lg" className="w-full">
                        <Plus className="mr-2 h-4 w-4" />
                        Создать заявку на пополнение
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Пополнение баланса</DialogTitle>
                        <DialogDescription>
                          Отправьте USDT на указанный адрес
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Тип пополнения</Label>
                          <Tabs value={depositType} onValueChange={(value: string) => setDepositType(value as DepositType)}>
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value={DepositType.BALANCE}>Торговый баланс</TabsTrigger>
                              <TabsTrigger value={DepositType.INSURANCE}>Страховой депозит</TabsTrigger>
                            </TabsList>
                          </Tabs>
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
                              onClick={() => copyToClipboard(depositSettings.address)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex justify-center p-4 bg-white rounded-lg">
                          <QRCode value={depositSettings.address} size={200} />
                        </div>

                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            После отправки средств нажмите "Создать заявку". 
                            Средства будут зачислены после {depositSettings.confirmationsRequired} подтверждений сети.
                          </AlertDescription>
                        </Alert>

                        <Button
                          className="w-full"
                          onClick={handleCreateDeposit}
                          disabled={loading || !amount}
                        >
                          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
              <CardTitle>Заявки на пополнение</CardTitle>
              <CardDescription>
                История всех ваших заявок на пополнение баланса
              </CardDescription>
            </CardHeader>
            <CardContent>
              {depositRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  У вас пока нет заявок на пополнение
                </p>
              ) : (
                <div className="space-y-4">
                  {depositRequests.map((deposit) => (
                    <div key={deposit.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{formatCurrency(deposit.amountUSDT, "USDT")}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(deposit.createdAt)}
                          </p>
                        </div>
                        {getStatusBadge(deposit.status)}
                      </div>
                      
                      {deposit.txHash && (
                        <div className="pt-2 border-t">
                          <p className="text-sm text-muted-foreground">
                            TX: <span className="font-mono">{deposit.txHash.slice(0, 10)}...{deposit.txHash.slice(-10)}</span>
                          </p>
                          {deposit.confirmations > 0 && (
                            <p className="text-sm text-muted-foreground">
                              Подтверждений: {deposit.confirmations}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {deposit.confirmedAt && (
                        <p className="text-sm text-green-600">
                          Подтверждено: {formatDate(deposit.confirmedAt)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}