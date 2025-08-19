"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { adminApi } from "@/services/api";
import { toast } from "sonner";
import {
  Loader2,
  Play,
  Plus,
  MessageCircle,
  CreditCard,
  Wallet,
  Settings,
  TestTube,
  Zap,
  Check,
  X,
  AlertCircle,
  Info,
} from "lucide-react";

interface TestResult {
  id: string;
  type: string;
  status: "running" | "success" | "error";
  message: string;
  timestamp: Date;
  details?: any;
}

export function TestToolsPanel() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  
  // Data lists
  const [merchants, setMerchants] = useState<{id: string, name: string}[]>([]);
  const [traders, setTraders] = useState<{id: string, email: string, name?: string}[]>([]);
  
  // Deal creation settings
  const [dealCount, setDealCount] = useState(5);
  const [dealAmount, setDealAmount] = useState({ min: 1000, max: 10000 });
  const [selectedMerchant, setSelectedMerchant] = useState("random");
  const [selectedTrader, setSelectedTrader] = useState("");
  
  // Payout creation settings
  const [payoutCount, setPayoutCount] = useState(5);
  const [payoutAmount, setPayoutAmount] = useState({ min: 500, max: 5000 });
  const [selectedPayoutMerchant, setSelectedPayoutMerchant] = useState("random");
  
  // Message creation settings
  const [messageCount, setMessageCount] = useState(10);
  const [messageType, setMessageType] = useState("notification");
  const [messageContent, setMessageContent] = useState("");
  
  // Advanced settings
  const [useRandomData, setUseRandomData] = useState(true);
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [simulateErrors, setSimulateErrors] = useState(false);

  // Load merchants and traders on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [merchantsResponse, tradersResponse] = await Promise.all([
          adminApi.getTestMerchants(),
          adminApi.getTestTraders()
        ]);
        setMerchants(merchantsResponse.merchants || []);
        setTraders(tradersResponse.traders || []);
      } catch (error) {
        console.error("Failed to load merchants/traders:", error);
      }
    };
    loadData();
  }, []);

  const addResult = (type: string, status: "running" | "success" | "error", message: string, details?: any) => {
    const result: TestResult = {
      id: Date.now().toString(),
      type,
      status,
      message,
      timestamp: new Date(),
      details,
    };
    setResults(prev => [result, ...prev]);
    return result.id;
  };

  const updateResult = (id: string, status: "success" | "error", message: string, details?: any) => {
    setResults(prev => prev.map(r => 
      r.id === id ? { ...r, status, message, details } : r
    ));
  };

  const createRandomDeals = async () => {
    if (dealCount < 1 || dealCount > 50) {
      toast.error("Количество сделок должно быть от 1 до 50");
      return;
    }

    setLoading(true);
    const resultId = addResult("deals", "running", `Создание ${dealCount} случайных сделок...`);

    try {
      const response = await adminApi.createRandomDeals({
        count: dealCount,
        minAmount: dealAmount.min,
        maxAmount: dealAmount.max,
        merchantId: selectedMerchant === "random" ? undefined : selectedMerchant,
        traderId: selectedTrader || undefined,
        useRandomData,
        autoConfirm,
        simulateErrors,
      });

      if (response.success) {
        updateResult(resultId, "success", `Создано ${response.created} сделок`, response.details);
        toast.success(`Создано ${response.created} сделок`);
      } else {
        updateResult(resultId, "error", response.error || "Ошибка создания сделок");
        toast.error(response.error || "Ошибка создания сделок");
      }
    } catch (error: any) {
      updateResult(resultId, "error", error.message || "Ошибка при создании сделок");
      toast.error("Ошибка при создании сделок");
    } finally {
      setLoading(false);
    }
  };

  const createRandomPayouts = async () => {
    if (payoutCount < 1 || payoutCount > 50) {
      toast.error("Количество выплат должно быть от 1 до 50");
      return;
    }

    setLoading(true);
    const resultId = addResult("payouts", "running", `Создание ${payoutCount} случайных выплат...`);

    try {
      const response = await adminApi.createRandomPayouts({
        count: payoutCount,
        minAmount: payoutAmount.min,
        maxAmount: payoutAmount.max,
        merchantId: selectedPayoutMerchant === "random" ? undefined : selectedPayoutMerchant,
        useRandomData,
        autoConfirm,
        simulateErrors,
      });

      if (response.success) {
        updateResult(resultId, "success", `Создано ${response.created} выплат`, response.details);
        toast.success(`Создано ${response.created} выплат`);
      } else {
        updateResult(resultId, "error", response.error || "Ошибка создания выплат");
        toast.error(response.error || "Ошибка создания выплат");
      }
    } catch (error: any) {
      updateResult(resultId, "error", error.message || "Ошибка при создании выплат");
      toast.error("Ошибка при создании выплат");
    } finally {
      setLoading(false);
    }
  };

  const createRandomMessages = async () => {
    if (messageCount < 1 || messageCount > 100) {
      toast.error("Количество сообщений должно быть от 1 до 100");
      return;
    }

    setLoading(true);
    const resultId = addResult("messages", "running", `Создание ${messageCount} случайных сообщений...`);

    try {
      const response = await adminApi.createRandomMessages({
        count: messageCount,
        type: messageType,
        content: messageContent || undefined,
        useRandomData,
        simulateErrors,
      });

      if (response.success) {
        updateResult(resultId, "success", `Создано ${response.created} сообщений`, response.details);
        toast.success(`Создано ${response.created} сообщений`);
      } else {
        updateResult(resultId, "error", response.error || "Ошибка создания сообщений");
        toast.error(response.error || "Ошибка создания сообщений");
      }
    } catch (error: any) {
      updateResult(resultId, "error", error.message || "Ошибка при создании сообщений");
      toast.error("Ошибка при создании сообщений");
    } finally {
      setLoading(false);
    }
  };

  const runFullTest = async () => {
    setLoading(true);
    const resultId = addResult("full-test", "running", "Запуск полного теста системы...");

    try {
      const response = await adminApi.runFullSystemTest({
        dealCount: 10,
        payoutCount: 5,
        messageCount: 20,
        useRandomData: true,
        simulateErrors: false,
      });

      if (response.success) {
        updateResult(resultId, "success", "Полный тест выполнен успешно", response.details);
        toast.success("Полный тест выполнен успешно");
      } else {
        updateResult(resultId, "error", response.error || "Ошибка выполнения теста");
        toast.error(response.error || "Ошибка выполнения теста");
      }
    } catch (error: any) {
      updateResult(resultId, "error", error.message || "Ошибка при выполнении теста");
      toast.error("Ошибка при выполнении теста");
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
    toast.success("Результаты очищены");
  };

  const getStatusIcon = (status: "running" | "success" | "error") => {
    switch (status) {
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "success":
        return <Check className="h-4 w-4 text-green-500" />;
      case "error":
        return <X className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: "running" | "success" | "error") => {
    switch (status) {
      case "running":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Выполняется</Badge>;
      case "success":
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Успешно</Badge>;
      case "error":
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Ошибка</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Инструменты тестирования</h1>
          <p className="text-muted-foreground mt-2">
            Создание тестовых данных и проверка работы системы
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runFullTest} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
            <TestTube className="h-4 w-4 mr-2" />
            Полный тест
          </Button>
          <Button onClick={clearResults} variant="outline" disabled={loading}>
            <X className="h-4 w-4 mr-2" />
            Очистить результаты
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deal Creation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Создание сделок
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deal-count">Количество</Label>
                <Select value={dealCount.toString()} onValueChange={(v) => setDealCount(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 сделок</SelectItem>
                    <SelectItem value="10">10 сделок</SelectItem>
                    <SelectItem value="20">20 сделок</SelectItem>
                    <SelectItem value="50">50 сделок</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Сумма (RUB)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="От"
                    value={dealAmount.min}
                    onChange={(e) => setDealAmount(prev => ({ ...prev, min: parseInt(e.target.value) }))}
                  />
                  <Input
                    type="number"
                    placeholder="До"
                    value={dealAmount.max}
                    onChange={(e) => setDealAmount(prev => ({ ...prev, max: parseInt(e.target.value) }))}
                  />
                </div>
              </div>
            </div>
            <div>
              <Label>Мерчант</Label>
              <Select value={selectedMerchant} onValueChange={setSelectedMerchant}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите мерчанта (или случайный)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="random">Случайный мерчант</SelectItem>
                  {merchants.map((merchant) => (
                    <SelectItem key={merchant.id} value={merchant.id}>
                      {merchant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={createRandomDeals} disabled={loading} className="w-full">
              <Play className="h-4 w-4 mr-2" />
              Создать сделки
            </Button>
          </CardContent>
        </Card>

        {/* Payout Creation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Создание выплат
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payout-count">Количество</Label>
                <Select value={payoutCount.toString()} onValueChange={(v) => setPayoutCount(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 выплат</SelectItem>
                    <SelectItem value="10">10 выплат</SelectItem>
                    <SelectItem value="20">20 выплат</SelectItem>
                    <SelectItem value="50">50 выплат</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Сумма (RUB)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="От"
                    value={payoutAmount.min}
                    onChange={(e) => setPayoutAmount(prev => ({ ...prev, min: parseInt(e.target.value) }))}
                  />
                  <Input
                    type="number"
                    placeholder="До"
                    value={payoutAmount.max}
                    onChange={(e) => setPayoutAmount(prev => ({ ...prev, max: parseInt(e.target.value) }))}
                  />
                </div>
              </div>
            </div>
            <div>
              <Label>Мерчант</Label>
              <Select value={selectedPayoutMerchant} onValueChange={setSelectedPayoutMerchant}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите мерчанта (или случайный)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="random">Случайный мерчант</SelectItem>
                  {merchants.map((merchant) => (
                    <SelectItem key={merchant.id} value={merchant.id}>
                      {merchant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={createRandomPayouts} disabled={loading} className="w-full">
              <Play className="h-4 w-4 mr-2" />
              Создать выплаты
            </Button>
          </CardContent>
        </Card>

        {/* Message Creation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Создание сообщений
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="message-count">Количество</Label>
                <Select value={messageCount.toString()} onValueChange={(v) => setMessageCount(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 сообщений</SelectItem>
                    <SelectItem value="20">20 сообщений</SelectItem>
                    <SelectItem value="50">50 сообщений</SelectItem>
                    <SelectItem value="100">100 сообщений</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Тип</Label>
                <Select value={messageType} onValueChange={setMessageType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="notification">Уведомление</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="system">Системное</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="message-content">Содержание (опционально)</Label>
              <Textarea
                id="message-content"
                placeholder="Оставьте пустым для случайного содержания"
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
              />
            </div>
            <Button onClick={createRandomMessages} disabled={loading} className="w-full">
              <Play className="h-4 w-4 mr-2" />
              Создать сообщения
            </Button>
          </CardContent>
        </Card>

        {/* Advanced Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Дополнительные настройки
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="use-random-data">Случайные данные</Label>
                <p className="text-sm text-muted-foreground">
                  Использовать случайные значения для всех полей
                </p>
              </div>
              <Switch
                id="use-random-data"
                checked={useRandomData}
                onCheckedChange={setUseRandomData}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-confirm">Авто-подтверждение</Label>
                <p className="text-sm text-muted-foreground">
                  Автоматически подтверждать созданные записи
                </p>
              </div>
              <Switch
                id="auto-confirm"
                checked={autoConfirm}
                onCheckedChange={setAutoConfirm}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="simulate-errors">Симуляция ошибок</Label>
                <p className="text-sm text-muted-foreground">
                  Случайно генерировать ошибки для тестирования
                </p>
              </div>
              <Switch
                id="simulate-errors"
                checked={simulateErrors}
                onCheckedChange={setSimulateErrors}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Результаты выполнения
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {results.map((result) => (
                <div key={result.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(result.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{result.type}</span>
                      {getStatusBadge(result.status)}
                      <span className="text-xs text-muted-foreground">
                        {result.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                    {result.details && (
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer text-primary">
                          Детали
                        </summary>
                        <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}