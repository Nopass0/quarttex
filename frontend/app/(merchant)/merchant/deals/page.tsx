"use client"

import { useState } from "react"
import { TransactionsList } from "@/components/merchant/transactions-list"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DatePickerWithRange } from "@/components/ui/date-picker-range"
import { Search, Filter, Download } from "lucide-react"

export default function MerchantDealsPage() {
  const [filters, setFilters] = useState({
    type: "ALL",
    status: "ALL",
    dateFrom: "",
    dateTo: "",
    amountFrom: "",
    amountTo: "",
    search: "",
    sortBy: "createdAt",
    sortOrder: "desc" as "asc" | "desc"
  })

  const [showFilters, setShowFilters] = useState(false)

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleResetFilters = () => {
    setFilters({
      type: "ALL",
      status: "ALL",
      dateFrom: "",
      dateTo: "",
      amountFrom: "",
      amountTo: "",
      search: "",
      sortBy: "createdAt",
      sortOrder: "desc"
    })
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Поиск по ID транзакции, Order ID..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Фильтры
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Экспорт
            </Button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Тип</Label>
                <Select value={filters.type} onValueChange={(value) => handleFilterChange("type", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тип" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Все</SelectItem>
                    <SelectItem value="IN">Входящие</SelectItem>
                    <SelectItem value="OUT">Исходящие</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Статус</Label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Все</SelectItem>
                    <SelectItem value="CREATED">Создана</SelectItem>
                    <SelectItem value="IN_PROGRESS">В процессе</SelectItem>
                    <SelectItem value="READY">Завершена</SelectItem>
                    <SelectItem value="EXPIRED">Истекла</SelectItem>
                    <SelectItem value="CANCELED">Отменена</SelectItem>
                    <SelectItem value="DISPUTE">Спор</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Сумма от</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.amountFrom}
                  onChange={(e) => handleFilterChange("amountFrom", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Сумма до</Label>
                <Input
                  type="number"
                  placeholder="999999"
                  value={filters.amountTo}
                  onChange={(e) => handleFilterChange("amountTo", e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Период</Label>
                <DatePickerWithRange
                  date={
                    filters.dateFrom && filters.dateTo
                      ? { from: new Date(filters.dateFrom), to: new Date(filters.dateTo) }
                      : null
                  }
                  onDateChange={(range) => {
                    handleFilterChange("dateFrom", range?.from?.toISOString().split('T')[0] || "")
                    handleFilterChange("dateTo", range?.to?.toISOString().split('T')[0] || "")
                  }}
                />
              </div>

              <div className="md:col-span-2 flex items-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleResetFilters}
                  className="flex-1"
                >
                  Сбросить фильтры
                </Button>
                <Button 
                  onClick={() => setShowFilters(false)}
                  className="flex-1"
                >
                  Применить
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Transactions List */}
      <TransactionsList filters={filters} />
    </div>
  )
}