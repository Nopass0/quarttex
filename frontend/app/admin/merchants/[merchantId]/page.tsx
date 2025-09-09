"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AuthLayout } from "@/components/layouts/auth-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  ArrowLeft,
  RefreshCw,
  Activity,
  DollarSign,
  Key,
  TestTube,
  Settings,
  Loader2,
} from "lucide-react";
import { useAdminAuth } from "@/stores/auth";
import { toast } from "sonner";
import { formatAmount } from "@/lib/utils";
import { MerchantMilkDeals } from "@/components/admin/merchant-milk-deals";
import { MerchantExtraSettlements } from "@/components/admin/merchant-extra-settlements";
import { TestMerchantTransactions } from "@/components/admin/test-merchant-transactions";
import { WellbitTestDialog } from "@/components/admin/wellbit-test-dialog";
import { MerchantTransactions } from "@/components/admin/merchant-transactions";
import { MerchantTradersTable } from "@/components/admin/merchant-traders-table";
import { MerchantBalanceCard } from "@/components/admin/merchant-balance-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  endOfDay,
  endOfMonth,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subHours,
} from "date-fns";
import { MerchantCreateDeal } from "@/components/admin/merchant-create-deal";
import { MerchantCreatePayout } from "@/components/admin/merchant-create-payout";
import { AuctionMerchantConfig } from "@/components/admin/auction-merchant-config";

type Merchant = {
  id: string;
  name: string;
  token: string;
  apiKeyPublic?: string | null;
  apiKeyPrivate?: string | null;
  disabled: boolean;
  banned: boolean;
  countInRubEquivalent: boolean;
  balanceUsdt: number;
  balanceRub?: number;
  createdAt: string;
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
};

export default function MerchantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const merchantId = params.merchantId as string;
  const { token: adminToken } = useAdminAuth();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [balanceFormula, setBalanceFormula] = useState<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [isResetting2FA, setIsResetting2FA] = useState(false);

  console.log("MerchantDetailPage: Rendering with merchantId:", merchantId);

  // Проверяем, является ли мерчант тестовым или Wellbit
  const isTestMerchant = merchant?.name?.toLowerCase() === "test";
  const isWellbitMerchant = merchant?.name?.toLowerCase() === "wellbit";

  useEffect(() => {
    fetchMerchant();
  }, [merchantId]);

  const handleGenerateKeys = async () => {
    try {
      setIsGeneratingKeys(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/merchants/wellbit/regenerate`,
        {
          method: "POST",
          headers: {
            "x-admin-key": adminToken || "",
          },
        }
      );
      if (!response.ok) {
        throw new Error("Failed to generate keys");
      }
      const data = await response.json();

      // Update merchant data with new keys
      setMerchant((prev) =>
        prev
          ? {
              ...prev,
              apiKeyPublic: data.apiKeyPublic,
              apiKeyPrivate: data.apiKeyPrivate,
            }
          : null
      );

      toast.success("Ключи успешно сгенерированы");

      // Fetch updated merchant data to ensure we have the latest keys
      await fetchMerchant();
    } catch (error) {
      toast.error("Не удалось сгенерировать ключи");
    } finally {
      setIsGeneratingKeys(false);
    }
  };

  const handleReset2FA = async () => {
    if (!merchant) return;
    try {
      setIsResetting2FA(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/merchant/reset-2fa`,
        {
          method: "POST",
          headers: {
            "x-admin-key": adminToken || "",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: merchant.id }),
        }
      );
      if (!response.ok) throw new Error("Failed to reset 2FA");
      toast.success("2FA мерчанта сброшена");
      await fetchMerchant();
    } catch (e) {
      toast.error("Не удалось сбросить 2FA");
    } finally {
      setIsResetting2FA(false);
    }
  };

  const fetchMerchant = async () => {
    console.log("fetchMerchant: Starting fetch for merchantId:", merchantId);
    console.log("fetchMerchant: Admin token:", adminToken);
    console.log(
      "fetchMerchant: API URL:",
      `${process.env.NEXT_PUBLIC_API_URL}/admin/merchant/${merchantId}`
    );

    try {
      setIsLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/merchant/${merchantId}`,
        {
          headers: {
            "x-admin-key": adminToken || "",
          },
        }
      );
      console.log("fetchMerchant: Response status:", response.status);

      if (!response.ok) {
        throw new Error("Failed to fetch merchant");
      }
      const data = await response.json();
      console.log("fetchMerchant: Received data:", data);
      setMerchant(data);
      await fetchBalanceFormula(selectedPeriod);
    } catch (error) {
      console.error("fetchMerchant: Error:", error);
      toast.error("Не удалось загрузить данные мерчанта");
      router.push("/admin/merchants");
    } finally {
      setIsLoading(false);
    }
  };

  const getDateRange = (period: string) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    switch (period) {
      case "24h":
        startDate = subHours(now, 24);
        break;
      case "today":
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case "yesterday":
        startDate = startOfDay(subDays(now, 1));
        endDate = endOfDay(subDays(now, 1));
        break;
      case "week":
        startDate = subDays(now, 7);
        break;
      case "month":
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case "year":
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      case "all":
      default:
        startDate = new Date(0);
    }
    return { startDate, endDate };
  };

  const fetchBalanceFormula = async (period: string) => {
    try {
      const { startDate, endDate } = getDateRange(period);
      const params = new URLSearchParams({
        pageSize: "1",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL
        }/admin/merchant/${merchantId}/transactions?${params.toString()}`,
        {
          headers: {
            "x-admin-key": adminToken || "",
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setBalanceFormula(data.balanceFormula);
      }
    } catch (error) {
      console.error("Failed to fetch balance formula:", error);
    }
  };

  useEffect(() => {
    fetchBalanceFormula(selectedPeriod);
  }, [selectedPeriod]);

  const copyToClipboard = (
    text: string,
    message: string = "Скопировано в буфер обмена"
  ) => {
    navigator.clipboard.writeText(text);
    toast.success(message);
  };

  if (isLoading || !merchant) {
    return (
      <ProtectedRoute variant="admin">
        <AuthLayout variant="admin">
          <div className="flex justify-center items-center h-[50vh]">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </AuthLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/admin/merchants")}
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Назад к списку
                </Button>
                <h1 className="text-2xl font-semibold mt-2 lg:mt-0">
                  {merchant?.name || "Мерчант"}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                {isWellbitMerchant && (
                  <Button
                    onClick={handleGenerateKeys}
                    disabled={isGeneratingKeys}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isGeneratingKeys ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                        Обновляем ключи
                      </>
                    ) : (
                      <>
                        <Key className="h-4 w-4 mr-2" /> Сгенерировать Wellbit
                        ключи
                      </>
                    )}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleReset2FA}
                  disabled={isResetting2FA}
                >
                  {isResetting2FA ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                      Сбрасываем 2FA
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" /> Сбросить 2FA
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-4">
                <Badge
                  variant={merchant.disabled ? "secondary" : "default"}
                  className={
                    merchant.disabled
                      ? "bg-gray-100 dark:bg-gray-700"
                      : "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700"
                  }
                >
                  {merchant.disabled ? "Отключен" : "Активен"}
                </Badge>
                <Badge
                  variant={merchant.banned ? "destructive" : "outline"}
                  className={
                    merchant.banned ? "" : "text-gray-600 dark:text-gray-400"
                  }
                >
                  {merchant.banned ? "Заблокирован" : "Не заблокирован"}
                </Badge>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchMerchant}
                  disabled={isLoading}
                  className="hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
            </div>
          </div>

          {/* Wellbit API Keys */}
          {isWellbitMerchant && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold mb-4">Wellbit API ключи</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-2">
                    x-api-key (Публичный ключ)
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded flex-1 truncate font-mono">
                      {merchant.apiKeyPublic || "Не установлен"}
                    </code>
                    {merchant.apiKeyPublic && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(
                            merchant.apiKeyPublic!,
                            "Публичный ключ скопирован"
                          )
                        }
                        className="hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-2">
                    Приватный ключ (для генерации x-api-token)
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded flex-1 truncate font-mono">
                      {merchant.apiKeyPrivate || "Не установлен"}
                    </code>
                    {merchant.apiKeyPrivate && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(
                            merchant.apiKeyPrivate!,
                            "Приватный ключ скопирован"
                          )
                        }
                        className="hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <Button
                    onClick={handleGenerateKeys}
                    disabled={isGeneratingKeys}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Key className="h-4 w-4 mr-2" />
                    {isGeneratingKeys
                      ? "Генерация..."
                      : "Сгенерировать новые ключи"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/admin/wellbit-keys")}
                    className="hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Настройки Wellbit
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Создание тестовых сделок (реальный merchant endpoint) */}
          <MerchantCreateDeal
            merchantId={merchantId}
            merchantToken={merchant.token}
            merchantMethods={
              merchant.merchantMethods?.filter((m) => m.isEnabled) || []
            }
            countInRubEquivalent={!!merchant.countInRubEquivalent}
          />

          {/* Создание тестовых выплат (реальный merchant endpoint) */}
          <MerchantCreatePayout
            merchantId={merchantId}
            merchantToken={merchant.token}
            merchantMethods={
              merchant.merchantMethods?.filter((m) => m.isEnabled) || []
            }
            countInRubEquivalent={!!merchant.countInRubEquivalent}
          />

          <div className="flex justify-end mb-4">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Период" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">24 часа</SelectItem>
                <SelectItem value="today">Сегодня</SelectItem>
                <SelectItem value="yesterday">Вчера</SelectItem>
                <SelectItem value="week">Неделя</SelectItem>
                <SelectItem value="month">Месяц</SelectItem>
                <SelectItem value="year">Год</SelectItem>
                <SelectItem value="all">Все время</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Merchant Balance Card */}
          <MerchantBalanceCard
            merchantId={merchantId}
            merchantName={merchant.name}
            countInRubEquivalent={merchant.countInRubEquivalent}
            adminToken={adminToken || ""}
          />

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border dark:border-gray-700 hover:shadow-md dark:hover:shadow-gray-900 transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    Активных методов
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {merchant.merchantMethods?.filter((m) => m.isEnabled)
                      .length || 0}
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-normal ml-1">
                      / {merchant.merchantMethods?.length || 0}
                    </span>
                  </p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
            {!isWellbitMerchant ? (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border dark:border-gray-700 hover:shadow-md dark:hover:shadow-gray-900 transition-shadow">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-3">
                    API ключ
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded flex-1 truncate font-mono">
                      {merchant.token}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(merchant.token, "API ключ скопирован")
                      }
                      className="hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border dark:border-gray-700 hover:shadow-md dark:hover:shadow-gray-900 transition-shadow">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-2">
                      Token (для входа)
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded flex-1 truncate font-mono">
                        {merchant.token}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(merchant.token, "Token скопирован")
                        }
                        className="hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <Tabs
            defaultValue={isTestMerchant ? "test-transactions" : "milk-deals"}
            className="space-y-6"
          >
            <TabsList
              className={`grid w-full ${
                isTestMerchant ? "grid-cols-6" : "grid-cols-5"
              } lg:w-auto lg:inline-grid dark:bg-gray-800`}
            >
              {isTestMerchant && (
                <TabsTrigger
                  value="test-transactions"
                  className="data-[state=active]:bg-purple-100 dark:data-[state=active]:bg-purple-900/30 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300"
                >
                  Тестовые транзакции
                </TabsTrigger>
              )}
              <TabsTrigger value="milk-deals">Проблемные платежи</TabsTrigger>
              <TabsTrigger value="extra-settlements">
                Дополнительные расчеты
              </TabsTrigger>
              <TabsTrigger value="traders">Трейдеры</TabsTrigger>
              <TabsTrigger value="methods">Методы оплаты</TabsTrigger>
              <TabsTrigger value="auction">Аукционная система</TabsTrigger>
            </TabsList>

            {isTestMerchant && (
              <TabsContent value="test-transactions" className="mt-6">
                <TestMerchantTransactions
                  merchantId={merchantId}
                  merchantToken={merchant.token}
                  merchantMethods={merchant.merchantMethods || []}
                />
              </TabsContent>
            )}

            <TabsContent value="transactions" className="mt-6">
              <MerchantTransactions merchantId={merchantId} />
            </TabsContent>

            <TabsContent value="milk-deals" className="mt-6">
              <MerchantMilkDeals merchantId={merchantId} />
            </TabsContent>

            <TabsContent value="extra-settlements" className="mt-6">
              <MerchantExtraSettlements merchantId={merchantId} />
            </TabsContent>

            <TabsContent value="traders" className="mt-6">
              <MerchantTradersTable merchantId={merchantId} />
            </TabsContent>

            <TabsContent value="methods" className="mt-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                <div className="p-6 border-b dark:border-gray-700">
                  <h3 className="text-lg font-semibold">
                    Подключенные методы оплаты
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Методы, доступные для приема платежей
                  </p>
                </div>
                <div className="p-6">
                  {merchant.merchantMethods?.length > 0 ? (
                    <div className="space-y-3">
                      {merchant.merchantMethods.map((mm) => (
                        <div
                          key={mm.id}
                          className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`p-2 rounded-lg ${
                                mm.isEnabled
                                  ? "bg-green-50 dark:bg-green-900/30"
                                  : "bg-gray-100 dark:bg-gray-700"
                              }`}
                            >
                              <Activity
                                className={`h-5 w-5 ${
                                  mm.isEnabled
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-gray-400 dark:text-gray-500"
                                }`}
                              />
                            </div>
                            <div>
                              <div className="font-medium">
                                {mm.method.name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                                <code className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">
                                  {mm.method.code}
                                </code>
                                <span>•</span>
                                <span>{mm.method.type}</span>
                                <span>•</span>
                                <span className="uppercase">
                                  {mm.method.currency}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Badge
                            variant={mm.isEnabled ? "default" : "secondary"}
                            className={
                              mm.isEnabled
                                ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700"
                                : "dark:bg-gray-700 dark:text-gray-400"
                            }
                          >
                            {mm.isEnabled ? "Активен" : "Отключен"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Activity className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">
                        Нет подключенных методов
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="auction" className="mt-6">
              <AuctionMerchantConfig
                merchantId={merchantId}
                merchantName={merchant.name}
                adminToken={adminToken || ""}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Wellbit Test Dialog */}
        {isWellbitMerchant && (
          <WellbitTestDialog
            open={showTestDialog}
            onOpenChange={setShowTestDialog}
            apiKeyPublic={merchant.apiKeyPublic}
            apiKeyPrivate={merchant.apiKeyPrivate}
          />
        )}
      </AuthLayout>
    </ProtectedRoute>
  );
}
