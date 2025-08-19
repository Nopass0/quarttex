"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { traderApi } from "@/services/api"
import { toast } from "sonner"
import { Loader2, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

interface Transaction {
  id: string
  numericId: number
  amount: number
  currency: string
  status: string
  clientName: string
  assetOrBank: string
  createdAt: string
  acceptedAt: string | null
  expired_at: string
}

// Function to format remaining time
const formatRemainingTime = (expiredAt: string) => {
  const now = new Date().getTime()
  const expiresAt = new Date(expiredAt).getTime()
  const diff = expiresAt - now
  
  if (diff <= 0) return "Истекло"
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  } else {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
}

const statusConfig = {
  CREATED: { label: "В обработке", color: "bg-blue-50 text-blue-600 border-blue-200" },
  IN_PROGRESS: { label: "В обработке", color: "bg-blue-50 text-blue-600 border-blue-200" },
  READY: { label: "Завершено", color: "bg-green-50 text-green-600 border-green-200" },
  EXPIRED: { label: "Истекло", color: "bg-red-50 text-red-600 border-red-200" },
  DISPUTE: { label: "Спор", color: "bg-purple-50 text-purple-600 border-purple-200" },
  CANCELED: { label: "Отменено", color: "bg-gray-50 text-gray-600 border-gray-200" },
}

export function DealsTable() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("active")
  const [, forceUpdate] = useState(0) // Force component re-render for countdown
  
  useEffect(() => {
    fetchTransactions()
  }, [])
  
  // Timer for countdown update
  useEffect(() => {
    const timer = setInterval(() => {
      forceUpdate(prev => prev + 1)
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])
  
  const fetchTransactions = async () => {
    try {
      const response = await traderApi.getTransactions()
      setTransactions(response.transactions || [])
    } catch (error) {
      console.error("Failed to fetch transactions:", error)
      toast.error("Не удалось загрузить сделки")
    } finally {
      setLoading(false)
    }
  }
  
  const getFilteredTransactions = () => {
    switch (activeTab) {
      case "active":
        return transactions.filter(t => ["CREATED", "IN_PROGRESS"].includes(t.status))
      case "completed":
        return transactions.filter(t => t.status === "READY")
      case "disputes":
        return transactions.filter(t => t.status === "DISPUTE")
      default:
        return transactions
    }
  }
  
  const filteredTransactions = getFilteredTransactions()
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#006039]" />
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Последние сделки</h1>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-fit grid grid-cols-4 gap-1 bg-gray-100 p-1 mb-6">
          <TabsTrigger 
            value="active" 
            className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm px-4"
          >
            Активные
            {transactions.filter(t => ["CREATED", "IN_PROGRESS"].includes(t.status)).length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-[#006039] text-white rounded-full">
                {transactions.filter(t => ["CREATED", "IN_PROGRESS"].includes(t.status)).length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="completed"
            className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm px-4"
          >
            Завершенные
          </TabsTrigger>
          <TabsTrigger 
            value="disputes"
            className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm px-4"
          >
            Споры
          </TabsTrigger>
          <TabsTrigger 
            value="all"
            className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm px-4"
          >
            Все
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-0">
          <Card className="overflow-hidden shadow-sm border-gray-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b">
                  <TableHead className="font-medium text-gray-600 text-sm">ID</TableHead>
                  <TableHead className="font-medium text-gray-600 text-sm">Создано</TableHead>
                  <TableHead className="font-medium text-gray-600 text-sm">Обновлено</TableHead>
                  <TableHead className="font-medium text-gray-600 text-sm">Банк</TableHead>
                  <TableHead className="font-medium text-gray-600 text-sm">Сумма</TableHead>
                  <TableHead className="font-medium text-gray-600 text-sm">ФИО</TableHead>
                  <TableHead className="font-medium text-gray-600 text-sm">Статус</TableHead>
                  <TableHead className="font-medium text-gray-600 text-sm text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                      Сделки не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => {
                    const statusInfo = statusConfig[transaction.status as keyof typeof statusConfig] || statusConfig.CREATED
                    
                    return (
                      <TableRow key={transaction.id} className="hover:bg-gray-50/50">
                        <TableCell className="font-medium text-sm">
                          {transaction.numericId}
                        </TableCell>
                        <TableCell className="text-gray-600 text-sm">
                          {format(new Date(transaction.createdAt), "HH:mm:ss dd.MM.yyyy")}
                        </TableCell>
                        <TableCell className="text-gray-600 text-sm">
                          {transaction.acceptedAt ? format(new Date(transaction.acceptedAt), "HH:mm:ss dd.MM.yyyy") : '-'}
                        </TableCell>
                        <TableCell className="text-sm">{transaction.assetOrBank}</TableCell>
                        <TableCell className="font-medium text-sm">
                          {transaction.amount.toLocaleString('ru-RU')}
                        </TableCell>
                        <TableCell className="text-sm">{transaction.clientName}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "border font-medium text-xs",
                              statusInfo.color
                            )}
                          >
                            {(transaction.status === 'CREATED' || transaction.status === 'IN_PROGRESS')
                              ? formatRemainingTime(transaction.expired_at)
                              : statusInfo.label
                            }
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-gray-100 h-8 w-8 p-0"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
            {filteredTransactions.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-600">
                Найдено {filteredTransactions.length} записей
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}