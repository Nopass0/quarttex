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
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, Info, Calculator, Building2 } from "lucide-react";
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

interface Aggregator {
  id: string;
  name: string;
  isActive: boolean;
}

interface AggregatorRateSource {
  id: string;
  aggregatorId: string;
  rateSourceId: string;
  kkkPercent?: number;
  kkkOperation?: 'PLUS' | 'MINUS';
  kkkAdjustment?: number;
  aggregator: Aggregator;
}

interface RateSourceAggregatorsProps {
  rateSourceId: string;
  rateSourceName: string;
}

export default function RateSourceAggregators({ rateSourceId, rateSourceName }: RateSourceAggregatorsProps) {
  const [aggregators, setAggregators] = useState<Aggregator[]>([]);
  const [aggregatorRateSources, setAggregatorRateSources] = useState<AggregatorRateSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<AggregatorRateSource | null>(null);
  const [selectedAggregatorId, setSelectedAggregatorId] = useState("");
  const [kkkAdjustment, setKkkAdjustment] = useState("0");

  const fetchData = async () => {
    try {
      const adminKey = localStorage.getItem("adminKey");
      
      // Получаем всех агрегаторов
      const aggregatorsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators`, {
        headers: {
          "x-admin-key": adminKey || "",
        },
      });
      if (!aggregatorsResponse.ok) throw new Error("Failed to fetch aggregators");
      const aggregatorsData = await aggregatorsResponse.json();
      // API возвращает объект с полем data
      const aggregatorsList = aggregatorsData.data || aggregatorsData;
      setAggregators(Array.isArray(aggregatorsList) ? aggregatorsList : []);

      // Получаем связи источника курса с агрегаторами
      const rateSourcesResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/rate-sources/${rateSourceId}/aggregators`,
        {
          headers: {
            "x-admin-key": adminKey || "",
          },
        }
      );
      if (rateSourcesResponse.ok) {
        const rateSourcesData = await rateSourcesResponse.json();
        setAggregatorRateSources(Array.isArray(rateSourcesData) ? rateSourcesData : []);
      } else {
        setAggregatorRateSources([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [rateSourceId]);

  const handleSaveRateSource = async () => {
    try {
      const adminKey = localStorage.getItem("adminKey");
      const kkk = parseFloat(kkkAdjustment);
      
      if (!selectedAggregatorId) {
        toast.error("Выберите агрегатора");
        return;
      }

      if (isNaN(kkk)) {
        toast.error("Введите корректное значение ККК");
        return;
      }

      const url = editingSource
        ? `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators/${editingSource.aggregatorId}/rate-sources/${editingSource.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators/${selectedAggregatorId}/rate-sources`;

      const method = editingSource ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey || "",
        },
        body: JSON.stringify({
          rateSourceId,
          kkkAdjustment: kkk,
        }),
      });

      if (!response.ok) throw new Error("Failed to save rate source");

      toast.success(editingSource ? "Настройки обновлены" : "Агрегатор добавлен");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving rate source:", error);
      toast.error("Ошибка сохранения");
    }
  };

  const handleDeleteRateSource = async (source: AggregatorRateSource) => {
    try {
      const adminKey = localStorage.getItem("adminKey");
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators/${source.aggregatorId}/rate-sources/${source.id}`,
        {
          method: "DELETE",
          headers: {
            "x-admin-key": adminKey || "",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete rate source");

      toast.success("Агрегатор откреплен от источника");
      fetchData();
    } catch (error) {
      console.error("Error deleting rate source:", error);
      toast.error("Ошибка удаления");
    }
  };

  const handleEditClick = (source: AggregatorRateSource) => {
    setEditingSource(source);
    setSelectedAggregatorId(source.aggregatorId);
    // Вычисляем kkkAdjustment из kkkPercent и kkkOperation
    const adjustment = source.kkkPercent ? 
      source.kkkPercent * (source.kkkOperation === 'MINUS' ? -1 : 1) : 
      (source.kkkAdjustment || 0);
    setKkkAdjustment(adjustment.toString());
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingSource(null);
    setSelectedAggregatorId("");
    setKkkAdjustment("0");
  };

  const calculateAdjustedRate = (baseRate: number, kkkAdjustment: number) => {
    return baseRate + (baseRate * kkkAdjustment / 100);
  };

  const getKkkAdjustment = (source: AggregatorRateSource): number => {
    if (source.kkkAdjustment !== undefined) {
      return source.kkkAdjustment;
    }
    if (source.kkkPercent !== undefined && source.kkkOperation) {
      return source.kkkPercent * (source.kkkOperation === 'MINUS' ? -1 : 1);
    }
    return 0;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Фильтруем доступных агрегаторов (те, которые еще не добавлены)
  const availableAggregators = aggregators.filter(
    (agg) => !aggregatorRateSources.some((rs) => rs.aggregatorId === agg.id)
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Агрегаторы для источника "{rateSourceName}"
            </CardTitle>
            <CardDescription>
              Настройте ККК для каждого агрегатора, использующего этот источник
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                Добавить агрегатора
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingSource ? "Редактировать настройки" : "Добавить агрегатора к источнику"}
                </DialogTitle>
                <DialogDescription>
                  Выберите агрегатора и настройте ККК (курсовую корректировку)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="aggregator">Агрегатор</Label>
                  <Select
                    value={selectedAggregatorId}
                    onValueChange={setSelectedAggregatorId}
                    disabled={!!editingSource}
                  >
                    <SelectTrigger id="aggregator">
                      <SelectValue placeholder="Выберите агрегатора" />
                    </SelectTrigger>
                    <SelectContent>
                      {editingSource ? (
                        <SelectItem value={editingSource.aggregatorId}>
                          {editingSource.aggregator.name}
                        </SelectItem>
                      ) : (
                        availableAggregators.map((agg) => (
                          <SelectItem key={agg.id} value={agg.id}>
                            {agg.name}
                            {!agg.isActive && " (неактивен)"}
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
                <TableHead>Агрегатор</TableHead>
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
                    {source.aggregator.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant={source.aggregator.isActive ? "success" : "secondary"}>
                      {source.aggregator.isActive ? "Активен" : "Неактивен"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {getKkkAdjustment(source) > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : getKkkAdjustment(source) < 0 ? (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      ) : null}
                      <span className={`font-mono ${
                        getKkkAdjustment(source) > 0 ? "text-green-600" : 
                        getKkkAdjustment(source) < 0 ? "text-red-600" : ""
                      }`}>
                        {getKkkAdjustment(source) > 0 ? "+" : ""}{getKkkAdjustment(source)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 cursor-help">
                            <span className="text-sm">
                              100 → {calculateAdjustedRate(100, getKkkAdjustment(source)).toFixed(2)}
                            </span>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <p>При базовом курсе 100 RUB/USDT:</p>
                            <p>ККК: {getKkkAdjustment(source)}%</p>
                            <p className="font-semibold">
                              Итоговый курс: {calculateAdjustedRate(100, getKkkAdjustment(source)).toFixed(2)} RUB/USDT
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
                        onClick={() => handleDeleteRateSource(source)}
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
              Нет агрегаторов, использующих этот источник
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Добавить первого агрегатора
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}