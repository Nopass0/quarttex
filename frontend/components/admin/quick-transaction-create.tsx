"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAdminAuth } from "@/stores/auth";
import { Send, Zap, RefreshCw } from "lucide-react";

interface QuickTransactionCreateProps {
  merchantId: string;
  merchantToken: string;
  merchantName?: string;
  merchantMethods: Array<{
    id: string;
    isEnabled: boolean;
    method: {
      id: string;
      code: string;
      name: string;
      type: string;
      currency: string;
    };
  }>;
}

export function QuickTransactionCreate({
  merchantId,
  merchantToken,
  merchantName,
  merchantMethods,
}: QuickTransactionCreateProps) {
  const { token: adminToken } = useAdminAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [transactionType, setTransactionType] = useState<"IN" | "OUT">("IN");
  const [methodId, setMethodId] = useState("");
  const [amount, setAmount] = useState("");

  const createQuickTransaction = async () => {
    if (!methodId) {
      toast.error("Выберите метод оплаты");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Укажите корректную сумму");
      return;
    }

    try {
      setIsLoading(true);

      const isTestMerchant = merchantName?.toLowerCase() === "test";

      if (isTestMerchant) {
        // Для тестового мерчанта используем специальный эндпоинт
        const data: any = {
          methodId,
          amount: parseFloat(amount),
          orderId: `QUICK_${transactionType}_${Date.now()}_${Math.random()
            .toString(36)
            .substring(7)}`,
          expired_at: new Date(Date.now() + 3600000).toISOString(),
          userIp: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(
            Math.random() * 255
          )}`,
        };

        // For OUT transactions, don't include rate - let backend handle it based on merchant settings
        // For IN transactions, always include rate as merchant API expects it
        if (transactionType === "IN") {
          data.rate = 95 + Math.random() * 10;
        }

        const endpoint = transactionType === "IN" ? "in" : "out";
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/admin/transactions/test/${endpoint}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-admin-key": adminToken || "",
            },
            body: JSON.stringify(data),
          }
        );

        const result = await response.json();

        if (response.ok) {
          const transaction = result.transaction || result;
          toast.success(`Транзакция ${transactionType} создана`, {
            description: `ID: ${transaction.id}, Сумма: ${transaction.amount} ₽`,
          });

          // Reset form
          setAmount("");
        } else {
          toast.error("Ошибка создания транзакции", {
            description: result.error || "Неизвестная ошибка",
          });
        }
      } else {
        if (transactionType === "IN") {
          // Новый админский мок-эндпоинт для выбранного мерчанта
          const payload = {
            merchantId,
            methodId,
            amount: parseFloat(amount),
            orderId: `MOCK_IN_${Date.now()}_${Math.random()
              .toString(36)
              .substring(7)}`,
            rate: 95 + Math.random() * 10,
            expired_at: new Date(Date.now() + 3600000).toISOString(),
            userIp: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(
              Math.random() * 255
            )}`,
          };

          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/admin/transactions/mock/in`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-admin-key": adminToken || "",
              },
              body: JSON.stringify(payload),
            }
          );

          const result = await response.json();
          if (response.ok) {
            const trx = result.transaction || result;
            toast.success(`Транзакция IN создана`, {
              description: `ID: ${trx.id}, Сумма: ${trx.amount} ₽`,
            });
            setAmount("");
          } else {
            toast.error("Ошибка создания транзакции", {
              description: result.error || "Неизвестная ошибка",
            });
          }
        } else {
          // OUT как и раньше — через merchant API
          const endpoint = "payout";
          const data = {
            amount: parseFloat(amount),
            wallet: "5536 9137 5843 1234",
            bank: "Сбербанк",
            isCard: true,
            rate: 95 + Math.random() * 10,
            direction: "OUT",
          };
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/merchant/${endpoint}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-merchant-api-key": merchantToken,
              },
              body: JSON.stringify(data),
            }
          );
          const result = await response.json();
          if (response.ok) {
            toast.success(`Транзакция OUT создана`, {
              description: `ID: ${result.id}, Сумма: ${
                result.amount || data.amount
              } ₽`,
            });
            setAmount("");
          } else {
            toast.error("Ошибка создания транзакции", {
              description: result.error || "Неизвестная ошибка",
            });
          }
        }
      }
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast.error("Ошибка при отправке запроса");
    } finally {
      setIsLoading(false);
    }
  };

  const createBatchTransactions = async (count: number) => {
    if (!methodId && merchantMethods.length === 0) {
      toast.error("Выберите метод оплаты или активируйте хотя бы один метод");
      return;
    }

    setIsBatchLoading(true);
    let successCount = 0;
    let errorCount = 0;

    const isTestMerchant = merchantName?.toLowerCase() === "test";
    console.log("Batch creation started:", {
      isTestMerchant,
      merchantName,
      methodId,
      merchantMethods,
    });

    for (let i = 0; i < count; i++) {
      try {
        const selectedMethodId =
          methodId ||
          merchantMethods[Math.floor(Math.random() * merchantMethods.length)]
            ?.method.id;
        if (!selectedMethodId) {
          console.error("No method ID selected for iteration", i, {
            methodId,
            merchantMethods,
          });
          errorCount++;
          continue;
        }
        console.log(
          `Creating transaction ${i + 1}/${count} with method:`,
          selectedMethodId
        );

        if (isTestMerchant) {
          // Для тестового мерчанта
          const data: any = {
            methodId: selectedMethodId,
            amount: Math.floor(Math.random() * 9000) + 1000,
            orderId: `BATCH_${transactionType}_${Date.now()}_${i}_${Math.random()
              .toString(36)
              .substring(7)}`,
            expired_at: new Date(Date.now() + 3600000).toISOString(),
            userIp: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(
              Math.random() * 255
            )}`,
          };

          // For OUT transactions, don't include rate - let backend handle it based on merchant settings
          // For IN transactions, always include rate as merchant API expects it
          if (transactionType === "IN") {
            data.rate = 95 + Math.random() * 10;
          }

          const endpoint = transactionType === "IN" ? "in" : "out";
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/admin/transactions/test/${endpoint}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-admin-key": adminToken || "",
              },
              body: JSON.stringify(data),
            }
          );

          if (response.ok) {
            successCount++;
            console.log(`Transaction ${i + 1} created successfully`);
          } else {
            errorCount++;
            const errorText = await response.text();
            console.error(
              `Transaction ${i + 1} failed:`,
              response.status,
              errorText
            );
          }
        } else {
          // Для обычных мерчантов
          const endpoint =
            transactionType === "IN" ? "transactions/in" : "payout";
          const amount = Math.floor(Math.random() * 9000) + 1000;
          const data =
            transactionType === "IN"
              ? {
                  amount,
                  orderId: `BATCH_IN_${Date.now()}_${i}_${Math.random()
                    .toString(36)
                    .substring(7)}`,
                  methodId: selectedMethodId,
                  rate: 95 + Math.random() * 10,
                  expired_at: new Date(Date.now() + 3600000).toISOString(),
                  userIp: `192.168.${Math.floor(
                    Math.random() * 255
                  )}.${Math.floor(Math.random() * 255)}`,
                  callbackUri: "",
                }
              : {
                  amount,
                  wallet: `5536 9137 5843 ${Math.floor(Math.random() * 10000)
                    .toString()
                    .padStart(4, "0")}`,
                  bank: "Сбербанк",
                  isCard: true,
                  rate: 95 + Math.random() * 10,
                  direction: "OUT",
                };

          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/merchant/${endpoint}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-merchant-api-key": merchantToken,
              },
              body: JSON.stringify(data),
            }
          );

          if (response.ok) {
            successCount++;
            console.log(
              `Transaction ${i + 1} created successfully (non-test merchant)`
            );
          } else {
            errorCount++;
            const errorText = await response.text();
            console.error(
              `Transaction ${i + 1} failed (non-test merchant):`,
              response.status,
              errorText
            );
          }
        }

        // Small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        errorCount++;
        console.error(`Transaction ${i + 1} exception:`, error);
      }
    }

    setIsBatchLoading(false);
    console.log("Batch creation completed:", { successCount, errorCount });

    if (successCount === 0 && errorCount === 0) {
      toast.error(
        "Не удалось создать ни одной транзакции. Проверьте консоль для деталей."
      );
    } else {
      toast.success("Пакетное создание завершено", {
        description: `Успешно: ${successCount}, Ошибок: ${errorCount}`,
      });
    }
  };

  if (merchantMethods.length === 0) {
    return null;
  }

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-yellow-500" />
          Быстрое создание транзакции
        </CardTitle>
        <CardDescription className="dark:text-gray-400">
          Создать одну транзакцию для тестирования
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label className="text-sm">Тип</Label>
            <Select
              value={transactionType}
              onValueChange={(v) => setTransactionType(v as "IN" | "OUT")}
            >
              <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                <SelectItem
                  value="IN"
                  className="dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  Входящая (IN)
                </SelectItem>
                <SelectItem
                  value="OUT"
                  className="dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  Исходящая (OUT)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm">Метод оплаты</Label>
            <Select value={methodId} onValueChange={setMethodId}>
              <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600">
                <SelectValue placeholder="Выберите" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                {merchantMethods.map((mm) => (
                  <SelectItem
                    key={mm.method.id}
                    value={mm.method.id}
                    className="dark:text-gray-200 dark:hover:bg-gray-600"
                  >
                    {mm.method.name} ({mm.method.code})
                  </SelectItem>
                ))}
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

          <div className="flex items-end">
            <Button
              onClick={createQuickTransaction}
              disabled={isLoading || !methodId || !amount}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              Создать
            </Button>
          </div>
        </div>

        {/* Batch creation buttons */}
        <div className="border-t dark:border-gray-700 pt-4 mt-4 space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Быстрое создание пакета транзакций
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => createBatchTransactions(5)}
              disabled={isBatchLoading}
              className="dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-200"
            >
              {isBatchLoading && (
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              )}
              Создать 5
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => createBatchTransactions(10)}
              disabled={isBatchLoading}
              className="dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-200"
            >
              {isBatchLoading && (
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              )}
              Создать 10
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => createBatchTransactions(20)}
              disabled={isBatchLoading}
              className="dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-200"
            >
              {isBatchLoading && (
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              )}
              Создать 20
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
