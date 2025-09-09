"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAdminAuth } from "@/stores/auth";
import { Loader2 } from "lucide-react";

type MerchantMethod = {
  id: string;
  isEnabled: boolean;
  method: {
    id: string;
    code: string;
    name: string;
    type: string;
    currency: string;
  };
};

interface MerchantCreatePayoutProps {
  merchantId: string;
  merchantToken: string;
  merchantMethods: MerchantMethod[];
  countInRubEquivalent: boolean;
}

export function MerchantCreatePayout({
  merchantId,
  merchantToken,
  merchantMethods,
  countInRubEquivalent,
}: MerchantCreatePayoutProps) {
  const { token: adminToken } = useAdminAuth();
  const [methodId, setMethodId] = useState("");
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("");
  const [wallet, setWallet] = useState("");
  const [bank, setBank] = useState("");
  const [isCard, setIsCard] = useState("false");
  const [callbackUri, setCallbackUri] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  // Получаем методы мерчанта из пропсов
  const availableMethods = merchantMethods.filter(mm => mm.isEnabled).map(mm => mm.method);

  const handleCreate = async () => {
    if (!methodId) {
      toast.error("Выберите метод выплаты");
      return;
    }
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      toast.error("Укажите корректную сумму");
      return;
    }
    if (!countInRubEquivalent && (!rate || isNaN(parseFloat(rate)))) {
      toast.error("Укажите курс (Merchant Rate)");
      return;
    }
    if (!wallet.trim()) {
      toast.error("Укажите кошелек/реквизиты");
      return;
    }
    if (!bank.trim()) {
      toast.error("Укажите банк/тип кошелька");
      return;
    }

    try {
      setIsLoading(true);
      setResult(null);

      const payload: any = {
        amount: amountNum,
        wallet: wallet.trim(),
        bank: bank.trim(),
        isCard: isCard === "true",
        externalReference: `ADMIN_OUT_${Date.now()}_${Math.random()
          .toString(36)
          .substring(7)}`,
      };
      
      if (methodId) payload.methodId = methodId;
      if (callbackUri) payload.webhookUrl = callbackUri;
      if (!countInRubEquivalent) payload.merchantRate = parseFloat(rate);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/merchant/payouts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-merchant-api-key": merchantToken,
          },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        toast.error("Ошибка создания выплаты", {
          description: data?.error || "Неизвестная ошибка",
        });
        return;
      }

      setResult(data);
      toast.success("Выплата создана", {
        description: `ID: ${data.data?.id || data.id}, Сумма: ${data.data?.amount || data.amount} ₽`,
      });
      setAmount("");
      setWallet("");
      setBank("");
    } catch (e) {
      console.error(e);
      toast.error("Ошибка при отправке запроса");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="text-lg">Создание тестовых выплат</CardTitle>
        <CardDescription className="dark:text-gray-400">
          Запрос отправляется на реальный merchant endpoint с ключом мерчанта.
          Доступны только методы выплат, настроенные для этого мерчанта.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <Label className="text-sm">Метод выплаты</Label>
            <Select value={methodId} onValueChange={setMethodId}>
              <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600">
                <SelectValue placeholder="Выберите метод выплаты" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                {availableMethods.length > 0 ? (
                  availableMethods.map((method) => (
                    <SelectItem
                      key={method.id}
                      value={method.id}
                      className="dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      <div className="flex flex-col">
                        <span>{method.name} ({method.code})</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {method.type.toUpperCase()} • {method.currency.toUpperCase()}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    У мерчанта нет активных методов выплат
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm">Сумма (₽)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="5000"
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          {!countInRubEquivalent && (
            <div>
              <Label className="text-sm">Merchant Rate</Label>
              <Input
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="Напр. 95.5"
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          )}

          <div>
            <Label className="text-sm">Callback URL (опционально)</Label>
            <Input
              type="url"
              value={callbackUri}
              onChange={(e) => setCallbackUri(e.target.value)}
              placeholder="https://example.com/callback"
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div>
            <Label className="text-sm">Кошелек/Реквизиты</Label>
            <Input
              type="text"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="TQn9Y2kh..."
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <Label className="text-sm">Банк/Тип кошелька</Label>
            <Input
              type="text"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              placeholder="TRON USDT"
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <Label className="text-sm">Тип</Label>
            <Select value={isCard} onValueChange={setIsCard}>
              <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600">
                <SelectValue placeholder="Выберите тип" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                <SelectItem value="false" className="dark:text-gray-200">
                  Кошелек
                </SelectItem>
                <SelectItem value="true" className="dark:text-gray-200">
                  Карта
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm">Callback URL (опционально)</Label>
            <Input
              type="url"
              value={callbackUri}
              onChange={(e) => setCallbackUri(e.target.value)}
              placeholder="https://example.com/callback"
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <Button
            onClick={handleCreate}
            disabled={
              isLoading || 
              !methodId || 
              !amount || 
              !wallet.trim() || 
              !bank.trim() || 
              availableMethods.length === 0
            }
            className="w-full md:w-auto"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Создание...
              </div>
            ) : (
              "Создать выплату"
            )}
          </Button>
        </div>

        {result && (
          <div className="mt-6 p-4 rounded-md border dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Ответ сервера
            </div>
            <div className="mt-2 text-sm text-gray-800 dark:text-gray-200">
              {result.success ? (
                <>
                  <div>Статус: {result.data?.status}</div>
                  <div>Выплата ID: {result.data?.id} (#{result.data?.numericId})</div>
                  <div>Сумма: {result.data?.amount} ₽</div>
                  <div>Курс: {result.data?.rate}</div>
                  <div>Кошелек: {result.data?.wallet}</div>
                  <div>Банк: {result.data?.bank}</div>
                  <div>Тип: {result.data?.isCard ? "Карта" : "Кошелек"}</div>
                  <div>Истекает: {result.data?.expireAt}</div>
                  {result.data?.traderId && (
                    <div>Трейдер: {result.data?.traderId}</div>
                  )}
                </>
              ) : (
                <div>Ошибка: {result.error || "Неизвестная ошибка"}</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
