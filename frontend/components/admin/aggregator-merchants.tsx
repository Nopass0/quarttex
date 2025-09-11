"use client";

import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAdminAuth } from "@/stores/auth";
import { formatAmount } from "@/lib/utils";
import {
  Plus,
  Edit,
  Trash2,
  Power,
  TrendingUp,
  Settings,
  DollarSign,
  Activity,
} from "lucide-react";

interface AggregatorMerchant {
  id: string;
  aggregatorId: string;
  merchantId: string;
  methodId: string;
  feeIn: number;
  feeOut: number;
  isFeeInEnabled: boolean;
  isFeeOutEnabled: boolean;
  isTrafficEnabled: boolean;
  rateSource: string | null;
  useFlexibleRates: boolean;
  createdAt: string;
  updatedAt: string;
  merchant?: {
    id: string;
    name: string;
    disabled: boolean;
    banned: boolean;
  };
  method?: {
    id: string;
    code: string;
    name: string;
    type: string;
  };
  feeRanges: Array<{
    id: string;
    minAmount: number;
    maxAmount: number;
    feeInPercent: number;
    feeOutPercent: number;
    isActive: boolean;
  }>;
  stats?: {
    count: number;
    profit: number;
  };
}

interface Merchant {
  id: string;
  name: string;
  disabled: boolean;
  banned: boolean;
}

interface Method {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface AggregatorMerchantsProps {
  aggregatorId: string;
}

export default function AggregatorMerchants({ aggregatorId }: AggregatorMerchantsProps) {
  const adminToken = useAdminAuth((state) => state.token);
  const [merchants, setMerchants] = useState<AggregatorMerchant[]>([]);
  const [availableMerchants, setAvailableMerchants] = useState<Merchant[]>([]);
  const [availableMethods, setAvailableMethods] = useState<Method[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<AggregatorMerchant | null>(null);
  
  // Форма для добавления/редактирования
  const [formData, setFormData] = useState({
    merchantId: "",
    methodId: "",
    feeIn: 0,
    feeOut: 0,
    isFeeInEnabled: true,
    isFeeOutEnabled: true,
    isTrafficEnabled: true,
    rateSource: null as string | null,
    useFlexibleRates: false,
  });

  useEffect(() => {
    fetchMerchants();
    fetchAvailableData();
  }, [aggregatorId]);

  const fetchMerchants = async () => {
    if (!adminToken) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators-v2/${aggregatorId}/merchants`,
        {
          headers: { "x-admin-key": adminToken },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch merchants");
      }

      const data = await response.json();
      setMerchants(data.merchants || []);
    } catch (error) {
      console.error("Error fetching merchants:", error);
      toast.error("Ошибка загрузки мерчантов");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableData = async () => {
    if (!adminToken) return;

    try {
      // Получаем список всех мерчантов
      const merchantsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/merchants`,
        {
          headers: { "x-admin-key": adminToken },
        }
      );

      if (merchantsRes.ok) {
        const merchantsData = await merchantsRes.json();
        setAvailableMerchants(merchantsData.merchants || []);
      }

      // Получаем список всех методов
      const methodsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/methods`,
        {
          headers: { "x-admin-key": adminToken },
        }
      );

      if (methodsRes.ok) {
        const methodsData = await methodsRes.json();
        setAvailableMethods(methodsData || []);
      }
    } catch (error) {
      console.error("Error fetching available data:", error);
    }
  };

  const handleAddMerchant = async () => {
    if (!adminToken || !formData.merchantId || !formData.methodId) {
      toast.error("Заполните все обязательные поля");
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators-v2/${aggregatorId}/merchants`,
        {
          method: "POST",
          headers: {
            "x-admin-key": adminToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add merchant");
      }

      toast.success("Мерчант успешно добавлен");
      setIsAddModalOpen(false);
      fetchMerchants();
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Ошибка добавления мерчанта");
    }
  };

  const handleUpdateMerchant = async () => {
    if (!adminToken || !selectedMerchant) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators-v2/${aggregatorId}/merchants/${selectedMerchant.merchantId}/${selectedMerchant.methodId}`,
        {
          method: "PUT",
          headers: {
            "x-admin-key": adminToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update merchant");
      }

      toast.success("Настройки мерчанта обновлены");
      setIsEditModalOpen(false);
      fetchMerchants();
      resetForm();
    } catch (error) {
      toast.error("Ошибка обновления настроек");
    }
  };

  const handleDeleteMerchant = async (merchant: AggregatorMerchant) => {
    if (!adminToken) return;

    if (!confirm(`Удалить связь с мерчантом ${merchant.merchant?.name}?`)) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators-v2/${aggregatorId}/merchants/${merchant.merchantId}/${merchant.methodId}`,
        {
          method: "DELETE",
          headers: { "x-admin-key": adminToken },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete merchant");
      }

      toast.success("Связь с мерчантом удалена");
      fetchMerchants();
    } catch (error) {
      toast.error("Ошибка удаления связи");
    }
  };

  const handleToggleTraffic = async (merchant: AggregatorMerchant) => {
    if (!adminToken) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators-v2/${aggregatorId}/merchants/${merchant.merchantId}/${merchant.methodId}`,
        {
          method: "PUT",
          headers: {
            "x-admin-key": adminToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isTrafficEnabled: !merchant.isTrafficEnabled,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to toggle traffic");
      }

      toast.success(
        merchant.isTrafficEnabled
          ? "Трафик на мерчанта отключен"
          : "Трафик на мерчанта включен"
      );
      fetchMerchants();
    } catch (error) {
      toast.error("Ошибка изменения статуса трафика");
    }
  };

  const openEditModal = (merchant: AggregatorMerchant) => {
    setSelectedMerchant(merchant);
    setFormData({
      merchantId: merchant.merchantId,
      methodId: merchant.methodId,
      feeIn: merchant.feeIn,
      feeOut: merchant.feeOut,
      isFeeInEnabled: merchant.isFeeInEnabled,
      isFeeOutEnabled: merchant.isFeeOutEnabled,
      isTrafficEnabled: merchant.isTrafficEnabled,
      rateSource: merchant.rateSource,
      useFlexibleRates: merchant.useFlexibleRates,
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      merchantId: "",
      methodId: "",
      feeIn: 0,
      feeOut: 0,
      isFeeInEnabled: true,
      isFeeOutEnabled: true,
      isTrafficEnabled: true,
      rateSource: null,
      useFlexibleRates: false,
    });
    setSelectedMerchant(null);
  };

  const totalStats = merchants.reduce(
    (acc, m) => ({
      count: acc.count + (m.stats?.count || 0),
      profit: acc.profit + (m.stats?.profit || 0),
    }),
    { count: 0, profit: 0 }
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Мерчанты агрегатора
              </CardTitle>
              <CardDescription>
                Управление мерчантами и их ставками
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить мерчанта
            </Button>
          </div>
        </CardHeader>
        <CardContent>

          {/* Таблица мерчантов */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Мерчант</TableHead>
                <TableHead>Метод</TableHead>
                <TableHead>Ставка IN</TableHead>
                <TableHead>Ставка OUT</TableHead>
                <TableHead>Трафик</TableHead>
                <TableHead>Транзакций</TableHead>
                <TableHead>Прибыль</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {merchants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Нет подключенных мерчантов
                  </TableCell>
                </TableRow>
              ) : (
                merchants.map((merchant) => (
                  <TableRow key={merchant.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{merchant.merchant?.name}</span>
                        {merchant.merchant?.disabled && (
                          <Badge variant="outline" className="text-xs">
                            Отключен
                          </Badge>
                        )}
                        {merchant.merchant?.banned && (
                          <Badge variant="destructive" className="text-xs">
                            Забанен
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {merchant.method?.name || merchant.method?.code}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={merchant.isFeeInEnabled ? "" : "text-muted-foreground line-through"}>
                          {merchant.useFlexibleRates ? "Гибкие" : `${merchant.feeIn}%`}
                        </span>
                        {!merchant.isFeeInEnabled && (
                          <Badge variant="outline" className="text-xs">
                            Выкл
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={merchant.isFeeOutEnabled ? "" : "text-muted-foreground line-through"}>
                          {merchant.useFlexibleRates ? "Гибкие" : `${merchant.feeOut}%`}
                        </span>
                        {!merchant.isFeeOutEnabled && (
                          <Badge variant="outline" className="text-xs">
                            Выкл
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant={merchant.isTrafficEnabled ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleToggleTraffic(merchant)}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell>{merchant.stats?.count || 0}</TableCell>
                    <TableCell>
                      {formatAmount(merchant.stats?.profit || 0)} USDT
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(merchant)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMerchant(merchant)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Модальное окно добавления мерчанта */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить мерчанта</DialogTitle>
            <DialogDescription>
              Подключите мерчанта к агрегатору и настройте ставки
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Мерчант</Label>
              <Select
                value={formData.merchantId}
                onValueChange={(value) => setFormData({ ...formData, merchantId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите мерчанта" />
                </SelectTrigger>
                <SelectContent>
                  {availableMerchants.map((merchant) => (
                    <SelectItem key={merchant.id} value={merchant.id}>
                      {merchant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Метод</Label>
              <Select
                value={formData.methodId}
                onValueChange={(value) => setFormData({ ...formData, methodId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите метод" />
                </SelectTrigger>
                <SelectContent>
                  {availableMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.name} ({method.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ставка IN (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.feeIn}
                  onChange={(e) => setFormData({ ...formData, feeIn: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Ставка OUT (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.feeOut}
                  onChange={(e) => setFormData({ ...formData, feeOut: parseFloat(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Использовать гибкие ставки</Label>
              <Switch
                checked={formData.useFlexibleRates}
                onCheckedChange={(checked) => setFormData({ ...formData, useFlexibleRates: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Включить трафик</Label>
              <Switch
                checked={formData.isTrafficEnabled}
                onCheckedChange={(checked) => setFormData({ ...formData, isTrafficEnabled: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleAddMerchant}>Добавить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Модальное окно редактирования мерчанта */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Настройки мерчанта</DialogTitle>
            <DialogDescription>
              Измените ставки и параметры мерчанта
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ставка IN (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.feeIn}
                  onChange={(e) => setFormData({ ...formData, feeIn: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Ставка OUT (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.feeOut}
                  onChange={(e) => setFormData({ ...formData, feeOut: parseFloat(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Включить вход (IN)</Label>
                <Switch
                  checked={formData.isFeeInEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, isFeeInEnabled: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Включить выход (OUT)</Label>
                <Switch
                  checked={formData.isFeeOutEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, isFeeOutEnabled: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Использовать гибкие ставки</Label>
                <Switch
                  checked={formData.useFlexibleRates}
                  onCheckedChange={(checked) => setFormData({ ...formData, useFlexibleRates: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Включить трафик</Label>
                <Switch
                  checked={formData.isTrafficEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, isTrafficEnabled: checked })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleUpdateMerchant}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}