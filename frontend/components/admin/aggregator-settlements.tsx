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
import { Textarea } from "@/components/ui/textarea";
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
import { formatAmount, formatDateTime } from "@/lib/utils";
import {
  Plus,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface Settlement {
  id: string;
  aggregatorId: string;
  amount: number;
  direction: "IN" | "OUT";
  description: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

interface SettlementStats {
  totalIn: number;
  totalOut: number;
  balance: number;
}

interface AggregatorSettlementsProps {
  aggregatorId: string;
}

export default function AggregatorSettlements({ aggregatorId }: AggregatorSettlementsProps) {
  const adminToken = useAdminAuth((state) => state.token);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [stats, setStats] = useState<SettlementStats>({
    totalIn: 0,
    totalOut: 0,
    balance: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  
  // Форма для добавления сеттла
  const [formData, setFormData] = useState({
    amount: 0,
    direction: "IN" as "IN" | "OUT",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });

  useEffect(() => {
    fetchSettlements();
  }, [aggregatorId, selectedMonth]);
  
  const handleMonthChange = (value: string) => {
    setSelectedMonth(value === "all" ? "" : value);
  };

  const fetchSettlements = async () => {
    if (!adminToken) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedMonth) {
        params.append("month", selectedMonth);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators-v2/${aggregatorId}/settlements?${params}`,
        {
          headers: { "x-admin-key": adminToken },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch settlements");
      }

      const data = await response.json();
      setSettlements(data.settlements || []);
      setStats(data.stats || { totalIn: 0, totalOut: 0, balance: 0 });
    } catch (error) {
      console.error("Error fetching settlements:", error);
      toast.error("Ошибка загрузки сеттлов");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSettlement = async () => {
    if (!adminToken || formData.amount <= 0) {
      toast.error("Укажите корректную сумму");
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators-v2/${aggregatorId}/settlements`,
        {
          method: "POST",
          headers: {
            "x-admin-key": adminToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: formData.amount,
            direction: formData.direction,
            description: formData.description || null,
            date: formData.date,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add settlement");
      }

      toast.success("Сеттл успешно добавлен");
      setIsAddModalOpen(false);
      fetchSettlements();
      resetForm();
    } catch (error) {
      toast.error("Ошибка добавления сеттла");
    }
  };

  const resetForm = () => {
    setFormData({
      amount: 0,
      direction: "IN",
      description: "",
      date: format(new Date(), "yyyy-MM-dd"),
    });
  };

  const getDirectionIcon = (direction: "IN" | "OUT") => {
    return direction === "IN" ? (
      <ArrowDownCircle className="h-4 w-4 text-green-500" />
    ) : (
      <ArrowUpCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getDirectionLabel = (direction: "IN" | "OUT") => {
    return direction === "IN" ? "Нам засеттлили" : "Мы засеттлили";
  };

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
                <FileText className="h-5 w-5" />
                Сеттлы
              </CardTitle>
              <CardDescription>
                История взаиморасчетов с агрегатором
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedMonth || "all"} onValueChange={handleMonthChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Все месяцы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все месяцы</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    const value = format(date, "yyyy-MM");
                    const label = format(date, "LLLL yyyy", { locale: ru });
                    return (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить сеттл
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Статистика */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Получено</p>
                    <p className="text-2xl font-bold text-green-600">
                      +{formatAmount(stats.totalIn)} USDT
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Отправлено</p>
                    <p className="text-2xl font-bold text-red-600">
                      -{formatAmount(stats.totalOut)} USDT
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Баланс</p>
                    <p className={`text-2xl font-bold ${stats.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {stats.balance >= 0 ? "+" : ""}{formatAmount(stats.balance)} USDT
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Таблица сеттлов */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Направление</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead>Добавлено</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settlements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Нет записей о сеттлах
                  </TableCell>
                </TableRow>
              ) : (
                settlements.map((settlement) => (
                  <TableRow key={settlement.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(settlement.date), "dd.MM.yyyy")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getDirectionIcon(settlement.direction)}
                        <Badge
                          variant={settlement.direction === "IN" ? "default" : "secondary"}
                        >
                          {getDirectionLabel(settlement.direction)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${
                        settlement.direction === "IN" ? "text-green-600" : "text-red-600"
                      }`}>
                        {settlement.direction === "IN" ? "+" : "-"}
                        {formatAmount(settlement.amount)} USDT
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {settlement.description || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDateTime(settlement.createdAt)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Модальное окно добавления сеттла */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить сеттл</DialogTitle>
            <DialogDescription>
              Добавьте информацию о взаиморасчете с агрегатором
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Направление</Label>
              <Select
                value={formData.direction}
                onValueChange={(value: "IN" | "OUT") => 
                  setFormData({ ...formData, direction: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">
                    <div className="flex items-center gap-2">
                      <ArrowDownCircle className="h-4 w-4 text-green-500" />
                      Нам засеттлили
                    </div>
                  </SelectItem>
                  <SelectItem value="OUT">
                    <div className="flex items-center gap-2">
                      <ArrowUpCircle className="h-4 w-4 text-red-500" />
                      Мы засеттлили
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Сумма (USDT)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Дата</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div>
              <Label>Описание (необязательно)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Например: Сеттл за январь 2024"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleAddSettlement}>Добавить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}