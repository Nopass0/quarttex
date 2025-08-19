"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { useAdminAuth } from "@/stores/auth";
import { formatAmount } from "@/lib/utils";
import { toast } from "sonner";

type FeeRange = {
  id: string;
  minAmount: number;
  maxAmount: number;
  feeInPercent: number;
  feeOutPercent: number;
  createdAt: string;
  updatedAt: string;
};

type TraderMerchantData = {
  id: string;
  useFlexibleRates: boolean;
  defaultFeeIn: number;
  defaultFeeOut: number;
  merchant: {
    id: string;
    name: string;
  };
  method: {
    id: string;
    name: string;
    code: string;
  };
  trader: {
    id: string;
    name: string;
    email: string;
  };
  feeRanges: FeeRange[];
};

interface FeeRangesDialogProps {
  traderMerchantId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function FeeRangesDialog({
  traderMerchantId,
  isOpen,
  onClose,
}: FeeRangesDialogProps) {
  const { token: adminToken } = useAdminAuth();
  const [data, setData] = useState<TraderMerchantData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingRange, setIsAddingRange] = useState(false);
  const [newRange, setNewRange] = useState({
    minAmount: "",
    maxAmount: "",
    feeInPercent: "",
    feeOutPercent: "",
  });

  useEffect(() => {
    if (isOpen && traderMerchantId) {
      fetchFeeRanges();
    }
  }, [isOpen, traderMerchantId]);

  const fetchFeeRanges = async () => {
    if (!traderMerchantId) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/trader-merchant/${traderMerchantId}/fee-ranges`,
        {
          headers: {
            "x-admin-key": adminToken || "",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch fee ranges");

      const result = await response.json();
      setData(result);
    } catch (error) {
      toast.error("Не удалось загрузить промежутки ставок");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRange = async () => {
    if (!traderMerchantId || !newRange.minAmount || !newRange.maxAmount) {
      toast.error("Заполните все обязательные поля");
      return;
    }

    const minAmount = parseFloat(newRange.minAmount);
    const maxAmount = parseFloat(newRange.maxAmount);
    const feeInPercent = parseFloat(newRange.feeInPercent) || 0;
    const feeOutPercent = parseFloat(newRange.feeOutPercent) || 0;

    if (minAmount >= maxAmount) {
      toast.error("Минимальная сумма должна быть меньше максимальной");
      return;
    }

    try {
      setIsAddingRange(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/trader-merchant/${traderMerchantId}/fee-ranges`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminToken || "",
          },
          body: JSON.stringify({
            minAmount,
            maxAmount,
            feeInPercent,
            feeOutPercent,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add range");
      }

      setNewRange({
        minAmount: "",
        maxAmount: "",
        feeInPercent: "",
        feeOutPercent: "",
      });
      await fetchFeeRanges();
      toast.success("Промежуток добавлен");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Не удалось добавить промежуток"
      );
    } finally {
      setIsAddingRange(false);
    }
  };

  const handleDeleteRange = async (rangeId: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот промежуток?")) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/trader-merchant/fee-range/${rangeId}`,
        {
          method: "DELETE",
          headers: {
            "x-admin-key": adminToken || "",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete range");

      await fetchFeeRanges();
      toast.success("Промежуток удален");
    } catch (error) {
      toast.error("Не удалось удалить промежуток");
    }
  };

  if (!isOpen || !traderMerchantId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Настройка промежутков процентных ставок</DialogTitle>
          <DialogDescription>
            {data && (
              <>
                Трейдер: {data.trader.email} • Мерчант: {data.merchant.name} •
                Метод: {data.method.name}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Default rates info */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Базовые ставки</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Комиссия вход:</span>{" "}
                  {data.defaultFeeIn}%
                </div>
                <div>
                  <span className="text-blue-700">Комиссия выход:</span>{" "}
                  {data.defaultFeeOut}%
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                Эти ставки применяются для сумм, не попадающих в настроенные
                промежутки
              </p>
            </div>

            {/* Fee ranges table */}
            <div>
              <h4 className="font-medium mb-4">Промежутки ставок</h4>
              <Table>
                <TableCaption>
                  Настроенные промежутки процентных ставок по суммам
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Сумма от (₽)</TableHead>
                    <TableHead>Сумма до (₽)</TableHead>
                    <TableHead>Комиссия вход (%)</TableHead>
                    <TableHead>Комиссия выход (%)</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.feeRanges.map((range) => (
                    <TableRow key={range.id}>
                      <TableCell className="font-medium">
                        ₽{formatAmount(range.minAmount)}
                      </TableCell>
                      <TableCell className="font-medium">
                        ₽{formatAmount(range.maxAmount)}
                      </TableCell>
                      <TableCell>{range.feeInPercent}%</TableCell>
                      <TableCell>{range.feeOutPercent}%</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRange(range.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.feeRanges.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-gray-500 py-8"
                      >
                        Промежутки не настроены. Добавьте первый промежуток
                        ниже.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Add new range form */}
            <div className="border-t pt-6">
              <h4 className="font-medium mb-4">Добавить новый промежуток</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minAmount">Сумма от (₽)</Label>
                  <Input
                    id="minAmount"
                    type="number"
                    step="0.01"
                    placeholder="1000"
                    value={newRange.minAmount}
                    onChange={(e) =>
                      setNewRange({ ...newRange, minAmount: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxAmount">Сумма до (₽)</Label>
                  <Input
                    id="maxAmount"
                    type="number"
                    step="0.01"
                    placeholder="10000"
                    value={newRange.maxAmount}
                    onChange={(e) =>
                      setNewRange({ ...newRange, maxAmount: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feeInPercent">Комиссия вход (%)</Label>
                  <Input
                    id="feeInPercent"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="2.5"
                    value={newRange.feeInPercent}
                    onChange={(e) =>
                      setNewRange({ ...newRange, feeInPercent: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feeOutPercent">Комиссия выход (%)</Label>
                  <Input
                    id="feeOutPercent"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="1.8"
                    value={newRange.feeOutPercent}
                    onChange={(e) =>
                      setNewRange({
                        ...newRange,
                        feeOutPercent: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <Button
                onClick={handleAddRange}
                disabled={
                  isAddingRange || !newRange.minAmount || !newRange.maxAmount
                }
                className="mt-4"
              >
                {isAddingRange ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Добавление...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить промежуток
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Не удалось загрузить данные</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
