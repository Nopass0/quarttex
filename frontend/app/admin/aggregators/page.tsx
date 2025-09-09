"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AuthLayout } from "@/components/layouts/auth-layout";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAdminAuth } from "@/stores/auth";
import { formatAmount, formatDateTime } from "@/lib/utils";
import {
  Globe,
  Search,
  Loader2,
  Eye,
  Plus,
  Key,
  DollarSign,
  Shield,
  RefreshCw,
  Settings,
  Ban,
  CheckCircle,
  Copy,
  Clock,
  AlertCircle,
  User,
} from "lucide-react";
import Link from "next/link";

interface Aggregator {
  id: string;
  email: string;
  name: string;
  apiToken: string;
  customApiToken?: string | null;
  apiBaseUrl?: string;
  balanceUsdt: number;
  isActive: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    transactions: number;
  };
}

interface CreateAggregatorData {
  email: string;
  name: string;
  apiBaseUrl?: string;
  isPSPWare?: boolean;
  pspwareApiKey?: string;
  enableRandomization?: boolean;
  randomizationType?: 'FULL' | 'PARTIAL' | 'NONE';
  isChaseProject?: boolean;
}

export default function AdminAggregatorsPage() {
  const adminToken = useAdminAuth((state) => state.token);
  const [aggregators, setAggregators] = useState<Aggregator[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newAggregator, setNewAggregator] = useState<CreateAggregatorData>({
    email: "",
    name: "",
    apiBaseUrl: "",
    isPSPWare: false,
    pspwareApiKey: "",
    enableRandomization: false,
    randomizationType: "NONE",
    isChaseProject: false,
  });
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [createdAggregatorName, setCreatedAggregatorName] = useState("");

  useEffect(() => {
    fetchAggregators();
  }, []);

  const fetchAggregators = async () => {
    if (!adminToken) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators`,
        {
          headers: {
            "x-admin-key": adminToken,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch aggregators");
      }

      const data = await response.json();
      setAggregators(data.data || []);
    } catch (error) {
      console.error("Error fetching aggregators:", error);
      toast.error("Ошибка при загрузке агрегаторов");
    } finally {
      setIsLoading(false);
    }
  };

  const createAggregator = async () => {
    if (!adminToken || !newAggregator.email || !newAggregator.name) {
      toast.error("Заполните обязательные поля");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminToken,
          },
          body: JSON.stringify(newAggregator),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create aggregator");
      }

      const data = await response.json();
      
      // Показываем модальное окно с паролем
      setGeneratedPassword(data.generatedPassword || data.password || "");
      setCreatedAggregatorName(newAggregator.name);
      setPasswordModalOpen(true);
      
      setCreateModalOpen(false);
      setNewAggregator({ 
        email: "", 
        name: "", 
        apiBaseUrl: "",
        isPSPWare: false,
        pspwareApiKey: "",
        enableRandomization: false,
        randomizationType: "NONE"
      });
      fetchAggregators();
    } catch (error) {
      console.error("Error creating aggregator:", error);
      toast.error("Ошибка при создании агрегатора");
    } finally {
      setIsCreating(false);
    }
  };

  const toggleAggregatorStatus = async (
    aggregatorId: string,
    isActive: boolean
  ) => {
    if (!adminToken) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators/${aggregatorId}/toggle`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminToken,
          },
          body: JSON.stringify({ isActive }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to toggle aggregator status");
      }

      toast.success(
        isActive ? "Агрегатор активирован" : "Агрегатор деактивирован"
      );
      fetchAggregators();
    } catch (error) {
      console.error("Error toggling aggregator status:", error);
      toast.error("Ошибка при изменении статуса агрегатора");
    }
  };

  const regenerateApiToken = async (aggregatorId: string) => {
    if (!adminToken) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators/${aggregatorId}/regenerate-token`,
        {
          method: "POST",
          headers: {
            "x-admin-key": adminToken,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to regenerate API token");
      }

      const data = await response.json();
      toast.success("API токен перегенерирован");
      fetchAggregators();
    } catch (error) {
      console.error("Error regenerating API token:", error);
      toast.error("Ошибка при перегенерации токена");
    }
  };

  const resetPassword = async (aggregatorId: string, aggregatorName: string) => {
    if (!adminToken) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators/${aggregatorId}/reset-password`,
        {
          method: "POST",
          headers: {
            "x-admin-key": adminToken,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to reset password");
      }

      const data = await response.json();
      
      // Показываем модальное окно с новым паролем
      setGeneratedPassword(data.newPassword);
      setCreatedAggregatorName(aggregatorName);
      setPasswordModalOpen(true);
      
      toast.success("Пароль успешно сброшен");
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("Ошибка при сбросе пароля");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Скопировано в буфер обмена");
  };

  const filteredAggregators = aggregators.filter((aggregator) => {
    const matchesSearch =
      aggregator.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      aggregator.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && aggregator.isActive) ||
      (statusFilter === "inactive" && !aggregator.isActive);

    return matchesSearch && matchesStatus;
  });

  return (
    <ProtectedRoute requiredRole="admin">
      <AuthLayout variant="admin">
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Globe className="h-8 w-8" />
                Агрегаторы
              </h1>
              <p className="text-muted-foreground">
                Управление внешними агрегаторами платежей
              </p>
            </div>
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Создать агрегатора
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Создать нового агрегатора</DialogTitle>
                  <DialogDescription>
                    Введите данные для создания нового агрегатора. Пароль будет
                    сгенерирован автоматически.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="aggregator@example.com"
                      value={newAggregator.email}
                      onChange={(e) =>
                        setNewAggregator({
                          ...newAggregator,
                          email: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Название *</Label>
                    <Input
                      id="name"
                      placeholder="Название агрегатора"
                      value={newAggregator.name}
                      onChange={(e) =>
                        setNewAggregator({
                          ...newAggregator,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="apiBaseUrl">Базовый URL API</Label>
                    <Input
                      id="apiBaseUrl"
                      placeholder="https://api.aggregator.com"
                      value={newAggregator.apiBaseUrl}
                      onChange={(e) =>
                        setNewAggregator({
                          ...newAggregator,
                          apiBaseUrl: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isChaseProject"
                        checked={newAggregator.isChaseProject}
                        onCheckedChange={(checked) =>
                          setNewAggregator({
                            ...newAggregator,
                            isChaseProject: checked as boolean,
                            isPSPWare: checked ? false : newAggregator.isPSPWare,
                          })
                        }
                      />
                      <Label htmlFor="isChaseProject" className="cursor-pointer">
                        Это другой экземпляр Chase
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isPSPWare"
                        checked={newAggregator.isPSPWare}
                        disabled={newAggregator.isChaseProject}
                        onCheckedChange={(checked) =>
                          setNewAggregator({
                            ...newAggregator,
                            isPSPWare: checked as boolean,
                            isChaseProject: checked ? false : newAggregator.isChaseProject,
                          })
                        }
                      />
                      <Label htmlFor="isPSPWare" className="cursor-pointer text-gray-600">
                        Использует PSPWare API схему
                      </Label>
                    </div>
                    {newAggregator.isPSPWare && (
                      <>
                        <div>
                          <Label htmlFor="pspwareApiKey">PSPWare API ключ</Label>
                          <Input
                            id="pspwareApiKey"
                            placeholder="Введите API ключ PSPWare"
                            value={newAggregator.pspwareApiKey}
                            onChange={(e) =>
                              setNewAggregator({
                                ...newAggregator,
                                pspwareApiKey: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="enableRandomization"
                            checked={newAggregator.enableRandomization}
                            onCheckedChange={(checked) =>
                              setNewAggregator({
                                ...newAggregator,
                                enableRandomization: checked as boolean,
                              })
                            }
                          />
                          <Label htmlFor="enableRandomization" className="cursor-pointer">
                            Включить рандомизацию сумм
                          </Label>
                        </div>
                        {newAggregator.enableRandomization && (
                          <div>
                            <Label htmlFor="randomizationType">Тип рандомизации</Label>
                            <Select
                              value={newAggregator.randomizationType}
                              onValueChange={(value) =>
                                setNewAggregator({
                                  ...newAggregator,
                                  randomizationType: value as 'FULL' | 'PARTIAL' | 'NONE',
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите тип" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="FULL">Полная (±2 рубля для всех сумм)</SelectItem>
                                <SelectItem value="PARTIAL">Частичная (±2 для кратных 500)</SelectItem>
                                <SelectItem value="NONE">Без рандомизации</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCreateModalOpen(false)}
                  >
                    Отмена
                  </Button>
                  <Button onClick={createAggregator} disabled={isCreating}>
                    {isCreating && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Создать
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            {/* Модальное окно с паролем */}
            <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Новый пароль для агрегатора</DialogTitle>
                  <DialogDescription>
                    Сохраните новый пароль для агрегатора <strong>{createdAggregatorName}</strong>. 
                    Этот пароль показывается только один раз и не может быть восстановлен.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="grid flex-1 gap-2">
                      <Label htmlFor="password">Пароль</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="password"
                          value={generatedPassword}
                          readOnly
                          className="font-mono"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            copyToClipboard(generatedPassword);
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-semibold">Важно!</p>
                        <p>Обязательно сохраните этот пароль в безопасном месте. 
                        После закрытия этого окна пароль больше не будет доступен.</p>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      setPasswordModalOpen(false);
                      setGeneratedPassword("");
                      setCreatedAggregatorName("");
                    }}
                  >
                    Я сохранил пароль
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Фильтры</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Поиск</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Поиск по email или названию..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="w-48">
                  <Label htmlFor="status">Статус</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Все статусы" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все статусы</SelectItem>
                      <SelectItem value="active">Активные</SelectItem>
                      <SelectItem value="inactive">Неактивные</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={fetchAggregators}
                    disabled={isLoading}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Обновить
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Агрегаторы ({filteredAggregators.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Агрегатор</TableHead>
                      <TableHead>API Token</TableHead>
                      <TableHead>Баланс USDT</TableHead>
                      <TableHead>Сделки</TableHead>
                      <TableHead>2FA</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Создан</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAggregators.map((aggregator) => (
                      <TableRow key={aggregator.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{aggregator.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {aggregator.email}
                            </div>
                            {aggregator.apiBaseUrl && (
                              <div className="text-xs text-muted-foreground">
                                {aggregator.apiBaseUrl}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {aggregator.apiToken.substring(0, 8)}...
                            </code>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                copyToClipboard(aggregator.apiToken)
                              }
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => regenerateApiToken(aggregator.id)}
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            {formatAmount(aggregator.balanceUsdt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {aggregator._count?.transactions || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {aggregator.twoFactorEnabled ? (
                            <Badge
                              variant="default"
                              className="bg-green-100 text-green-800"
                            >
                              <Shield className="h-3 w-3 mr-1" />
                              Включена
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Выключена
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={aggregator.isActive}
                              onCheckedChange={(checked) =>
                                toggleAggregatorStatus(aggregator.id, checked)
                              }
                            />
                            {aggregator.isActive ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Активен
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <Ban className="h-3 w-3 mr-1" />
                                Неактивен
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDateTime(aggregator.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link href={`/admin/aggregators/${aggregator.id}`}>
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4 mr-1" />
                                Детали
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resetPassword(aggregator.id, aggregator.name)}
                            >
                              <Key className="h-4 w-4 mr-1" />
                              Сбросить пароль
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredAggregators.length === 0 && !isLoading && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Globe className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">
                              {searchQuery || statusFilter !== "all"
                                ? "Агрегаторы не найдены"
                                : "Нет созданных агрегаторов"}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </AuthLayout>
    </ProtectedRoute>
  );
}
