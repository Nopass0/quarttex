"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Edit2, Save, X, Percent, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Method {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
}

interface MethodFee {
  id: string;
  methodId: string;
  feePercent: number;
  method: Method;
}

interface AggregatorMethodFeesProps {
  aggregatorId: string;
}

export default function AggregatorMethodFees({ aggregatorId }: AggregatorMethodFeesProps) {
  const [methods, setMethods] = useState<Method[]>([]);
  const [methodFees, setMethodFees] = useState<MethodFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFees, setEditingFees] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);

  const fetchData = async () => {
    try {
      const adminKey = localStorage.getItem("adminKey");
      
      // Получаем все методы
      const methodsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/methods`, {
        headers: {
          "x-admin-key": adminKey || "",
        },
      });
      if (!methodsResponse.ok) throw new Error("Failed to fetch methods");
      const methodsData = await methodsResponse.json();
      setMethods(methodsData);

      // Получаем процентные ставки агрегатора
      const feesResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators/${aggregatorId}/method-fees`,
        {
          headers: {
            "x-admin-key": adminKey || "",
          },
        }
      );
      if (!feesResponse.ok) throw new Error("Failed to fetch fees");
      const feesData = await feesResponse.json();
      // Убедимся, что это массив
      const feesArray = Array.isArray(feesData) ? feesData : [];
      setMethodFees(feesArray);

      // Инициализируем значения для редактирования
      const initialFees: Record<string, string> = {};
      methodsData.forEach((method: Method) => {
        const existingFee = feesArray.find((f: MethodFee) => f.methodId === method.id);
        initialFees[method.id] = existingFee ? existingFee.feePercent.toString() : "0";
      });
      setEditingFees(initialFees);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [aggregatorId]);

  const handleSaveFees = async () => {
    try {
      const adminKey = localStorage.getItem("adminKey");
      const updates: Array<{ methodId: string; feePercent: number }> = [];

      // Собираем все изменения
      Object.entries(editingFees).forEach(([methodId, feeValue]) => {
        const fee = parseFloat(feeValue);
        if (!isNaN(fee) && fee >= 0) {
          updates.push({ methodId, feePercent: fee });
        }
      });

      // Отправляем обновления для каждого метода
      const promises = updates.map(update => 
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators/${aggregatorId}/method-fees`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-admin-key": adminKey || "",
            },
            body: JSON.stringify({
              methodId: update.methodId,
              feePercent: update.feePercent
            }),
          }
        )
      );

      const responses = await Promise.all(promises);
      const allSuccessful = responses.every(response => response.ok);

      if (!allSuccessful) throw new Error("Failed to update some fees");

      toast.success("Процентные ставки обновлены");
      setIsEditing(false);
      fetchData(); // Перезагружаем данные
    } catch (error) {
      console.error("Error saving fees:", error);
      toast.error("Ошибка сохранения процентных ставок");
    }
  };

  const handleCancelEdit = () => {
    // Восстанавливаем исходные значения
    const initialFees: Record<string, string> = {};
    methods.forEach((method) => {
      const existingFee = Array.isArray(methodFees) 
        ? methodFees.find((f) => f.methodId === method.id)
        : null;
      initialFees[method.id] = existingFee ? existingFee.feePercent.toString() : "0";
    });
    setEditingFees(initialFees);
    setIsEditing(false);
  };

  const getFeeValue = (methodId: string) => {
    if (isEditing) {
      return editingFees[methodId] || "0";
    }
    const fee = Array.isArray(methodFees) 
      ? methodFees.find((f) => f.methodId === methodId)
      : null;
    return fee ? fee.feePercent.toString() : "0";
  };

  const calculateCost = (amount: number, feePercent: number) => {
    return amount + (amount * feePercent / 100);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Группируем методы по категориям
  const methodsByCategory = methods.reduce((acc, method) => {
    if (!acc[method.category]) {
      acc[method.category] = [];
    }
    acc[method.category].push(method);
    return acc;
  }, {} as Record<string, Method[]>);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Процентные ставки по методам оплаты</CardTitle>
            <CardDescription>
              Настройте комиссию агрегатора для каждого метода
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancelEdit}>
                  <X className="h-4 w-4 mr-1" />
                  Отмена
                </Button>
                <Button onClick={handleSaveFees}>
                  <Save className="h-4 w-4 mr-1" />
                  Сохранить
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-1" />
                Редактировать
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(methodsByCategory).map(([category, categoryMethods]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase">
                {category}
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Метод</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Комиссия (%)</TableHead>
                    <TableHead>Пример расчета</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryMethods.map((method) => (
                    <TableRow key={method.id}>
                      <TableCell className="font-medium">
                        {method.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={method.isActive ? "success" : "secondary"}>
                          {method.isActive ? "Активен" : "Неактивен"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center gap-2 max-w-[150px]">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={editingFees[method.id] || "0"}
                              onChange={(e) =>
                                setEditingFees({
                                  ...editingFees,
                                  [method.id]: e.target.value,
                                })
                              }
                              className="h-8"
                            />
                            <Percent className="h-4 w-4 text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="font-mono">
                              {getFeeValue(method.id)}%
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 cursor-help">
                                <span className="text-sm text-muted-foreground">
                                  10,000 RUB → {calculateCost(100, parseFloat(getFeeValue(method.id))).toFixed(2)} USDT
                                </span>
                                <Info className="h-3 w-3 text-muted-foreground" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                <p>При курсе 100 RUB/USDT:</p>
                                <p>Сумма: 10,000 RUB = 100 USDT</p>
                                <p>Комиссия: {getFeeValue(method.id)}% = {(100 * parseFloat(getFeeValue(method.id)) / 100).toFixed(2)} USDT</p>
                                <p className="font-semibold">
                                  Итого: {calculateCost(100, parseFloat(getFeeValue(method.id))).toFixed(2)} USDT
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Как работают комиссии:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Комиссия добавляется к базовой стоимости сделки в USDT</li>
                <li>При расчете используется курс из настроенного источника</li>
                <li>Разница между комиссией мерчанта и агрегатора - прибыль платформы</li>
                <li>Изменения применяются только к новым сделкам</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}