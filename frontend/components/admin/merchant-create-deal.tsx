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

type Method = {
  id: string;
  code: string;
  name: string;
  type: string;
  currency: string;
  commissionPayin: number;
  commissionPayout: number;
  maxPayin: number;
  minPayin: number;
  maxPayout: number;
  minPayout: number;
  chancePayin: number;
  chancePayout: number;
  isEnabled: boolean;
  rateSource: string;
};

interface MerchantCreateDealProps {
  merchantId: string;
  merchantToken: string;
  merchantMethods: MerchantMethod[];
  countInRubEquivalent: boolean;
}

export function MerchantCreateDeal({
  merchantId,
  merchantToken,
  merchantMethods,
  countInRubEquivalent,
}: MerchantCreateDealProps) {
  const { token: adminToken } = useAdminAuth(); // на будущее, если понадобится аудит/лог
  const [methodId, setMethodId] = useState("");
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("");
  const [callbackUri, setCallbackUri] = useState("");
  const [expiredAtLocal, setExpiredAtLocal] = useState<string>(
    new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)
  ); // yyyy-MM-ddTHH:mm
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  
  // Используем методы мерчанта из пропсов
  const [isLoadingMethods, setIsLoadingMethods] = useState(false);

  // Получаем методы мерчанта из пропсов
  const availableMethods = merchantMethods.filter(mm => mm.isEnabled).map(mm => mm.method);

  const handleCreate = async () => {
    if (!methodId) {
      toast.error("Выберите метод оплаты");
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

    try {
      setIsLoading(true);
      setResult(null);

      const payload: any = {
        amount: amountNum,
        orderId: `ADMIN_IN_${Date.now()}_${Math.random()
          .toString(36)
          .substring(7)}`,
        methodId,
        expired_at: new Date(expiredAtLocal).toISOString(),
      };
      if (callbackUri) payload.callbackUri = callbackUri;
      if (!countInRubEquivalent) payload.rate = parseFloat(rate);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/merchant/transactions/in`,
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
        toast.error("Ошибка создания сделки", {
          description: data?.error || "Неизвестная ошибка",
        });
        return;
      }

      setResult(data);
      toast.success("Сделка создана", {
        description: `ID: ${data.id}, Сумма: ${data.amount} ₽`,
      });
      setAmount("");
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
        <CardTitle className="text-lg">Создание тестовых сделок</CardTitle>
        <CardDescription className="dark:text-gray-400">
          Запрос отправляется на реальный merchant endpoint с ключом мерчанта.
          Доступны только методы оплаты, настроенные для этого мерчанта.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <Label className="text-sm">Метод оплаты</Label>
            <Select value={methodId} onValueChange={setMethodId} disabled={isLoadingMethods}>
              <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600">
                {isLoadingMethods ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Загрузка методов...</span>
                  </div>
                ) : (
                  <SelectValue placeholder="Выберите метод оплаты" />
                )}
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
                    У мерчанта нет активных методов
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
            <Label className="text-sm">Истекает (дата/время)</Label>
            <Input
              type="datetime-local"
              value={expiredAtLocal}
              onChange={(e) => setExpiredAtLocal(e.target.value)}
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
          <div className="md:col-span-3">
            <Label className="text-sm">Callback URL (опционально)</Label>
            <Input
              type="url"
              value={callbackUri}
              onChange={(e) => setCallbackUri(e.target.value)}
              placeholder="https://example.com/callback"
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div className="md:col-span-2 flex items-end">
            <Button
              onClick={handleCreate}
              disabled={isLoading || !methodId || !amount || availableMethods.length === 0}
              className="w-full"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Создание...
                </div>
              ) : (
                "Создать сделку"
              )}
            </Button>
          </div>
        </div>

        {result && (
          <div className="mt-6 p-4 rounded-md border dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Ответ сервера
            </div>
            <div className="mt-2 text-sm text-gray-800 dark:text-gray-200">
              <div>Статус: {result.status}</div>
              <div>
                Трейдер: {result?.requisites?.traderName || result.traderId}
              </div>
              <div>
                Реквизиты: {result?.requisites?.bankType} •{" "}
                {result?.requisites?.cardNumber} •{" "}
                {result?.requisites?.recipientName}
              </div>
              <div>
                Сделка ID: {result.id} (#{result.numericId})
              </div>
              <div>
                Метод: {result?.method?.name} ({result?.method?.code})
              </div>
              <div>Истекает: {result.expired_at}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
