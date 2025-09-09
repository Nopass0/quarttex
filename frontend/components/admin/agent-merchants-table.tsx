'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { RefreshCw, Plus } from 'lucide-react'
import { useAdminAuth } from '@/stores/auth'
import { formatAmount } from '@/lib/utils'
import { toast } from 'sonner'

type AgentMerchant = {
  id: string
  merchantId: string
  merchantCode: string
  merchantName: string
  method: string
  methodCode: string
  feeIn: number
  feeOut: number
  isFeeInEnabled: boolean
  isFeeOutEnabled: boolean
  isMerchantEnabled: boolean
  trader: {
    id: string
    email: string
    name: string
  }
}

type AvailableMerchant = {
  id: string
  name: string
  token: string
  methods: Array<{
    id: string
    code: string
    name: string
    type: string
  }>
}

interface AgentMerchantsTableProps {
  agentId: string
}

export function AgentMerchantsTable({ agentId }: AgentMerchantsTableProps) {
  const { token: adminToken } = useAdminAuth()
  const [merchants, setMerchants] = useState<AgentMerchant[]>([])
  const [availableMerchants, setAvailableMerchants] = useState<AvailableMerchant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedMerchant, setSelectedMerchant] = useState<string>('')
  const [selectedMethod, setSelectedMethod] = useState<string>('')
  const [feeIn, setFeeIn] = useState<string>('0')
  const [feeOut, setFeeOut] = useState<string>('0')
  const [updatingFields, setUpdatingFields] = useState<Set<string>>(new Set())
  const [localValues, setLocalValues] = useState<{ [key: string]: string }>({})
  const debounceTimers = useRef<{ [key: string]: NodeJS.Timeout }>({})

  useEffect(() => {
    fetchMerchants()
    fetchAvailableMerchants()
  }, [agentId])

  const fetchMerchants = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/agents/${agentId}/merchants`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch merchants')
      const data = await response.json()
      setMerchants(data.merchants)
    } catch (error) {
      toast.error('Не удалось загрузить список мерчантов')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAvailableMerchants = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/agents/${agentId}/available-merchants`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch available merchants')
      const data = await response.json()
      setAvailableMerchants(data)
    } catch (error) {
      toast.error('Не удалось загрузить доступных мерчантов')
    }
  }

  const handleAddMerchant = async () => {
    if (!selectedMerchant || !selectedMethod) {
      toast.error('Выберите мерчанта и метод')
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/agents/${agentId}/merchants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({
          merchantId: selectedMerchant,
          methodId: selectedMethod,
          feeIn: parseFloat(feeIn) || 0,
          feeOut: parseFloat(feeOut) || 0,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add merchant')
      }

      const result = await response.json()
      setIsAddDialogOpen(false)
      setSelectedMerchant('')
      setSelectedMethod('')
      setFeeIn('0')
      setFeeOut('0')
      await fetchMerchants()
      await fetchAvailableMerchants()
      toast.success(`Мерчант добавлен ко всем трейдерам (${result.addedCount})`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось добавить мерчанта')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNumberInputChange = (id: string, field: string, value: string) => {
    const key = `${id}-${field}`
    
    // Update local state immediately for responsive UI
    setLocalValues(prev => ({ ...prev, [key]: value }))
    
    // Clear existing timer
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key])
    }
    
    // Set new timer for API call
    debounceTimers.current[key] = setTimeout(() => {
      const numericValue = parseFloat(value) || 0
      handleUpdateField(id, field, numericValue)
    }, 1000)
  }

  const handleUpdateField = async (id: string, field: string, value: number | boolean) => {
    // Clear any existing timer for this field
    const timerKey = `${id}-${field}`
    if (debounceTimers.current[timerKey]) {
      clearTimeout(debounceTimers.current[timerKey])
    }

    // For boolean fields (switches), update immediately
    if (typeof value === 'boolean') {
      setUpdatingFields(prev => new Set(prev).add(timerKey))
      
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/trader-merchant/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': adminToken || '',
          },
          body: JSON.stringify({ [field]: value }),
        })
        
        if (!response.ok) throw new Error('Failed to update')
        
        // Update merchants state
        setMerchants(prev => prev.map(m => 
          m.id === id ? { ...m, [field]: value } : m
        ))
        
        // Clear local value after successful update
        const localKey = `${id}-${field}`
        setLocalValues(prev => {
          const newValues = { ...prev }
          delete newValues[localKey]
          return newValues
        })
        
        toast.success('Обновлено')
      } catch (error) {
        toast.error('Не удалось обновить')
        // Revert on error
        await fetchMerchants()
      } finally {
        setUpdatingFields(prev => {
          const newSet = new Set(prev)
          newSet.delete(timerKey)
          return newSet
        })
      }
    } else {
      // For number fields, this is called from debounced timer
      setUpdatingFields(prev => new Set(prev).add(timerKey))
      
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/trader-merchant/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': adminToken || '',
          },
          body: JSON.stringify({ [field]: value }),
        })
        
        if (!response.ok) throw new Error('Failed to update')
        
        // Update merchants state
        setMerchants(prev => prev.map(m => 
          m.id === id ? { ...m, [field]: value } : m
        ))
        
        // Clear local value after successful update
        const localKey = `${id}-${field}`
        setLocalValues(prev => {
          const newValues = { ...prev }
          delete newValues[localKey]
          return newValues
        })
        
        toast.success('Комиссия обновлена')
      } catch (error) {
        toast.error('Не удалось обновить комиссию')
        // Revert on error
        await fetchMerchants()
      } finally {
        setUpdatingFields(prev => {
          const newSet = new Set(prev)
          newSet.delete(timerKey)
          return newSet
        })
      }
    }
  }

  const selectedMerchantData = availableMerchants.find(m => m.id === selectedMerchant)

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (merchants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Мерчанты агента</CardTitle>
          <CardDescription>
            Список всех мерчантов, привязанных к трейдерам данного агента
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">
            Нет привязанных мерчантов
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Мерчанты агента</CardTitle>
            <CardDescription>
              Список всех мерчантов, привязанных к трейдерам данного агента ({merchants.length})
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Добавить мерчанта ко всем
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Добавить мерчанта ко всем трейдерам</DialogTitle>
                <DialogDescription>
                  Выберите мерчанта и метод для добавления ко всем трейдерам агента
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="merchant" className="text-right">
                    Мерчант
                  </Label>
                  <Select value={selectedMerchant} onValueChange={setSelectedMerchant}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Выберите мерчанта" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMerchants.map((merchant) => (
                        <SelectItem key={merchant.id} value={merchant.id}>
                          {merchant.name} ({merchant.token})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedMerchant && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="method" className="text-right">
                      Метод
                    </Label>
                    <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Выберите метод" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedMerchantData?.methods.map((method) => (
                          <SelectItem key={method.id} value={method.id}>
                            {method.name} ({method.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="feeIn" className="text-right">
                    Комиссия вход (%)
                  </Label>
                  <Input
                    id="feeIn"
                    type="number"
                    step="0.01"
                    value={feeIn}
                    onChange={(e) => setFeeIn(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="feeOut" className="text-right">
                    Комиссия выход (%)
                  </Label>
                  <Input
                    id="feeOut"
                    type="number"
                    step="0.01"
                    value={feeOut}
                    onChange={(e) => setFeeOut(e.target.value)}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddMerchant} disabled={isLoading}>
                  Добавить ко всем трейдерам
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableCaption>Управление комиссиями и статусами мерчантов</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Мерчант</TableHead>
                <TableHead>Метод</TableHead>
                <TableHead>Трейдер</TableHead>
                <TableHead>Комиссия вход (%)</TableHead>
                <TableHead>Комиссия выход (%)</TableHead>
                <TableHead>Вход</TableHead>
                <TableHead>Выход</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {merchants.map((merchant) => (
                <TableRow key={merchant.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{merchant.merchantName}</div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span 
                          className="font-mono cursor-pointer hover:text-gray-700"
                          onClick={() => {
                            navigator.clipboard.writeText(merchant.merchantId)
                            toast.success('ID скопирован')
                          }}
                          title={`Нажмите для копирования: ${merchant.merchantId}`}
                        >
                          {merchant.merchantId.slice(0, 5)}...
                        </span>
                        <span>•</span>
                        <span 
                          className="font-mono cursor-pointer hover:text-gray-700"
                          onClick={() => {
                            navigator.clipboard.writeText(merchant.merchantCode)
                            toast.success('Код скопирован')
                          }}
                          title={`Нажмите для копирования: ${merchant.merchantCode}`}
                        >
                          {merchant.merchantCode.slice(0, 5)}...
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{merchant.method}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{merchant.trader.email}</div>
                      <div className="text-xs text-gray-500">ID: {merchant.trader.id.slice(0, 8)}...</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={localValues[`${merchant.id}-feeIn`] ?? merchant.feeIn}
                      onChange={(e) => handleNumberInputChange(merchant.id, 'feeIn', e.target.value)}
                      className="w-20"
                      disabled={updatingFields.has(`${merchant.id}-feeIn`)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={localValues[`${merchant.id}-feeOut`] ?? merchant.feeOut}
                      onChange={(e) => handleNumberInputChange(merchant.id, 'feeOut', e.target.value)}
                      className="w-20"
                      disabled={updatingFields.has(`${merchant.id}-feeOut`)}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={merchant.isFeeInEnabled}
                      onCheckedChange={(checked) => handleUpdateField(merchant.id, 'isFeeInEnabled', checked)}
                      disabled={updatingFields.has(`${merchant.id}-isFeeInEnabled`)}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={merchant.isFeeOutEnabled}
                      onCheckedChange={(checked) => handleUpdateField(merchant.id, 'isFeeOutEnabled', checked)}
                      disabled={updatingFields.has(`${merchant.id}-isFeeOutEnabled`)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}