'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'

interface TransactionFiltersProps {
  filters: {
    type: string
    status: string
    dateFrom: string
    dateTo: string
    amountFrom: string
    amountTo: string
    search: string
  }
  onFiltersChange: (filters: any) => void
}

export function TransactionFilters({ filters, onFiltersChange }: TransactionFiltersProps) {
  const handleReset = () => {
    onFiltersChange({
      type: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      amountFrom: '',
      amountTo: '',
      search: '',
    })
  }

  const hasActiveFilters = Object.values(filters).some(value => value !== '')

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="search">Поиск</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#006039]" />
              <Input
                id="search"
                placeholder="ID, внешний ID..."
                value={filters.search}
                onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Тип</Label>
            <Select
              value={filters.type}
              onValueChange={(value) => onFiltersChange({ ...filters, type: value })}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Все типы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Все типы</SelectItem>
                <SelectItem value="IN">Входящие</SelectItem>
                <SelectItem value="OUT">Исходящие</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Статус</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Все статусы</SelectItem>
                <SelectItem value="CREATED">Создана</SelectItem>
                <SelectItem value="IN_PROGRESS">В процессе</SelectItem>
                <SelectItem value="READY">Завершена</SelectItem>
                <SelectItem value="EXPIRED">Истекла</SelectItem>
                <SelectItem value="CANCELED">Отменена</SelectItem>
                <SelectItem value="DISPUTE">Спор</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 lg:col-span-1 flex items-end">
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={handleReset}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2 text-[#006039]" />
                Сбросить
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="dateFrom">Дата от</Label>
            <Input
              id="dateFrom"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateTo">Дата до</Label>
            <Input
              id="dateTo"
              type="date"
              value={filters.dateTo}
              onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amountFrom">Сумма от</Label>
            <Input
              id="amountFrom"
              type="number"
              placeholder="0"
              value={filters.amountFrom}
              onChange={(e) => onFiltersChange({ ...filters, amountFrom: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amountTo">Сумма до</Label>
            <Input
              id="amountTo"
              type="number"
              placeholder="100000"
              value={filters.amountTo}
              onChange={(e) => onFiltersChange({ ...filters, amountTo: e.target.value })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}