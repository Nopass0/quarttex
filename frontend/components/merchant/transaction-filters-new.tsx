'use client'

import { useState } from 'react'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, ArrowUpDown, X } from 'lucide-react'

interface TransactionFiltersProps {
  filters: {
    type: string
    status: string
    dateFrom: string
    dateTo: string
    amountFrom: string
    amountTo: string
    search: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }
  onFiltersChange: (filters: any) => void
}

export function TransactionFiltersNew({ filters, onFiltersChange }: TransactionFiltersProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isSortOpen, setIsSortOpen] = useState(false)

  const handleReset = () => {
    onFiltersChange({
      ...filters,
      type: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      amountFrom: '',
      amountTo: '',
    })
    setIsFilterOpen(false)
  }

  const activeFiltersCount = [
    filters.type && filters.type !== 'ALL',
    filters.status && filters.status !== 'ALL',
    filters.dateFrom,
    filters.dateTo,
    filters.amountFrom,
    filters.amountTo,
  ].filter(Boolean).length

  const sortOptions = [
    { value: 'createdAt-desc', label: 'Дата создания (новые)' },
    { value: 'createdAt-asc', label: 'Дата создания (старые)' },
    { value: 'amount-desc', label: 'Сумма (больше)' },
    { value: 'amount-asc', label: 'Сумма (меньше)' },
    { value: 'status-asc', label: 'Статус (A-Z)' },
    { value: 'status-desc', label: 'Статус (Z-A)' },
  ]

  const currentSort = filters.sortBy ? `${filters.sortBy}-${filters.sortOrder}` : 'createdAt-desc'

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
      {/* Поиск по всем полям */}
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#006039]" />
        <Input
          placeholder="Поиск по ID, Order ID, методу, сумме..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-9 w-full"
        />
      </div>

      {/* Фильтры и сортировка */}
      <div className="flex gap-2">
        {/* Фильтры */}
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4 text-[#006039]" />
            Фильтры
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[90vw] sm:w-80 max-w-80" align="end">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Фильтры</h4>
              <p className="text-sm text-muted-foreground">
                Настройте параметры поиска транзакций
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Тип транзакции</Label>
                <Select
                  value={filters.type || 'ALL'}
                  onValueChange={(value) => onFiltersChange({ ...filters, type: value === 'ALL' ? '' : value })}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
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
                  value={filters.status || 'ALL'}
                  onValueChange={(value) => onFiltersChange({ ...filters, status: value === 'ALL' ? '' : value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
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

              <div className="grid gap-4 grid-cols-2">
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
              </div>

              <div className="grid gap-4 grid-cols-2">
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
            </div>

            <div className="flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={activeFiltersCount === 0}
              >
                <X className="h-4 w-4 mr-2 text-[#006039]" />
                Сбросить
              </Button>
              <Button
                size="sm"
                onClick={() => setIsFilterOpen(false)}
              >
                Применить
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Сортировка */}
      <Popover open={isSortOpen} onOpenChange={setIsSortOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <ArrowUpDown className="h-4 w-4 text-[#006039]" />
            Сортировка
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[90vw] sm:w-64 max-w-64" align="end">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Сортировка</h4>
              <p className="text-sm text-muted-foreground">
                Выберите порядок сортировки
              </p>
            </div>

            <div className="space-y-2">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    const [sortBy, sortOrder] = option.value.split('-')
                    onFiltersChange({ 
                      ...filters, 
                      sortBy, 
                      sortOrder: sortOrder as 'asc' | 'desc' 
                    })
                    setIsSortOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors hover:bg-accent hover:text-accent-foreground ${
                    currentSort === option.value ? 'bg-accent text-accent-foreground' : ''
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      </div>
    </div>
  )
}