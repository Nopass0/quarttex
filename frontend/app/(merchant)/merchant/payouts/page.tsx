"use client";

import { useState } from "react";
import { PayoutsList } from "@/components/merchant/payouts-list";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-picker-range";
import { Search, Filter, Download, Loader2 } from "lucide-react";
import { exportPayoutsToExcel, type ExportPayout } from "@/lib/excel-export";
import { API_URL } from "@/lib/utils";
import { useMerchantAuth } from "@/stores/merchant-auth";
import { toast } from "sonner";

export default function MerchantPayoutsPage() {
  const { sessionToken } = useMerchantAuth();
  const [filters, setFilters] = useState({
    status: "ALL",
    dateFrom: "",
    dateTo: "",
    amountFrom: "",
    amountTo: "",
    search: "",
    sortBy: "createdAt",
    sortOrder: "desc" as "asc" | "desc",
  });

  const [showFilters, setShowFilters] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      status: "ALL",
      dateFrom: "",
      dateTo: "",
      amountFrom: "",
      amountTo: "",
      search: "",
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const allPayouts: ExportPayout[] = [];

      const buildParams = (page: number) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "100",
        });
        if (filters.status && filters.status !== "ALL")
          params.append("status", filters.status);
        if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
        if (filters.dateTo) params.append("dateTo", filters.dateTo);
        if (filters.amountFrom) params.append("amountFrom", filters.amountFrom);
        if (filters.amountTo) params.append("amountTo", filters.amountTo);
        if (filters.search) params.append("search", filters.search);
        if (filters.sortBy) params.append("sortBy", filters.sortBy);
        if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);
        return params;
      };

      let page = 1;
      let totalPages = 1;

      do {
        const response = await fetch(
          `${API_URL}/merchant/payouts?${buildParams(page)}`,
          { headers: { Authorization: `Bearer ${sessionToken}` } }
        );
        if (!response.ok) {
          throw new Error("Failed to fetch payouts for export");
        }
        const data = await response.json();
        const payouts: ExportPayout[] = data.data || [];
        allPayouts.push(...payouts);
        const meta = data.meta || data.pagination;
        totalPages = meta?.totalPages || meta?.pages || 1;
        page++;
      } while (page <= totalPages);

      if (allPayouts.length === 0) {
        toast.warning("Нет выплат для экспорта");
        return;
      }
      exportPayoutsToExcel(allPayouts, "merchant_payouts");
    } catch (error) {
      console.error("Failed to export payouts:", error);
      toast.error("Не удалось экспортировать выплаты");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Выплаты</h1>
          <p className="text-muted-foreground">
            Управляйте своими выплатами и отслеживайте их статус
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? "Скрыть фильтры" : "Показать фильтры"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Экспорт...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Экспорт
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Поиск</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="ID, кошелек, банк..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Статус</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Все статусы</SelectItem>
                  <SelectItem value="CREATED">Создано</SelectItem>
                  <SelectItem value="ACTIVE">Активно</SelectItem>
                  <SelectItem value="CHECKING">Проверка</SelectItem>
                  <SelectItem value="COMPLETED">Завершено</SelectItem>
                  <SelectItem value="CANCELLED">Отменено</SelectItem>
                  <SelectItem value="EXPIRED">Истекло</SelectItem>
                  <SelectItem value="DISPUTED">Спор</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amountFrom">Сумма от</Label>
              <Input
                id="amountFrom"
                type="number"
                placeholder="0"
                value={filters.amountFrom}
                onChange={(e) =>
                  handleFilterChange("amountFrom", e.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amountTo">Сумма до</Label>
              <Input
                id="amountTo"
                type="number"
                placeholder="∞"
                value={filters.amountTo}
                onChange={(e) => handleFilterChange("amountTo", e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Период</Label>
              <DatePickerWithRange
                date={
                  filters.dateFrom && filters.dateTo
                    ? {
                        from: new Date(filters.dateFrom),
                        to: new Date(filters.dateTo),
                      }
                    : null
                }
                onDateChange={(range) => {
                  handleFilterChange(
                    "dateFrom",
                    range?.from?.toISOString().split("T")[0] || ""
                  );
                  handleFilterChange(
                    "dateTo",
                    range?.to?.toISOString().split("T")[0] || ""
                  );
                }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={handleResetFilters}>
              Сбросить
            </Button>
            <Button>Применить фильтры</Button>
          </div>
        </Card>
      )}

      {/* Payouts List */}
      <PayoutsList filters={filters} />
    </div>
  );
}
