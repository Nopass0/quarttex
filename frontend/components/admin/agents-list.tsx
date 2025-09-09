'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Search, UserPlus, Trash2, Copy, RefreshCw, MoreHorizontal } from 'lucide-react'
import { useAdminAuth } from '@/stores/auth'
import { formatAmount } from '@/lib/utils'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type Agent = {
  id: string
  name: string
  email: string
  commissionRate: number
  trcWallet: string | null
  tradersCount: number
  totalEarnings: number
  createdAt: string
}

export function AgentsList() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [agents, setAgents] = useState<Agent[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { token: adminToken } = useAdminAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    commissionRate: 5,
    trcWallet: '',
  })

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/agents`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch agents')
      const data = await response.json()
      setAgents(data)
    } catch (error) {
      toast.error('Не удалось загрузить список агентов')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateAgent = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          commissionRate: formData.commissionRate,
          trcWallet: formData.trcWallet || undefined,
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create agent')
      }
      
      const data = await response.json()
      setGeneratedPassword(data.plainPassword)
      setIsCreateDialogOpen(false)
      setShowPasswordDialog(true)
      setFormData({
        name: '',
        email: '',
        commissionRate: 5,
        trcWallet: '',
      })
      await fetchAgents()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось создать агента')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAgent = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого агента?')) return
    
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/agents/${id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      
      if (!response.ok) throw new Error('Failed to delete agent')
      
      await fetchAgents()
      toast.success('Агент удален')
    } catch (error) {
      toast.error('Не удалось удалить агента')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string, message: string = 'Скопировано в буфер обмена') => {
    navigator.clipboard.writeText(text)
    toast.success(message)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#006039]" />
            <Input
              placeholder="Поиск по имени или email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchAgents}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 text-[#006039] ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#006039] hover:bg-[#005030]">
              <UserPlus className="mr-2 h-4 w-4 text-white" />
              Добавить агента
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить нового агента</DialogTitle>
              <DialogDescription>
                Введите данные нового агента. Пароль будет сгенерирован автоматически.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Имя
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="commissionRate" className="text-right">
                  Комиссия %
                </Label>
                <Input
                  id="commissionRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.commissionRate}
                  onChange={(e) => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) || 0 })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="trcWallet" className="text-right">
                  TRC-20 кошелек
                </Label>
                <Input
                  id="trcWallet"
                  value={formData.trcWallet}
                  onChange={(e) => setFormData({ ...formData, trcWallet: e.target.value })}
                  className="col-span-3"
                  placeholder="TRC-20 USDT адрес (необязательно)"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreateAgent}
                className="bg-[#006039] hover:bg-[#005030]"
                disabled={isLoading || !formData.email || !formData.name}
              >
                Создать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && agents.length === 0 ? (
        <div className="flex justify-center items-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-[#006039]" />
        </div>
      ) : (
        <div className="w-full overflow-hidden rounded-lg border">
          <div className="overflow-x-auto">
            <Table>
            <TableCaption>Список всех агентов в системе</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Агент</TableHead>
                <TableHead>Комиссия</TableHead>
                <TableHead>Трейдеры</TableHead>
                <TableHead>Заработано</TableHead>
                <TableHead>TRC-20 кошелек</TableHead>
                <TableHead>Дата регистрации</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgents.map((agent) => (
                <TableRow 
                  key={agent.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/admin/agents/${agent.id}`)}
                >
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{agent.name}</div>
                      <div 
                        className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          copyToClipboard(agent.email, 'Email скопирован')
                        }}
                        title="Нажмите чтобы скопировать email"
                      >
                        {agent.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{agent.commissionRate}%</TableCell>
                  <TableCell>{agent.tradersCount}</TableCell>
                  <TableCell>${formatAmount(agent.totalEarnings)}</TableCell>
                  <TableCell>
                    {agent.trcWallet ? (
                      <div 
                        className="font-mono text-xs cursor-pointer hover:text-gray-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          copyToClipboard(agent.trcWallet!, 'Адрес кошелька скопирован')
                        }}
                        title="Нажмите чтобы скопировать адрес"
                      >
                        {agent.trcWallet.slice(0, 6)}...{agent.trcWallet.slice(-4)}
                      </div>
                    ) : (
                      <span className="text-gray-400">Не указан</span>
                    )}
                  </TableCell>
                  <TableCell>{new Date(agent.createdAt).toLocaleDateString('ru-RU')}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          disabled={isLoading}
                        >
                          <MoreHorizontal className="h-4 w-4 text-[#006039]" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48" align="end">
                        <div className="space-y-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteAgent(agent.id)}
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4 mr-2 text-[#006039]" />
                            Удалить
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </div>
      )}

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Пароль агента</DialogTitle>
            <DialogDescription>
              Сохраните этот пароль - он показывается только один раз!
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-gray-100 p-4 rounded-lg font-mono text-lg text-center relative">
              {generatedPassword}
              <Button
                variant="outline"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => copyToClipboard(generatedPassword)}
              >
                <Copy className="h-4 w-4 text-[#006039]" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowPasswordDialog(false)
                setGeneratedPassword('')
              }}
              className="bg-[#006039] hover:bg-[#005030]"
            >
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}