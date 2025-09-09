"use client";

import { useState, useEffect, useRef } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, RefreshCw, Settings } from "lucide-react";
import { useAdminAuth } from "@/stores/auth";
import { formatAmount } from "@/lib/utils";
import { toast } from "sonner";
import { FeeRangesDialog } from "./fee-ranges-dialog";

type MerchantTrader = {
  id: string;
  traderId: string;
  traderName: string;
  traderEmail: string;
  method: string;
  methodCode: string;
  feeIn: number;
  feeOut: number;
  isFeeInEnabled: boolean;
  isFeeOutEnabled: boolean;
  isMerchantEnabled: boolean;
  useFlexibleRates: boolean;
  feeRangesCount: number;
  profitIn: number;
  profitOut: number;
};

type AvailableTrader = {
  id: string;
  name: string;
  methods: Array<{
    id: string;
    code: string;
    name: string;
    type: string;
  }>;
};

type Statistics = {
  totalIn: number;
  totalOut: number;
  profitIn: number;
  profitOut: number;
};

interface MerchantTradersTableProps {
  merchantId: string;
}

export function MerchantTradersTable({ merchantId }: MerchantTradersTableProps) {
  const { token: adminToken } = useAdminAuth();
  const [traders, setTraders] = useState<MerchantTrader[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [availableTraders, setAvailableTraders] = useState<
    AvailableTrader[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedTrader, setSelectedTrader] = useState<string>("");
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [feeIn, setFeeIn] = useState<string>("0");
  const [feeOut, setFeeOut] = useState<string>("0");
  const [updatingFields, setUpdatingFields] = useState<Set<string>>(new Set());
  const [localValues, setLocalValues] = useState<{ [key: string]: string }>({});
  const [feeRangesDialogOpen, setFeeRangesDialogOpen] = useState<string | null>(
    null
  );
  const debounceTimers = useRef<{ [key: string]: NodeJS.Timeout }>({});

  useEffect(() => {
    if (!merchantId || !adminToken) {
      console.warn("Missing merchantId or adminToken:", { merchantId, adminToken });
      return;
    }
    fetchTraders();
    fetchAvailableTraders();
  }, [merchantId, adminToken]);

  const fetchTraders = async () => {
    try {
      setIsLoading(true);
      const url = `${process.env.NEXT_PUBLIC_API_URL}/admin/merchants/${merchantId}/traders`;
      console.log("Fetching traders from:", url);

      const response = await fetch(url, {
        headers: {
          "x-admin-key": adminToken || "",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch traders:", response.status, errorText);
        throw new Error(`Failed to fetch traders: ${response.status}`);
      }

      const data = await response.json();
      console.log("Traders data:", data);
      setTraders(data.traders || []);
      setStatistics(data.statistics || null);
    } catch (error) {
      console.error("Error fetching traders:", error);
      toast.error("Не удалось загрузить список трейдеров");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableTraders = async () => {
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/admin/merchants/${merchantId}/available-traders`;
      console.log("Fetching available traders from:", url);

      const response = await fetch(url, {
        headers: {
          "x-admin-key": adminToken || "",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "Failed to fetch available traders:",
          response.status,
          errorText
        );
        throw new Error(
          `Failed to fetch available traders: ${response.status}`
        );
      }

      const data = await response.json();
      console.log("Available traders data:", data);

      if (Array.isArray(data)) {
        setAvailableTraders(data);
        if (data.length === 0) {
          toast.info("Нет доступных трейдеров для добавления");
        }
      } else {
        console.error("Unexpected response format:", data);
        setAvailableTraders([]);
      }
    } catch (error) {
      console.error("Error fetching available traders:", error);
      toast.error("Не удалось загрузить доступных трейдеров");
    }
  };

  const handleNumberInputChange = (
    id: string,
    field: string,
    value: string
  ) => {
    const key = `${id}-${field}`;

    // Update local state immediately for responsive UI
    setLocalValues((prev) => ({ ...prev, [key]: value }));

    // Clear existing timer
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }

    // Set new timer for API call
    debounceTimers.current[key] = setTimeout(() => {
      const numericValue = parseFloat(value) || 0;
      handleUpdateField(id, field, numericValue);
    }, 1000);
  };

  const handleUpdateField = async (
    id: string,
    field: string,
    value: number | boolean
  ) => {
    // Clear any existing timer for this field
    const timerKey = `${id}-${field}`;
    if (debounceTimers.current[timerKey]) {
      clearTimeout(debounceTimers.current[timerKey]);
    }

    setUpdatingFields((prev) => new Set(prev).add(timerKey));

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/trader-merchant/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminToken || "",
          },
          body: JSON.stringify({ [field]: value }),
        }
      );

      if (!response.ok) throw new Error("Failed to update");

      // Update traders state
      setTraders((prev) =>
        prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
      );

      // Clear local value after successful update
      const localKey = `${id}-${field}`;
      setLocalValues((prev) => {
        const newValues = { ...prev };
        delete newValues[localKey];
        return newValues;
      });

      toast.success("Обновлено");
    } catch (error) {
      toast.error("Не удалось обновить");
      // Revert on error
      await fetchTraders();
    } finally {
      setUpdatingFields((prev) => {
        const newSet = new Set(prev);
        newSet.delete(timerKey);
        return newSet;
      });
    }
  };

  const handleAddTrader = async () => {
    if (!selectedTrader || !selectedMethod) {
      toast.error("Выберите трейдера и метод");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/merchants/${merchantId}/traders`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminToken || "",
          },
          body: JSON.stringify({
            traderId: selectedTrader,
            methodId: selectedMethod,
            feeIn: parseFloat(feeIn) || 0,
            feeOut: parseFloat(feeOut) || 0,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add trader");
      }

      setIsAddDialogOpen(false);
      setSelectedTrader("");
      setSelectedMethod("");
      setFeeIn("0");
      setFeeOut("0");
      await fetchTraders();
      await fetchAvailableTraders();
      toast.success("Трейдер добавлен");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось добавить трейдера"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTrader = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту связь?")) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/trader-merchant/${id}`,
        {
          method: "DELETE",
          headers: {
            "x-admin-key": adminToken || "",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete");

      await fetchTraders();
      await fetchAvailableTraders();
      toast.success("Связь удалена");
    } catch (error) {
      toast.error("Не удалось удалить связь");
    }
  };

  const selectedTraderData = availableTraders.find(
    (t) => t.id === selectedTrader
  );

  if (isLoading && traders.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Трейдеры мерчанта</CardTitle>
            <CardDescription>
              Список трейдеров, привязанных к данному мерчанту
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Добавить трейдера
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Добавить трейдера</DialogTitle>
                <DialogDescription>
                  Выберите трейдера и метод для добавления к мерчанту
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="trader" className="text-right">
                    Трейдер
                  </Label>
                  <Select
                    value={selectedTrader}
                    onValueChange={setSelectedTrader}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Выберите трейдера" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTraders.map((trader) => (
                        <SelectItem key={trader.id} value={trader.id}>
                          {trader.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedTrader && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="method" className="text-right">
                      Метод
                    </Label>
                    <Select
                      value={selectedMethod}
                      onValueChange={setSelectedMethod}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Выберите метод" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedTraderData?.methods.map((method) => (
                          <SelectItem key={method.id} value={method.id}>
                            {method.name} ({method.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="feeIn" className="text-right">
                    Комиссия вход (%)
                  </Label>
                  <Input
                    id="feeIn"
                    type="number"
                    step="0.01"
                    value={feeIn}
                    onChange={(e) => setFeeIn(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="feeOut" className="text-right">
                    Комиссия выход (%)
                  </Label>
                  <Input
                    id="feeOut"
                    type="number"
                    step="0.01"
                    value={feeOut}
                    onChange={(e) => setFeeOut(e.target.value)}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddTrader} disabled={isLoading}>
                  Добавить
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableCaption>
              Управление комиссиями и статусами мерчантов
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Трейдер</TableHead>
                <TableHead>Метод</TableHead>
                <TableHead>Комиссия вход (%)</TableHead>
                <TableHead>Комиссия выход (%)</TableHead>
                <TableHead>Вход</TableHead>
                <TableHead>Выход</TableHead>
                <TableHead>Гибкие ставки</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {traders.map((trader) => (
                <TableRow key={trader.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{trader.traderName}</div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span
                          className="font-mono cursor-pointer hover:text-gray-700"
                          onClick={() => {
                            navigator.clipboard.writeText(trader.traderId);
                            toast.success("ID скопирован");
                          }}
                          title={`Нажмите для копирования: ${trader.traderId}`}
                        >
                          {trader.traderId.slice(0, 5)}...
                        </span>
                        {trader.traderEmail && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span className="text-xs">{trader.traderEmail}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{trader.method}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={localValues[`${trader.id}-feeIn`] ?? trader.feeIn}
                      onChange={(e) =>
                        handleNumberInputChange(trader.id, "feeIn", e.target.value)
                      }
                      className="w-20"
                      disabled={updatingFields.has(`${trader.id}-feeIn`)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={localValues[`${trader.id}-feeOut`] ?? trader.feeOut}
                      onChange={(e) =>
                        handleNumberInputChange(trader.id, "feeOut", e.target.value)
                      }
                      className="w-20"
                      disabled={updatingFields.has(`${trader.id}-feeOut`)}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={trader.isFeeInEnabled}
                      onCheckedChange={(checked) =>
                        handleUpdateField(trader.id, "isFeeInEnabled", checked)
                      }
                      disabled={updatingFields.has(`${trader.id}-isFeeInEnabled`)}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={trader.isFeeOutEnabled}
                      onCheckedChange={(checked) =>
                        handleUpdateField(trader.id, "isFeeOutEnabled", checked)
                      }
                      disabled={updatingFields.has(`${trader.id}-isFeeOutEnabled`)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={trader.useFlexibleRates}
                        onCheckedChange={(checked) =>
                          handleUpdateField(
                            trader.id,
                            "useFlexibleRates",
                            checked
                          )
                        }
                        disabled={updatingFields.has(`${trader.id}-useFlexibleRates`)}
                      />
                      {trader.useFlexibleRates && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFeeRangesDialogOpen(trader.id)}
                          className="text-xs"
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          {trader.feeRangesCount > 0
                            ? `${trader.feeRangesCount} промежутков`
                            : "Настроить"}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTrader(trader.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Fee Ranges Dialog */}
        <FeeRangesDialog
          traderMerchantId={feeRangesDialogOpen}
          isOpen={!!feeRangesDialogOpen}
          onClose={() => {
            setFeeRangesDialogOpen(null);
            // Refresh traders list to update fee ranges count
            fetchTraders();
          }}
        />
      </CardContent>
    </Card>
  );
}
