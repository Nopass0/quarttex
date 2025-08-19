"use client";

import { useState, useEffect, useRef } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAdminAuth } from "@/stores/auth";
import {
  RefreshCw,
  Send,
  Shuffle,
  AlertCircle,
  Smartphone,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DeviceSelector } from "@/components/ui/device-selector";

interface TestMerchantTransactionsProps {
  merchantId: string;
  merchantToken: string;
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

interface Device {
  id: string;
  name: string;
  trader: {
    email: string;
    name?: string;
  };
  isOnline: boolean;
  bankDetails: Array<{
    id: string;
    bankType: string;
    cardNumber: string;
    methodType: string;
  }>;
}

export function TestMerchantTransactions({
  merchantId,
  merchantToken,
  merchantMethods,
}: TestMerchantTransactionsProps) {
  const { token: adminToken } = useAdminAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [useRandomData, setUseRandomData] = useState(true);

  // Form data
  const [transactionType, setTransactionType] = useState<"IN" | "OUT">("IN");
  const [methodId, setMethodId] = useState("");
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("");
  const [orderId, setOrderId] = useState("");
  const [userIp, setUserIp] = useState("");
  const [callbackUri, setCallbackUri] = useState("");

  // Auto-creation state - separate for IN and OUT
  const [autoCreateEnabled, setAutoCreateEnabled] = useState<{
    IN: boolean;
    OUT: boolean;
  }>({ IN: false, OUT: false });
  const [minDelay, setMinDelay] = useState<{ IN: string; OUT: string }>({
    IN: "5",
    OUT: "5",
  });
  const [maxDelay, setMaxDelay] = useState<{ IN: string; OUT: string }>({
    IN: "30",
    OUT: "30",
  });
  const autoCreateInterval = useState<{
    IN: NodeJS.Timeout | null;
    OUT: NodeJS.Timeout | null;
  }>({ IN: null, OUT: null })[0];
  const autoCreateEnabledRef = useRef(autoCreateEnabled);

  // Notification form data
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [selectedBankPackage, setSelectedBankPackage] = useState("");
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationAmount, setNotificationAmount] = useState("");
  const [customNotificationText, setCustomNotificationText] = useState("");
  const [useCustomText, setUseCustomText] = useState(false);

  // Update ref when state changes
  useEffect(() => {
    autoCreateEnabledRef.current = autoCreateEnabled;
  }, [autoCreateEnabled]);

  // Load devices on component mount
  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/devices?pageSize=100`,
        {
          headers: {
            "x-admin-key": adminToken || "",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setDevices(data.devices || []);
      }
    } catch (error) {
      console.error("Failed to load devices:", error);
    }
  };

  const activeMethods = merchantMethods?.filter((m) => m.isEnabled) || [];

  const createTestSMS = async (count = 5) => {
    setIsLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/messages/bulk-test-sms`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminToken || "",
          },
          body: JSON.stringify({ count }),
        },
      );

      if (response.ok) {
        const result = await response.json();
        toast.success(`Создано ${result.count} тестовых SMS`, {
          description: "Сообщения отправлены случайным трейдерам",
        });
      } else {
        const error = await response.json();
        toast.error(error.error || "Ошибка создания SMS");
      }
    } catch (error) {
      toast.error("Не удалось создать тестовые SMS");
    } finally {
      setIsLoading(false);
    }
  };

  const bankPackageNames = {
    SBERBANK: "ru.sberbankmobile",
    VTB: "ru.vtb24.mobilebanking.android",
    TBANK: "com.idamob.tinkoff.android",
    TINKOFF: "com.idamob.tinkoff.android",
    ALFABANK: "ru.alfabank.mobile.android",
    ALFA: "ru.alfabank.mobile.android",
    RAIFFEISEN: "ru.raiffeisen.mobile.new",
    RAIF: "ru.raiffeisen.mobile.new",
    GAZPROMBANK: "ru.gazprombank.android.mobilebank.app",
    POCHTABANK: "ru.pochta.bank",
    PROMSVYAZBANK: "ru.psbank.mobile",
    PSB: "ru.psbank.mobile",
    SOVCOMBANK: "ru.ftc.faktura.sovkombank",
    SPBBANK: "ru.bspb",
    BSPB: "ru.bspb",
    ROSSELKHOZBANK: "ru.rshb.mbank",
    RSHB: "ru.rshb.mbank",
    OTKRITIE: "com.openbank",
    URALSIB: "ru.uralsib.mobile",
    MKB: "ru.mkb.mobile",
    ROSBANK: "ru.rosbank.android",
    OZONBANK: "ru.ozon.app.android",
    MTSBANK: "ru.mtsbank.mobile",
    AKBARS: "ru.akbars.mobile",
    CITIBANK: "com.citi.citimobile",
    UNICREDIT: "ru.unicreditbank.mobile",
    RUSSIANSTANDARD: "ru.rs.mobilebank",
  };

  const generateBankNotificationText = (amount: string, bankType: string) => {
    const senderNames = [
      "IVANOV I I",
      "PETROV A V",
      "SIDOROV M M",
      "KOZLOV D A",
      "NOVIKOV S S",
    ];
    const randomSender =
      senderNames[Math.floor(Math.random() * senderNames.length)];
    const currentBalance = (
      parseFloat(amount) +
      Math.floor(Math.random() * 50000) +
      10000
    ).toFixed(2);

    const templates = {
      SBERBANK: `Перевод от ${randomSender}. Сумма: ${amount} руб. Баланс: ${currentBalance} руб. Карта *1234`,
      VTB: `ВТБ. Поступление ${amount} руб от ${randomSender}. Баланс ${currentBalance} руб`,
      TBANK: `Тинькофф. Зачисление ${amount}₽ от ${randomSender}. Баланс ${currentBalance}₽`,
      TINKOFF: `Тинькофф. Зачисление ${amount}₽ от ${randomSender}. Баланс ${currentBalance}₽`,
      ALFABANK: `Альфа-Банк. Перевод ${amount} руб. От: ${randomSender}. Баланс: ${currentBalance} руб`,
      ALFA: `Альфа-Банк. Перевод ${amount} руб. От: ${randomSender}. Баланс: ${currentBalance} руб`,
      RAIFFEISEN: `Райффайзен. Зачисление ${amount} руб от ${randomSender}. Остаток ${currentBalance} руб`,
      RAIF: `Райффайзен. Зачисление ${amount} руб от ${randomSender}. Остаток ${currentBalance} руб`,
      GAZPROMBANK: `Газпромбанк. Перевод ${amount} ₽ от ${randomSender}. Баланс: ${currentBalance} ₽`,
      POCHTABANK: `Почта Банк. Пополнение ${amount} руб. От: ${randomSender}. Доступно: ${currentBalance} руб`,
      PROMSVYAZBANK: `ПСБ. Зачисление ${amount} руб от ${randomSender}. Баланс ${currentBalance} руб`,
      PSB: `ПСБ. Зачисление ${amount} руб от ${randomSender}. Баланс ${currentBalance} руб`,
      SOVCOMBANK: `Совкомбанк. Перевод +${amount} ₽ от ${randomSender}. Остаток: ${currentBalance} ₽`,
      SPBBANK: `Банк Санкт-Петербург. Зачисление ${amount} руб. Баланс: ${currentBalance} руб`,
      BSPB: `Банк Санкт-Петербург. Зачисление ${amount} руб. Баланс: ${currentBalance} руб`,
      ROSSELKHOZBANK: `Россельхозбанк. Поступление ${amount} руб от ${randomSender}. Баланс ${currentBalance} руб`,
      RSHB: `Россельхозбанк. Поступление ${amount} руб от ${randomSender}. Баланс ${currentBalance} руб`,
      OTKRITIE: `Открытие. Перевод ${amount} ₽ от ${randomSender}. Доступно: ${currentBalance} ₽`,
      URALSIB: `Уралсиб. Зачисление ${amount} руб. От: ${randomSender}. Баланс: ${currentBalance} руб`,
      MKB: `МКБ. Пополнение ${amount} руб от ${randomSender}. Остаток ${currentBalance} руб`,
      ROSBANK: `Росбанк. Перевод +${amount} руб. От: ${randomSender}. Баланс: ${currentBalance} руб`,
      OZONBANK: `Ozon Банк. Зачисление ${amount} ₽ от ${randomSender}. Баланс ${currentBalance} ₽`,
      MTSBANK: `МТС Банк. Пополнение ${amount} руб. Отправитель: ${randomSender}. Доступно: ${currentBalance} руб`,
      AKBARS: `Ак Барс. Пополнение. Сумма: ${amount} RUR. От: ${randomSender}. Баланс: ${currentBalance} RUR`,
      CITIBANK: `Citibank. Transfer ${amount} RUB from ${randomSender}. Balance: ${currentBalance} RUB`,
      UNICREDIT: `ЮниКредит. Перевод ${amount} руб от ${randomSender}. Баланс ${currentBalance} руб`,
      RUSSIANSTANDARD: `Русский Стандарт. Зачисление ${amount} руб. От: ${randomSender}. Остаток: ${currentBalance} руб`,
    };

    return (
      templates[bankType as keyof typeof templates] || templates["SBERBANK"]
    );
  };

  const createTestNotification = async () => {
    if (!selectedDevice || !notificationAmount) {
      toast.error("Выберите устройство и укажите сумму");
      return;
    }

    setIsLoading(true);

    try {
      const device = devices.find((d) => d.id === selectedDevice);
      if (!device) {
        toast.error("Устройство не найдено");
        return;
      }

      // Определяем банк из реквизитов устройства или используем Сбербанк по умолчанию
      const bankDetail = device.bankDetails[0];
      const bankType = bankDetail?.bankType || "SBERBANK";

      // Используем выбранный пакет или определяем из реквизитов
      const packageName =
        selectedBankPackage ||
        bankPackageNames[bankType as keyof typeof bankPackageNames] ||
        bankPackageNames["SBERBANK"];
      const title = notificationTitle || bankType;

      // Генерируем текст уведомления
      const messageText =
        useCustomText && customNotificationText
          ? customNotificationText
          : generateBankNotificationText(notificationAmount, bankType);

      // Создаем уведомление
      const notificationData = {
        deviceId: selectedDevice,
        type: "AppNotification",
        application: packageName,
        title: title,
        message: messageText,
        metadata: {
          packageName: packageName,
          amount: parseFloat(notificationAmount),
          bankType: bankType,
        },
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/messages/create-notification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminToken || "",
          },
          body: JSON.stringify(notificationData),
        },
      );

      if (response.ok) {
        const result = await response.json();
        toast.success("Тестовое уведомление создано", {
          description: `Отправлено на устройство ${device.name} (${device.trader?.email || "N/A"})`,
        });

        // Очищаем форму
        setNotificationAmount("");
        setNotificationTitle("");
        setCustomNotificationText("");
        setSelectedBankPackage("");
      } else {
        const error = await response.json();
        toast.error(error.error || "Ошибка создания уведомления");
      }
    } catch (error) {
      toast.error("Не удалось создать уведомление");
      console.error("Notification creation error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomData = () => {
    const randomAmount = Math.floor(Math.random() * 9000) + 1000;
    const randomRate = (95 + Math.random() * 10).toFixed(2);
    const randomOrderId = `TEST_${transactionType}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const randomIp = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

    setAmount(randomAmount.toString());
    setRate(randomRate);
    setOrderId(randomOrderId);
    setUserIp(randomIp);
  };

  const createTransaction = async () => {
    if (!methodId) {
      toast.error("Выберите метод оплаты");
      return;
    }

    try {
      setIsLoading(true);

      const data: any = {
        methodId,
        amount: useRandomData
          ? Math.floor(Math.random() * 9000) + 1000
          : Number(amount),
        orderId: useRandomData
          ? `TEST_${transactionType}_${Date.now()}_${Math.random().toString(36).substring(7)}`
          : orderId,
        expired_at: new Date(Date.now() + 3600000).toISOString(),
        userIp: useRandomData
          ? `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
          : userIp,
      };

      // For OUT transactions, don't include rate - let backend handle it based on merchant settings
      // For IN transactions, always include rate as merchant API expects it
      if (transactionType === "IN") {
        data.rate = useRandomData ? 95 + Math.random() * 10 : Number(rate);
      }

      // Добавляем callbackUri только если он задан
      if (callbackUri) {
        data.callbackUri = callbackUri;
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
        },
      );

      const result = await response.json();

      if (response.ok) {
        toast.success(`Транзакция ${transactionType} создана успешно`, {
          description: `ID: ${result.id || result.transaction?.id}, Сумма: ${result.amount || result.transaction?.amount} ₽`,
        });

        // Reset form if using custom data
        if (!useRandomData) {
          setAmount("");
          setOrderId("");
          setUserIp("");
        }
      } else {
        toast.error("Ошибка создания транзакции", {
          description: result.error || "Неизвестная ошибка",
        });
        console.error("Transaction creation failed:", result);
      }
    } catch (error) {
      toast.error("Ошибка при отправке запроса", {
        description:
          error instanceof Error ? error.message : "Неизвестная ошибка",
      });
      console.error("Request error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createBatchTransactions = async (count: number) => {
    if (activeMethods.length === 0) {
      toast.error("Нет активных методов оплаты");
      return;
    }

    setIsLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < count; i++) {
      try {
        const randomMethodId =
          activeMethods[Math.floor(Math.random() * activeMethods.length)]
            ?.method.id;
        if (!randomMethodId) continue;

        const data: any = {
          methodId: randomMethodId,
          amount: Math.floor(Math.random() * 9000) + 1000,
          orderId: `BATCH_${transactionType}_${Date.now()}_${i}_${Math.random().toString(36).substring(7)}`,
          expired_at: new Date(Date.now() + 3600000).toISOString(),
          userIp: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        };

        // For OUT transactions, don't include rate - let backend handle it based on merchant settings
        // For IN transactions, always include rate as merchant API expects it
        if (transactionType === "IN") {
          data.rate = 95 + Math.random() * 10;
        }

        // Добавляем callbackUri только если он задан
        if (callbackUri) {
          data.callbackUri = callbackUri;
        }

        console.log("Sending transaction data:", data);

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
          },
        );

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
          try {
            const error = await response.json();
            console.error("Transaction creation failed:", error);
            // Show the actual error message if it's the first error
            if (errorCount === 1) {
              toast.error("Ошибка создания транзакции", {
                description: error.error || "Неизвестная ошибка",
              });
            }
          } catch (e) {
            console.error("Failed to parse error response:", e);
          }
        }

        // Small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        errorCount++;
      }
    }

    setIsLoading(false);
    toast.success("Пакетное создание завершено", {
      description: `Успешно: ${successCount}, Ошибок: ${errorCount}`,
    });
  };

  // Auto-creation functions
  const startAutoCreate = async (type: "IN" | "OUT") => {
    if (!methodId && activeMethods.length === 0) {
      toast.error("Выберите метод оплаты или активируйте хотя бы один метод");
      return;
    }

    // Enable device emulator service
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/services/device-emulator/toggle`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminToken || "",
          },
          body: JSON.stringify({ enabled: true }),
        },
      );
    } catch (error) {
      console.error("Failed to enable device emulator:", error);
    }

    setAutoCreateEnabled((prev) => ({ ...prev, [type]: true }));
    scheduleNextTransaction(type);
  };

  const stopAutoCreate = async (type: "IN" | "OUT") => {
    setAutoCreateEnabled((prev) => ({ ...prev, [type]: false }));
    if (autoCreateInterval[type]) {
      clearTimeout(autoCreateInterval[type]);
      autoCreateInterval[type] = null;
    }

    // Check if other type is also disabled, then disable device emulator
    const otherType = type === "IN" ? "OUT" : "IN";
    if (!autoCreateEnabledRef.current[otherType]) {
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/admin/services/device-emulator/toggle`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-admin-key": adminToken || "",
            },
            body: JSON.stringify({ enabled: false }),
          },
        );
      } catch (error) {
        console.error("Failed to disable device emulator:", error);
      }
    }
  };

  const scheduleNextTransaction = (type: "IN" | "OUT") => {
    const min = parseInt(minDelay[type]) * 1000;
    const max = parseInt(maxDelay[type]) * 1000;
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;

    console.log(`Scheduling next ${type} transaction in ${delay}ms`);

    const timeout = setTimeout(async () => {
      console.log(
        `Auto-create timer fired for ${type}, enabled:`,
        autoCreateEnabledRef.current[type],
      );
      if (autoCreateEnabledRef.current[type]) {
        await createAutoTransaction(type);
        scheduleNextTransaction(type);
      }
    }, delay);

    autoCreateInterval[type] = timeout;
  };

  const createAutoTransaction = async (type: "IN" | "OUT") => {
    try {
      const selectedMethodId =
        methodId ||
        activeMethods[Math.floor(Math.random() * activeMethods.length)]?.method
          .id;
      if (!selectedMethodId) return;

      const data: any = {
        methodId: selectedMethodId,
        amount: Math.floor(Math.random() * 9000) + 1000,
        orderId: `AUTO_${type}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        expired_at: new Date(Date.now() + 3600000).toISOString(),
        userIp: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      };

      // For OUT transactions, don't include rate - let backend handle it based on merchant settings
      // For IN transactions, always include rate as merchant API expects it
      if (type === "IN") {
        data.rate = 95 + Math.random() * 10;
      }

      if (callbackUri) {
        data.callbackUri = callbackUri;
      }

      const endpoint = type === "IN" ? "in" : "out";
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/transactions/test/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminToken || "",
          },
          body: JSON.stringify(data),
        },
      );

      const result = await response.json();

      if (response.ok) {
        toast.success(`Авто-транзакция ${type} создана`, {
          description: `ID: ${result.id}, Сумма: ${result.amount} ₽`,
        });
      } else {
        console.error(`Auto-transaction ${type} failed:`, result);
      }
    } catch (error) {
      console.error(`Auto-transaction ${type} error:`, error);
    }
  };

  // Cleanup on unmount or when auto-create is disabled
  useEffect(() => {
    return () => {
      if (autoCreateInterval.IN) {
        clearTimeout(autoCreateInterval.IN);
      }
      if (autoCreateInterval.OUT) {
        clearTimeout(autoCreateInterval.OUT);
      }
    };
  }, []);

  useEffect(() => {
    if (!autoCreateEnabled.IN && autoCreateInterval.IN) {
      clearTimeout(autoCreateInterval.IN);
      autoCreateInterval.IN = null;
    }
    if (!autoCreateEnabled.OUT && autoCreateInterval.OUT) {
      clearTimeout(autoCreateInterval.OUT);
      autoCreateInterval.OUT = null;
    }
  }, [autoCreateEnabled]);

  return (
    <>
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Тестовые транзакции</CardTitle>
          <CardDescription className="dark:text-gray-400">
            Создание тестовых транзакций для эмуляции работы мерчанта
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="random-mode" className="dark:text-gray-300">
              Использовать случайные данные
            </Label>
            <Switch
              id="random-mode"
              checked={useRandomData}
              onCheckedChange={setUseRandomData}
              className="dark:bg-gray-700"
            />
          </div>

          <Tabs
            value={transactionType}
            onValueChange={(v) => setTransactionType(v as "IN" | "OUT")}
          >
            <TabsList className="grid w-full grid-cols-2 dark:bg-gray-700">
              <TabsTrigger
                value="IN"
                className="dark:data-[state=active]:bg-gray-600 dark:data-[state=active]:text-white"
              >
                Входящие (IN)
              </TabsTrigger>
              <TabsTrigger
                value="OUT"
                className="dark:data-[state=active]:bg-gray-600 dark:data-[state=active]:text-white"
              >
                Исходящие (OUT)
              </TabsTrigger>
            </TabsList>

            <TabsContent value={transactionType} className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="method" className="dark:text-gray-300">
                    Метод оплаты
                  </Label>
                  <Select value={methodId} onValueChange={setMethodId}>
                    <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <SelectValue placeholder="Выберите метод" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                      {activeMethods.map((mm) => (
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

                {!useRandomData && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="amount" className="dark:text-gray-300">
                          Сумма (₽)
                        </Label>
                        <Input
                          id="amount"
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="5000"
                          className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                        />
                      </div>
                      <div>
                        <Label htmlFor="rate" className="dark:text-gray-300">
                          Курс USDT/RUB
                        </Label>
                        <Input
                          id="rate"
                          type="number"
                          step="0.01"
                          value={rate}
                          onChange={(e) => setRate(e.target.value)}
                          placeholder="95.5"
                          className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="orderId" className="dark:text-gray-300">
                        Order ID
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="orderId"
                          value={orderId}
                          onChange={(e) => setOrderId(e.target.value)}
                          placeholder="TEST_ORDER_123"
                          className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            setOrderId(
                              `TEST_${transactionType}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                            )
                          }
                          className="dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
                        >
                          <Shuffle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="userIp" className="dark:text-gray-300">
                        IP пользователя
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="userIp"
                          value={userIp}
                          onChange={(e) => setUserIp(e.target.value)}
                          placeholder="192.168.1.1"
                          className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            setUserIp(
                              `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
                            )
                          }
                          className="dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
                        >
                          <Shuffle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="callbackUri" className="dark:text-gray-300">
                    Callback URL (опционально)
                  </Label>
                  <Input
                    id="callbackUri"
                    value={callbackUri}
                    onChange={(e) => setCallbackUri(e.target.value)}
                    placeholder="https://example.com/webhook"
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={createTransaction}
                  disabled={
                    isLoading ||
                    !methodId ||
                    (!useRandomData && (!amount || !rate || !orderId))
                  }
                  className="flex-1"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Создать транзакцию
                </Button>

                {!useRandomData && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateRandomData}
                  >
                    <Shuffle className="h-4 w-4 mr-2" />
                    Заполнить случайными
                  </Button>
                )}
              </div>

              {useRandomData && (
                <div className="border-t dark:border-gray-700 pt-4 space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Быстрое создание пакета транзакций
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => createBatchTransactions(1)}
                      disabled={isLoading}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-200"
                    >
                      Создать 1
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => createBatchTransactions(2)}
                      disabled={isLoading}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-200"
                    >
                      Создать 2
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => createBatchTransactions(5)}
                      disabled={isLoading}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-200"
                    >
                      Создать 5
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => createBatchTransactions(10)}
                      disabled={isLoading}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-200"
                    >
                      Создать 10
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => createBatchTransactions(20)}
                      disabled={isLoading}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-200"
                    >
                      Создать 20
                    </Button>
                  </div>

                  {/* Auto-creation section */}
                  <div className="border dark:border-gray-700 rounded-lg p-4 space-y-4 mt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm dark:text-gray-200">
                          Автоматическое создание
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Создание транзакций с случайной задержкой
                        </p>
                      </div>
                      <Switch
                        checked={autoCreateEnabled[transactionType]}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            startAutoCreate(transactionType);
                          } else {
                            stopAutoCreate(transactionType);
                          }
                        }}
                        className="dark:bg-gray-700"
                      />
                    </div>

                    {autoCreateEnabled[transactionType] && (
                      <Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700">
                        Автосоздание {transactionType} активно
                      </Badge>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs dark:text-gray-300">
                          Мин. задержка (сек)
                        </Label>
                        <Input
                          type="number"
                          value={minDelay[transactionType]}
                          onChange={(e) =>
                            setMinDelay((prev) => ({
                              ...prev,
                              [transactionType]: e.target.value,
                            }))
                          }
                          min="1"
                          max="300"
                          disabled={autoCreateEnabled[transactionType]}
                          className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-xs dark:text-gray-300">
                          Макс. задержка (сек)
                        </Label>
                        <Input
                          type="number"
                          value={maxDelay[transactionType]}
                          onChange={(e) =>
                            setMaxDelay((prev) => ({
                              ...prev,
                              [transactionType]: e.target.value,
                            }))
                          }
                          min="1"
                          max="300"
                          disabled={autoCreateEnabled[transactionType]}
                          className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Транзакции {transactionType} будут создаваться
                      автоматически с задержкой от {minDelay[transactionType]}{" "}
                      до {maxDelay[transactionType]} секунд
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Секция для создания тестовых SMS */}
      <Card className="mt-4 dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-white">
            Тестовые SMS сообщения
          </CardTitle>
          <CardDescription className="dark:text-gray-400">
            Создание моковых SMS от банков для тестирования
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert className="dark:bg-gray-700 dark:border-gray-600">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="dark:text-gray-300">
                SMS будут отправлены случайным активным трейдерам с имитацией
                банковских уведомлений
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                onClick={() => createTestSMS(1)}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading && (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                )}
                Создать 1 SMS
              </Button>
              <Button
                onClick={() => createTestSMS(5)}
                disabled={isLoading}
                variant="outline"
                className="flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
              >
                {isLoading && (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                )}
                Создать 5 SMS
              </Button>
              <Button
                onClick={() => createTestSMS(10)}
                disabled={isLoading}
                variant="outline"
                className="flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
              >
                {isLoading && (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                )}
                Создать 10 SMS
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Секция для создания тестовых уведомлений от банков */}
      <Card className="mt-4 dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-white">
            <Smartphone className="h-5 w-5" />
            Тестовые уведомления от банков
          </CardTitle>
          <CardDescription className="dark:text-gray-400">
            Создание уведомлений с выбором устройства для тестирования
            NotificationMatcherService
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="device" className="dark:text-gray-300">
                Устройство
              </Label>
              <DeviceSelector
                devices={devices}
                selectedDeviceId={selectedDevice}
                onDeviceSelect={setSelectedDevice}
                placeholder="Выберите устройство"
              />
            </div>

            <div>
              <Label
                htmlFor="notificationAmount"
                className="dark:text-gray-300"
              >
                Сумма (₽)
              </Label>
              <Input
                id="notificationAmount"
                type="number"
                value={notificationAmount}
                onChange={(e) => setNotificationAmount(e.target.value)}
                placeholder="5000"
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bankPackage" className="dark:text-gray-300">
                Пакет банка
              </Label>
              <Select
                value={selectedBankPackage}
                onValueChange={setSelectedBankPackage}
              >
                <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue placeholder="Автоматически из реквизитов" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                  {Object.entries(bankPackageNames).map(
                    ([bank, packageName], index) => (
                      <SelectItem
                        key={`${bank}-${index}`}
                        value={packageName}
                        className="dark:text-gray-200 dark:hover:bg-gray-600"
                      >
                        {bank} - {packageName}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notificationTitle" className="dark:text-gray-300">
                Заголовок уведомления (опционально)
              </Label>
              <Input
                id="notificationTitle"
                value={notificationTitle}
                onChange={(e) => setNotificationTitle(e.target.value)}
                placeholder="Будет использован банк из реквизитов"
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="custom-text" className="dark:text-gray-300">
              Использовать свой текст уведомления
            </Label>
            <Switch
              id="custom-text"
              checked={useCustomText}
              onCheckedChange={setUseCustomText}
              className="dark:bg-gray-700"
            />
          </div>

          {useCustomText ? (
            <div>
              <Label
                htmlFor="customNotificationText"
                className="dark:text-gray-300"
              >
                Текст уведомления
              </Label>
              <Textarea
                id="customNotificationText"
                value={customNotificationText}
                onChange={(e) => setCustomNotificationText(e.target.value)}
                placeholder="Перевод от IVANOV I I. Сумма: 5000 руб. Баланс: 25000 руб."
                rows={3}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
            </div>
          ) : (
            notificationAmount && (
              <div>
                <Label className="dark:text-gray-300">
                  Сгенерированный текст:
                </Label>
                <div className="mt-1 p-3 bg-gray-100 dark:bg-gray-700 rounded border text-sm">
                  {(() => {
                    const device = devices.find((d) => d.id === selectedDevice);
                    const bankType =
                      device?.bankDetails[0]?.bankType || "SBERBANK";
                    return generateBankNotificationText(
                      notificationAmount,
                      bankType,
                    );
                  })()}
                </div>
              </div>
            )
          )}

          <Alert className="dark:bg-gray-700 dark:border-gray-600">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="dark:text-gray-300">
              Уведомление будет создано на выбранном устройстве и обработано
              NotificationMatcherService для сопоставления с транзакциями
            </AlertDescription>
          </Alert>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={createTestNotification}
              disabled={isLoading || !selectedDevice || !notificationAmount}
              className="flex-1"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Создать уведомление
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={loadDevices}
              disabled={isLoading}
              className="dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
