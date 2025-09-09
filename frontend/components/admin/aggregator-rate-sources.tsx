"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, Info, Calculator } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RateSource {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

interface AggregatorRateSource {
  id: string;
  rateSourceId: string;
  kkkAdjustment: number;
  rateSource: RateSource;
}

interface AggregatorRateSourcesProps {
  aggregatorId: string;
}

export default function AggregatorRateSources({ aggregatorId }: AggregatorRateSourcesProps) {
  const [rateSources, setRateSources] = useState<RateSource[]>([]);
  const [aggregatorRateSources, setAggregatorRateSources] = useState<AggregatorRateSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<AggregatorRateSource | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [kkkAdjustment, setKkkAdjustment] = useState("0");

  const fetchData = async () => {
    try {
      const adminKey = localStorage.getItem("adminKey");
      
      // Получаем все источники курсов
      const sourcesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/rate-sources`, {
        headers: {
          "x-admin-key": adminKey || "",
        },
      });
      if (!sourcesResponse.ok) throw new Error("Failed to fetch rate sources");
      const sourcesData = await sourcesResponse.json();
      // Убедимся, что это массив
      setRateSources(Array.isArray(sourcesData) ? sourcesData : []);

      // Получаем источники курсов агрегатора
      const aggregatorSourcesResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators/${aggregatorId}/rate-sources`,
        {
          headers: {
            "x-admin-key": adminKey || "",
          },
        }
      );
      if (!aggregatorSourcesResponse.ok) throw new Error("Failed to fetch aggregator rate sources");
      const aggregatorSourcesData = await aggregatorSourcesResponse.json();
      // Убедимся, что это массив
      setAggregatorRateSources(Array.isArray(aggregatorSourcesData) ? aggregatorSourcesData : []);
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

  const handleSaveRateSource = async () => {
    try {
      const adminKey = localStorage.getItem("adminKey");
      const kkk = parseFloat(kkkAdjustment);
      
      if (!selectedSourceId) {
        toast.error("Выберите источник курса");
        return;
      }

      if (isNaN(kkk)) {
        toast.error("Введите корректное значение ККК");
        return;
      }

      const url = editingSource
        ? `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators/${aggregatorId}/rate-sources/${editingSource.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators/${aggregatorId}/rate-sources`;

      const method = editingSource ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey || "",
        },
        body: JSON.stringify({
          rateSourceId: selectedSourceId,
          kkkAdjustment: kkk,
        }),
      });

      if (!response.ok) throw new Error("Failed to save rate source");

      toast.success(editingSource ? "Источник курса обновлен" : "Источник курса добавлен");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving rate source:", error);
      toast.error("Ошибка сохранения источника курса");
    }
  };

  const handleDeleteRateSource = async (id: string) => {
    try {
      const adminKey = localStorage.getItem("adminKey");
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators/${aggregatorId}/rate-sources/${id}`,
        {
          method: "DELETE",
          headers: {
            "x-admin-key": adminKey || "",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete rate source");

      toast.success("Источник курса удален");
      fetchData();
    } catch (error) {
      console.error("Error deleting rate source:", error);
      toast.error("Ошибка удаления источника курса");
    }
  };

  const handleEditClick = (source: AggregatorRateSource) => {
    setEditingSource(source);
    setSelectedSourceId(source.rateSourceId);
    setKkkAdjustment(source.kkkAdjustment.toString());
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingSource(null);
    setSelectedSourceId("");
    setKkkAdjustment("0");
  };

  const calculateAdjustedRate = (baseRate: number, kkkAdjustment: number) => {
    return baseRate + (baseRate * kkkAdjustment / 100);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Фильтруем доступные источники (те, которые еще не добавлены)
  const availableSources = Array.isArray(rateSources) 
    ? rateSources.filter(
        (source) => !Array.isArray(aggregatorRateSources) || !aggregatorRateSources.some((as) => as.rateSourceId === source.id)
      )
    : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Источники курсов</CardTitle>
            <CardDescription>
              Настройте источники курсов и ККК для агрегатора
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                Добавить источник
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingSource ? "Редактировать источник курса" : "Добавить источник курса"}
                </DialogTitle>
                <DialogDescription>
                  Выберите источник курса и настройте ККК (курсовую корректировку)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="source">Источник курса</Label>
                  <Select
                    value={selectedSourceId}
                    onValueChange={setSelectedSourceId}
                    disabled={!!editingSource}
                  >
                    <SelectTrigger id="source">
                      <SelectValue placeholder="Выберите источник" />
                    </SelectTrigger>
                    <SelectContent>
                      {editingSource ? (
                        <SelectItem value={editingSource.rateSourceId}>
                          {editingSource.rateSource.name}
                        </SelectItem>
                      ) : (
                        availableSources.map((source) => (
                          <SelectItem key={source.id} value={source.id}>
                            {source.name} ({source.type})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="kkk">ККК (курсовая корректировка, %)</Label>
                  <Input
                    id="kkk"
                    type="number"
                    step="0.01"
                    value={kkkAdjustment}
                    onChange={(e) => setKkkAdjustment(e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Положительное значение увеличивает курс, отрицательное - уменьшает
                  </p>
                </div>
                {kkkAdjustment && kkkAdjustment !== "0" && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <Calculator className="h-4 w-4" />
                      <span>Пример расчета:</span>
                    </div>
                    <div className="mt-2 text-sm space-y-1">
                      <p>Базовый курс: 100 RUB/USDT</p>
                      <p>ККК: {kkkAdjustment}%</p>
                      <p className="font-semibold">
                        Итоговый курс: {calculateAdjustedRate(100, parseFloat(kkkAdjustment)).toFixed(2)} RUB/USDT
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={handleSaveRateSource}>
                  {editingSource ? "Сохранить" : "Добавить"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {aggregatorRateSources.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Источник</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>ККК</TableHead>
                <TableHead>Пример курса</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aggregatorRateSources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell className="font-medium">
                    {source.rateSource.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {source.rateSource.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={source.rateSource.isActive ? "success" : "secondary"}>
                      {source.rateSource.isActive ? "Активен" : "Неактивен"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {source.kkkAdjustment > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : source.kkkAdjustment < 0 ? (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      ) : null}
                      <span className={`font-mono ${
                        source.kkkAdjustment > 0 ? "text-green-600" : 
                        source.kkkAdjustment < 0 ? "text-red-600" : ""
                      }`}>
                        {source.kkkAdjustment > 0 ? "+" : ""}{source.kkkAdjustment}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 cursor-help">
                            <span className="text-sm">
                              100 → {calculateAdjustedRate(100, source.kkkAdjustment).toFixed(2)}
                            </span>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <p>При базовом курсе 100 RUB/USDT:</p>
                            <p>ККК: {source.kkkAdjustment}%</p>
                            <p className="font-semibold">
                              Итоговый курс: {calculateAdjustedRate(100, source.kkkAdjustment).toFixed(2)} RUB/USDT
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditClick(source)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteRateSource(source.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Источники курсов не настроены
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Добавить первый источник
            </Button>
          </div>
        )}

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Как работают источники курсов:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Источник курса определяет базовый обменный курс RUB/USDT</li>
                <li>ККК (курсовая корректировка) позволяет настроить индивидуальный курс для агрегатора</li>
                <li>Положительная ККК увеличивает курс (агрегатор получает меньше USDT)</li>
                <li>Отрицательная ККК уменьшает курс (агрегатор получает больше USDT)</li>
                <li>Итоговый курс = Базовый курс × (1 + ККК/100)</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}