"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Plus,
  Folder,
  Play,
  Pause,
  MoreVertical,
  Edit2,
  Trash2,
  CreditCard,
  Smartphone,
  ChevronDown,
  ArrowUpDown,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { TraderHeader } from "@/components/trader/trader-header"
import { traderApi } from "@/services/api"
import { useDebounce } from "@/hooks/use-debounce"

interface Requisite {
  id: string
  bankType: string
  cardNumber: string
  recipientName: string
  minAmount: number
  maxAmount: number
  isArchived: boolean
  device?: {
    id: string
    name: string
    isOnline: boolean
  }
}

interface Folder {
  id: string
  title: string
  createdAt: string
  isActive: boolean
  requisites: {
    requisite: Requisite
  }[]
}

export function FoldersList() {
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null)
  const [folderTitle, setFolderTitle] = useState("")
  const [selectedRequisites, setSelectedRequisites] = useState<string[]>([])
  const [availableRequisites, setAvailableRequisites] = useState<Requisite[]>([])
  const [testModalOpen, setTestModalOpen] = useState(false)
  
  const debouncedSearch = useDebounce(searchQuery, 500)

  useEffect(() => {
    fetchFolders()
  }, [currentPage, debouncedSearch])

  useEffect(() => {
    fetchRequisites()
  }, [])

  const fetchFolders = async () => {
    try {
      setLoading(true)
      const response = await traderApi.getFolders({
        page: currentPage,
        limit: 20,
        search: debouncedSearch
      })
      setFolders(response.data)
      setTotalPages(response.pagination.totalPages)
    } catch (error) {
      console.error("Failed to fetch folders:", error)
      toast.error("Не удалось загрузить папки")
    } finally {
      setLoading(false)
    }
  }

  const fetchRequisites = async () => {
    try {
      const response = await traderApi.getRequisites()
      // Handle both possible response formats
      const requisites = response.bankDetails || response.data || response || []
      setAvailableRequisites(Array.isArray(requisites) ? requisites : [])
    } catch (error) {
      console.error("Failed to fetch requisites:", error)
      toast.error("Не удалось загрузить реквизиты")
    }
  }

  const handleCreateFolder = async () => {
    if (!folderTitle.trim()) {
      toast.error("Введите название папки")
      return
    }

    if (selectedRequisites.length === 0) {
      toast.error("Выберите хотя бы один реквизит")
      return
    }

    try {
      await traderApi.createFolder({
        title: folderTitle,
        requisiteIds: selectedRequisites
      })
      toast.success("Папка создана")
      setCreateModalOpen(false)
      setFolderTitle("")
      setSelectedRequisites([])
      fetchFolders()
    } catch (error) {
      console.error("Failed to create folder:", error)
      toast.error("Не удалось создать папку")
    }
  }

  const handleUpdateFolder = async () => {
    if (!selectedFolder) return

    try {
      await traderApi.updateFolder(selectedFolder.id, {
        title: folderTitle,
        requisiteIds: selectedRequisites
      })
      toast.success("Папка обновлена")
      setEditModalOpen(false)
      setSelectedFolder(null)
      setFolderTitle("")
      setSelectedRequisites([])
      fetchFolders()
    } catch (error) {
      console.error("Failed to update folder:", error)
      toast.error("Не удалось обновить папку")
    }
  }

  const handleDeleteFolder = async () => {
    if (!selectedFolder) return

    try {
      await traderApi.deleteFolder(selectedFolder.id)
      toast.success("Папка удалена")
      setDeleteModalOpen(false)
      setSelectedFolder(null)
      fetchFolders()
    } catch (error) {
      console.error("Failed to delete folder:", error)
      toast.error("Не удалось удалить папку")
    }
  }

  const handleStartAll = async (folderId: string) => {
    try {
      await traderApi.startAllRequisitesInFolder(folderId)
      toast.success("Все реквизиты в папке запущены")
      fetchFolders()
    } catch (error) {
      console.error("Failed to start all requisites:", error)
      toast.error("Не удалось запустить реквизиты")
    }
  }

  const handleStopAll = async (folderId: string) => {
    try {
      await traderApi.stopAllRequisitesInFolder(folderId)
      toast.success("Все реквизиты в папке остановлены")
      fetchFolders()
    } catch (error) {
      console.error("Failed to stop all requisites:", error)
      toast.error("Не удалось остановить реквизиты")
    }
  }

  const openEditModal = useCallback((folder: Folder) => {
    setSelectedFolder(folder)
    setFolderTitle(folder.title)
    setSelectedRequisites(folder.requisites.map(r => r.requisite.id))
    setCreateModalOpen(false)
    setEditModalOpen(true)
  }, [])

  const openDeleteModal = (folder: Folder) => {
    setSelectedFolder(folder)
    setDeleteModalOpen(true)
  }

  const getBankLogo = (bankType: string) => {
    return `/bank-logos/${bankType.toLowerCase()}.svg`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Папки</h1>
          <p className="text-muted-foreground mt-1">
            Управление группами реквизитов
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TraderHeader />
          <Button 
            variant="outline"
            onClick={() => setTestModalOpen(true)}
          >
            Test Modal
          </Button>
          <Button 
            className="bg-[#006039] hover:bg-[#006039]/90 text-white"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Создать папку
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Поиск</Label>
            <div className="mt-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Поиск по названию папки"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Folders Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-64 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {folders.map((folder) => (
            <Card 
              key={folder.id} 
              className={`relative ${!folder.isActive ? 'opacity-60' : ''}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#006039]/10 text-[#006039] rounded-lg">
                      <Folder className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{folder.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {folder.requisites.length} реквизитов
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => openEditModal(folder)}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Редактировать
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => openDeleteModal(folder)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Requisites Preview */}
                <div className="space-y-2 mb-4">
                  {folder.requisites.slice(0, 3).map(({ requisite }) => (
                    <div key={requisite.id} className="flex items-center gap-2 text-sm">
                      <img 
                        src={getBankLogo(requisite.bankType)}
                        alt={requisite.bankType}
                        className="w-4 h-4"
                      />
                      <span className="text-muted-foreground">
                        •••• {requisite.cardNumber.slice(-4)}
                      </span>
                      {requisite.device && (
                        <Badge 
                          variant={requisite.device.isOnline ? "default" : "secondary"}
                          className="text-xs"
                        >
                          <Smartphone className="h-3 w-3 mr-1" />
                          {requisite.device.isOnline ? "Online" : "Offline"}
                        </Badge>
                      )}
                    </div>
                  ))}
                  {folder.requisites.length > 3 && (
                    <p className="text-sm text-muted-foreground">
                      +{folder.requisites.length - 3} еще
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {folder.isActive ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleStopAll(folder.id)}
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Остановить все
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleStartAll(folder.id)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Запустить все
                    </Button>
                  )}
                </div>

                {/* Status Badge */}
                <Badge 
                  variant={folder.isActive ? "default" : "secondary"}
                  className="absolute top-4 right-12"
                >
                  {folder.isActive ? "Активна" : "Неактивна"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && folders.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <Folder className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Папки не найдены</h3>
            <p className="text-muted-foreground mb-4">
              Создайте первую папку для группировки реквизитов
            </p>
            <Button 
              className="bg-[#006039] hover:bg-[#006039]/90 text-white"
              onClick={() => setCreateModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Создать папку
            </Button>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Назад
          </Button>
          <div className="flex items-center gap-2">
            {[...Array(totalPages)].map((_, i) => (
              <Button
                key={i}
                variant={currentPage === i + 1 ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Вперед
          </Button>
        </div>
      )}

      {/* Create Modal */}
      <Dialog 
        open={createModalOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setCreateModalOpen(false)
            setFolderTitle("")
            setSelectedRequisites([])
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Создать папку</DialogTitle>
            <DialogDescription>
              Создайте новую папку и добавьте в нее реквизиты
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="folder-title">Название папки</Label>
              <Input
                id="folder-title"
                placeholder="Введите название папки"
                value={folderTitle}
                onChange={(e) => setFolderTitle(e.target.value)}
              />
            </div>

            <div>
              <Label>Реквизиты</Label>
              <ScrollArea className="h-[300px] border rounded-lg mt-2 p-4">
                <div className="space-y-2">
                  {availableRequisites.map((requisite) => (
                    <label
                      key={requisite.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedRequisites.includes(requisite.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRequisites([...selectedRequisites, requisite.id])
                          } else {
                            setSelectedRequisites(selectedRequisites.filter(id => id !== requisite.id))
                          }
                        }}
                      />
                      <div className="flex items-center gap-3 flex-1">
                        <img 
                          src={getBankLogo(requisite.bankType)}
                          alt={requisite.bankType}
                          className="w-6 h-6"
                        />
                        <div>
                          <p className="font-medium">
                            •••• {requisite.cardNumber.slice(-4)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {requisite.bankType} • {requisite.recipientName}
                          </p>
                        </div>
                      </div>
                      {requisite.device && (
                        <Badge 
                          variant={requisite.device.isOnline ? "default" : "secondary"}
                          className="text-xs"
                        >
                          <Smartphone className="h-3 w-3 mr-1" />
                          {requisite.device.name}
                        </Badge>
                      )}
                    </label>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-sm text-muted-foreground mt-2">
                Выбрано: {selectedRequisites.length} реквизитов
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateModalOpen(false)
                setFolderTitle("")
                setSelectedRequisites([])
              }}
            >
              Отмена
            </Button>
            <Button
              className="bg-[#006039] hover:bg-[#006039]/90 text-white"
              onClick={handleCreateFolder}
              disabled={!folderTitle.trim() || selectedRequisites.length === 0}
            >
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog 
        open={editModalOpen} 
        onOpenChange={(open) => {
          setEditModalOpen(open)
          if (!open) {
            // Clean up state when modal closes
            setSelectedFolder(null)
            setFolderTitle("")
            setSelectedRequisites([])
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактировать папку</DialogTitle>
            <DialogDescription>
              Измените название папки и состав реквизитов
            </DialogDescription>
          </DialogHeader>
          
          {selectedFolder && (
            <div className="text-sm text-gray-500 mb-2">
              Редактирование папки: {selectedFolder.title}
            </div>
          )}
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-folder-title">Название папки</Label>
              <Input
                id="edit-folder-title"
                placeholder="Введите название папки"
                value={folderTitle}
                onChange={(e) => setFolderTitle(e.target.value)}
              />
            </div>

            <div>
              <Label>Реквизиты</Label>
              <ScrollArea className="h-[300px] border rounded-lg mt-2 p-4">
                <div className="space-y-2">
                  {availableRequisites.map((requisite) => (
                    <label
                      key={requisite.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedRequisites.includes(requisite.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRequisites([...selectedRequisites, requisite.id])
                          } else {
                            setSelectedRequisites(selectedRequisites.filter(id => id !== requisite.id))
                          }
                        }}
                      />
                      <div className="flex items-center gap-3 flex-1">
                        <img 
                          src={getBankLogo(requisite.bankType)}
                          alt={requisite.bankType}
                          className="w-6 h-6"
                        />
                        <div>
                          <p className="font-medium">
                            •••• {requisite.cardNumber.slice(-4)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {requisite.bankType} • {requisite.recipientName}
                          </p>
                        </div>
                      </div>
                      {requisite.device && (
                        <Badge 
                          variant={requisite.device.isOnline ? "default" : "secondary"}
                          className="text-xs"
                        >
                          <Smartphone className="h-3 w-3 mr-1" />
                          {requisite.device.name}
                        </Badge>
                      )}
                    </label>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-sm text-muted-foreground mt-2">
                Выбрано: {selectedRequisites.length} реквизитов
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
            >
              Отмена
            </Button>
            <Button
              className="bg-[#006039] hover:bg-[#006039]/90 text-white"
              onClick={handleUpdateFolder}
              disabled={!folderTitle.trim() || selectedRequisites.length === 0}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить папку?</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить папку "{selectedFolder?.title}"? 
              Это действие нельзя отменить. Реквизиты не будут удалены.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteModalOpen(false)
                setSelectedFolder(null)
              }}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteFolder}
            >
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Modal */}
      <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Modal</DialogTitle>
            <DialogDescription>
              This is a simple test modal to check if Dialog works.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>If you can see this, the Dialog component is working.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setTestModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}