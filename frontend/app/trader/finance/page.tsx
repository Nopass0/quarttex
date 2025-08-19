"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useTraderStore } from "@/stores/trader";
import { formatCurrency } from "@/lib/utils";
import { Wallet, History, Plus } from "lucide-react";
import { DepositsTab } from "@/components/finance/deposits-tab";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTraderFinancials } from "@/hooks/use-trader-financials";

export default function FinancePage() {
  const router = useRouter();
  const { financials } = useTraderStore();
  useTraderFinancials(); // Load financials data
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Финансы</h1>
      </div>

      {/* Balance Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Баланс трейдера</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(financials?.trustBalance || 0, "USDT")}
            </div>
            <p className="text-xs text-muted-foreground">
              Доступно для торговли
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Заморожено</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(financials?.frozenUsdt || 0, "USDT")}
            </div>
            <p className="text-xs text-muted-foreground">
              В активных сделках
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Страховой депозит</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(financials?.deposit || 0, "USDT")}
            </div>
            <p className="text-xs text-muted-foreground">
              Обеспечение сделок
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общий баланс</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency((financials?.trustBalance || 0) + (financials?.frozenUsdt || 0) + (financials?.deposit || 0), "USDT")}
            </div>
            <p className="text-xs text-muted-foreground">
              Сумма всех средств
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="deposits">Пополнения</TabsTrigger>
          <TabsTrigger value="history">История</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Финансовый обзор</CardTitle>
              <CardDescription>
                Управляйте своими финансами и отслеживайте транзакции
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Прибыль за сегодня</p>
                  <p className="text-2xl font-bold text-green-600">
                    +{formatCurrency(financials?.profitFromDeals || 0, "USDT")}
                  </p>
                </div>
                <History className="h-8 w-8 text-muted-foreground" />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Прибыль за месяц</p>
                  <p className="text-2xl font-bold text-green-600">
                    +{formatCurrency((financials?.profitFromDeals || 0) + (financials?.profitFromPayouts || 0), "USDT")}
                  </p>
                </div>
                <History className="h-8 w-8 text-muted-foreground" />
              </div>

              <Button className="w-full" size="lg" onClick={() => setActiveTab("deposits")}>
                <Plus className="mr-2 h-4 w-4" />
                Пополнить баланс
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deposits">
          <DepositsTab />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>История транзакций</CardTitle>
              <CardDescription>
                Все финансовые операции за последний период
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                История транзакций будет доступна в следующем обновлении
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}