"use client"

import { useState, useEffect } from "react"
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
import { Search, Filter, Download, Loader2 } from "lucide-react"
import { exportTransactionsToExcel, type ExportTransaction } from "@/lib/excel-export"
import { useMerchantAuth } from "@/stores/merchant-auth"
import { toast } from "sonner"

export default function MerchantDealsPage() {
  const { sessionToken } = useMerchantAuth()
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
  const [isExporting, setIsExporting] = useState(false)
  const [merchantInfo, setMerchantInfo] = useState<{ countInRubEquivalent: boolean } | null>(null)

  // Fetch merchant info on mount
  useEffect(() => {
    const fetchMerchantInfo = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/merchant/auth/me`,
          {
            headers: {
              'Authorization': `Bearer ${sessionToken}`,
            },
          }
        )
        if (response.ok) {
          const data = await response.json()
          console.log('Merchant countInRubEquivalent:', data.merchant.countInRubEquivalent)
          setMerchantInfo({ countInRubEquivalent: data.merchant.countInRubEquivalent })
        }
      } catch (error) {
        console.error('Failed to fetch merchant info:', error)
      }
    }
    
    if (sessionToken) {
      fetchMerchantInfo()
    }
  }, [sessionToken])

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

  const handleExport = async () => {
    try {
      setIsExporting(true)
      
      // Build query params for export
      const params = new URLSearchParams({
        page: "1",
        limit: "10000", // Export all available transactions
      })

      // Add filters
      if (filters.type && filters.type !== 'ALL') params.append('type', filters.type)
      if (filters.status && filters.status !== 'ALL') params.append('status', filters.status)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)
      if (filters.amountFrom) params.append('amountFrom', filters.amountFrom)
      if (filters.amountTo) params.append('amountTo', filters.amountTo)
      if (filters.search) params.append('search', filters.search)
      if (filters.sortBy) params.append('sortBy', filters.sortBy)
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/merchant/dashboard/transactions?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch transactions for export')
      }

      const data = await response.json()
      const transactions: ExportTransaction[] = data.data || []

      if (transactions.length === 0) {
        toast.warning('Нет транзакций для экспорта')
        return
      }

      // Export to Excel with merchant settings
      exportTransactionsToExcel(transactions, 'merchant_transactions', merchantInfo?.countInRubEquivalent)
      toast.success(`Экспортировано ${transactions.length} транзакций`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Не удалось экспортировать транзакции')
    } finally {
      setIsExporting(false)
    }
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
            <Button 
              variant="outline"
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