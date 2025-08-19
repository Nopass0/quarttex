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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserPlus, Trash2, Copy, RefreshCw, Shield, Edit } from 'lucide-react'
import { useAdminAuth } from '@/stores/auth'
import { toast } from 'sonner'

type Admin = {
  id: string
  token: string
  role: 'SUPER_ADMIN' | 'ADMIN'
  createdAt: string
}

export function AdminsList() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null)
  const [newAdminToken, setNewAdminToken] = useState('')
  const [showTokenDialog, setShowTokenDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { token: adminToken, role: currentRole } = useAdminAuth()
  const [formData, setFormData] = useState({
    role: 'ADMIN' as 'SUPER_ADMIN' | 'ADMIN',
  })

  useEffect(() => {
    fetchAdmins()
  }, [])

  const fetchAdmins = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/admins`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) {
        if (response.status === 403) {
          toast.error('Недостаточно прав для просмотра админов')
          return
        }
        throw new Error('Failed to fetch admins')
      }
      const data = await response.json()
      setAdmins(data)
    } catch (error) {
      toast.error('Не удалось загрузить список админов')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateAdmin = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/create-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({
          role: formData.role,
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create admin')
      }
      
      const data = await response.json()
      setNewAdminToken(data.token)
      setIsCreateDialogOpen(false)
      setShowTokenDialog(true)
      setFormData({ role: 'ADMIN' })
      await fetchAdmins()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось создать админа')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateRole = async (admin: Admin, newRole: 'SUPER_ADMIN' | 'ADMIN') => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/admins/${admin.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminToken || '',
        },
        body: JSON.stringify({
          role: newRole,
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update admin')
      }
      
      await fetchAdmins()
      toast.success('Роль админа обновлена')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось обновить роль')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAdmin = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого админа?')) return
    
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/admins/${id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete admin')
      }
      
      await fetchAdmins()
      toast.success('Админ удален')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить админа')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string, message: string = 'Скопировано в буфер обмена') => {
    navigator.clipboard.writeText(text)
    toast.success(message)
  }

  const openEditDialog = (admin: Admin) => {
    setSelectedAdmin(admin)
    setFormData({ role: admin.role })
    setIsEditDialogOpen(true)
  }

  const handleEditSubmit = () => {
    if (selectedAdmin) {
      handleUpdateRole(selectedAdmin, formData.role)
      setIsEditDialogOpen(false)
    }
  }

  const getCurrentAdmin = () => {
    return admins.find(admin => admin.token === adminToken)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Управление админами</h2>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchAdmins}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#006039] hover:bg-[#005030]">
              <UserPlus className="mr-2 h-4 w-4" />
              Добавить админа
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить нового админа</DialogTitle>
              <DialogDescription>
                Создайте нового администратора с выбранной ролью
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  Роль
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ role: value as 'SUPER_ADMIN' | 'ADMIN' })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Администратор</SelectItem>
                    <SelectItem value="SUPER_ADMIN">Супер-администратор</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreateAdmin}
                className="bg-[#006039] hover:bg-[#005030]"
                disabled={isLoading}
              >
                Создать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && admins.length === 0 ? (
        <div className="flex justify-center items-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="w-full overflow-hidden rounded-lg border">
          <div className="overflow-x-auto">
            <Table>
            <TableCaption>Список всех администраторов системы</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Токен</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Дата создания</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => {
                const isCurrentAdmin = admin.token === adminToken
                return (
                  <TableRow key={admin.id}>
                    <TableCell className="font-mono text-xs">
                      {admin.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {admin.token.slice(0, 20)}...{admin.token.slice(-10)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(admin.token, 'Токен скопирован')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={admin.role === 'SUPER_ADMIN' ? 'destructive' : 'default'}>
                        <Shield className="h-3 w-3 mr-1" />
                        {admin.role === 'SUPER_ADMIN' ? 'Супер-админ' : 'Админ'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(admin.createdAt).toLocaleDateString('ru-RU')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {!isCurrentAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(admin)}
                              disabled={isLoading}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAdmin(admin.id)}
                              disabled={isLoading}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {isCurrentAdmin && (
                          <span className="text-xs text-gray-500">Вы</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          </div>
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить роль админа</DialogTitle>
            <DialogDescription>
              Выберите новую роль для администратора
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-role" className="text-right">
                Роль
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ role: value as 'SUPER_ADMIN' | 'ADMIN' })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Администратор</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Супер-администратор</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleEditSubmit}
              className="bg-[#006039] hover:bg-[#005030]"
              disabled={isLoading}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Токен администратора</DialogTitle>
            <DialogDescription>
              Сохраните этот токен - он показывается только один раз!
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-gray-100 p-4 rounded-lg font-mono text-xs break-all">
              {newAdminToken}
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => copyToClipboard(newAdminToken)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Скопировать токен
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowTokenDialog(false)
                setNewAdminToken('')
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