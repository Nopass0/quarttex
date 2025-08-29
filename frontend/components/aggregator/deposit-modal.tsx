"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { aggregatorApi } from "@/services/api";
import { useAggregatorAuth } from "@/stores/aggregator-auth";
import {
  DollarSign,
  Loader2,
  Plus,
  Copy,
  AlertCircle,
  Wallet,
} from "lucide-react";
import QRCode from "react-qr-code";

interface DepositSettings {
  address: string;
  minAmount: number;
  confirmationsRequired: number;
  expiryMinutes: number;
  network: string;
}

export function AggregatorDepositModal() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [depositSettings, setDepositSettings] =
    useState<DepositSettings | null>(null);
  const [activeTab, setActiveTab] = useState("deposit");
  const aggregator = useAggregatorAuth();

  useEffect(() => {
    const handleOpenModal = () => {
      setOpen(true);
      fetchDepositSettings();
    };
    window.addEventListener("openDepositModal", handleOpenModal);
    return () =>
      window.removeEventListener("openDepositModal", handleOpenModal);
  }, []);

  const fetchDepositSettings = async () => {
    try {
      const response = await aggregatorApi.getDepositSettings();
      setDepositSettings(response.data);
    } catch (error) {
      console.error("Error fetching deposit settings:", error);
      toast.error("Не удалось загрузить настройки пополнения");
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

  const handleCreateDepositRequest = async () => {
    const depositAmount = parseFloat(amount);

    if (!depositAmount || depositAmount <= 0) {
      toast.error("Введите корректную сумму");
      return;
    }

    if (depositSettings && depositAmount < depositSettings.minAmount) {
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
        amountUSDT: depositAmount,
        txHash: txHash.trim(),
      });

      toast.success("Заявка на пополнение создана и отправлена на модерацию");
      setOpen(false);
      setAmount("");
      setTxHash("");
      setActiveTab("deposit");

      // Обновляем данные агрегатора через /me эндпоинт для синхронизации баланса
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
      console.error("Deposit request error:", error);
      toast.error(error?.response?.data?.error || "Ошибка создания заявки");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-[#006039]" />
            Пополнение баланса USDT
          </DialogTitle>
          <DialogDescription>
            Переведите USDT на указанный адрес и создайте заявку на пополнение
          </DialogDescription>
        </DialogHeader>

        {depositSettings ? (
          <div className="space-y-6">
            {/* Текущий баланс */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Текущий баланс</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#006039]">
                  {aggregator.balanceUsdt?.toFixed(2) || "0.00"} USDT
                </div>
              </CardContent>
            </Card>

            {/* Информация о пополнении */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Сеть:</strong> {depositSettings.network}
                <br />
                <strong>Минимальная сумма:</strong> {depositSettings.minAmount}{" "}
                USDT
                <br />
                <strong>Подтверждений:</strong>{" "}
                {depositSettings.confirmationsRequired}
              </AlertDescription>
            </Alert>

            {/* Адрес для пополнения */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Адрес для пополнения
              </Label>
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

              {/* QR код */}
              <div className="flex justify-center p-4 bg-white rounded-lg border">
                <QRCode value={depositSettings.address} size={150} />
              </div>
            </div>

            {/* Форма создания заявки */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Сумма пополнения (USDT)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    placeholder={`Минимум ${depositSettings.minAmount}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-10"
                    min={depositSettings.minAmount}
                    step="0.01"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="txHash">Хеш транзакции</Label>
                <Input
                  id="txHash"
                  placeholder="Введите хеш транзакции после отправки"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Отправьте USDT на адрес выше, затем введите хеш транзакции
                </p>
              </div>
            </div>

            {/* Кнопки */}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Отмена
              </Button>
              <Button
                onClick={handleCreateDepositRequest}
                disabled={
                  loading || !amount || !txHash || parseFloat(amount) <= 0
                }
                className="bg-[#006039] hover:bg-[#004d2e]"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Создание заявки...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Создать заявку
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Загрузка настроек...</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
