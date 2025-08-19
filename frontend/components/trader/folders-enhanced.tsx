"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { traderApi } from "@/services/api"
import {
  Folder,
  FolderOpen,
  Plus,
  ChevronRight,
  ChevronDown,
  Play,
  Pause,
  CreditCard,
  Loader2,
  Edit,
  Trash2,
  Settings,
  PlayCircle,
  PauseCircle,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUrlModal } from "@/hooks/use-url-modal"

interface Requisite {
  id: string
  cardNumber: string
  bankType: string
  recipientName: string
  isActive: boolean
  isArchived: boolean
  totalAmountLimit: number
  currentTotalAmount: number
  activeDeals?: number
  folderId?: string
}

interface Folder {
  id: string
  title: string
  requisites: Requisite[]
  isExpanded?: boolean
}

export function FoldersEnhanced() {
  const [folders, setFolders] = useState<Folder[]>([])
  const [requisites, setRequisites] = useState<Requisite[]>([])
  const [loading, setLoading] = useState(true)
  const createFolderModal = useUrlModal({
    modalName: "create-folder",
    onClose: () => {
      setNewFolderName("")
      setSelectedRequisites([])
    }
  })
  
  const editFolderModal = useUrlModal({
    modalName: "edit-folder",
    onClose: () => {
      setSelectedFolder(null)
      setEditFolderName("")
      setEditSelectedRequisites([])
    }
  })
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null)
  const [newFolderName, setNewFolderName] = useState("")
  const [selectedRequisites, setSelectedRequisites] = useState<string[]>([])
  const [editFolderName, setEditFolderName] = useState("")
  const [editSelectedRequisites, setEditSelectedRequisites] = useState<string[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch folders and requisites in parallel
      const [foldersResponse, requisitesResponse] = await Promise.all([
        traderApi.getFolders(),
        traderApi.getRequisites()
      ])
      
      const foldersData = foldersResponse.data || foldersResponse.folders || foldersResponse || []
      const requisitesData = requisitesResponse.data || requisitesResponse.requisites || requisitesResponse || []
      
      // Transform the data to match our interface
      const transformedFolders = Array.isArray(foldersData) ? foldersData.map((folder: any) => ({
        id: folder.id,
        title: folder.title,
        requisites: (folder.requisites || []).map((req: any) => {
          // Handle the nested structure from API: requisites[].requisite
          if (req.requisite) {
            return req.requisite;
          }
          // If it's already a requisite object with cardNumber
          if (req.cardNumber) {
            return req;
          }
          // Fallback: find the full requisite data by id
          const fullRequisite = requisitesData.find((r: any) => r.id === (req.requisiteId || req.id));
          return fullRequisite || req;
        }).filter(r => r && r.id) // Filter out any null/undefined requisites
      })) : []
      
      setRequisites(Array.isArray(requisitesData) ? requisitesData : [])
      setFolders(transformedFolders)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Не удалось загрузить данные")
    } finally {
      setLoading(false)
    }
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error("Введите название папки")
      return
    }

    if (selectedRequisites.length === 0) {
      toast.error("Выберите хотя бы один реквизит")
      return
    }

    try {
      const response = await traderApi.createFolder({
        title: newFolderName,
        requisiteIds: selectedRequisites
      })
      
      // Refresh data to get updated folders
      await fetchData()
      
      toast.success("Папка создана")
      createFolderModal.close()
    } catch (error) {
      toast.error("Не удалось создать папку")
    }
  }

  const handleUpdateFolder = async () => {
    if (!selectedFolder) return

    if (!editFolderName.trim()) {
      toast.error("Введите название папки")
      return
    }

    if (editSelectedRequisites.length === 0) {
      toast.error("Выберите хотя бы один реквизит")
      return
    }

    try {
      await traderApi.updateFolder(selectedFolder.id, {
        title: editFolderName,
        requisiteIds: editSelectedRequisites
      })
      
      // Refresh data to get updated folders
      await fetchData()
      
      toast.success("Папка обновлена")
      editFolderModal.close()
    } catch (error) {
      toast.error("Не удалось обновить папку")
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await traderApi.deleteFolder(folderId)
      setFolders(folders.filter(f => f.id !== folderId))
      toast.success("Папка удалена")
    } catch (error) {
      toast.error("Не удалось удалить папку")
    }
  }

  const handleToggleAllRequisites = async (folderId: string, activate: boolean) => {
    try {
      const folder = folders.find(f => f.id === folderId)
      if (!folder) return

      // Archive/unarchive all requisites in folder
      for (const requisite of folder.requisites) {
        await traderApi.archiveRequisite(requisite.id, !activate)
      }
      
      // Update local state
      const updatedFolders = folders.map(f => {
        if (f.id === folderId) {
          return {
            ...f,
            requisites: f.requisites.map(r => ({ ...r, isArchived: !activate, isActive: activate }))
          }
        }
        return f
      })
      
      setFolders(updatedFolders)
      toast.success(activate ? "Все реквизиты запущены" : "Все реквизиты остановлены")
    } catch (error) {
      toast.error("Не удалось изменить статус реквизитов")
    }
  }

  const handleToggleRequisite = async (requisiteId: string, activate: boolean) => {
    try {
      // Archive/unarchive requisite
      await traderApi.archiveRequisite(requisiteId, !activate)
      
      const updatedFolders = folders.map(folder => ({
        ...folder,
        requisites: folder.requisites.map(r => 
          r.id === requisiteId ? { ...r, isActive: activate, isArchived: !activate } : r
        )
      }))
      
      setFolders(updatedFolders)
      toast.success(activate ? "Реквизит запущен" : "Реквизит остановлен")
    } catch (error) {
      toast.error("Не удалось изменить статус реквизита")
    }
  }

  const getUnassignedRequisites = () => {
    const assignedIds = new Set(
      folders.flatMap(f => 
        f.requisites
          .filter(r => r && r.id)
          .map(r => r.id)
      )
    )
    return requisites.filter(r => r && r.id && !assignedIds.has(r.id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-[#006039]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold dark:text-[#eeeeee]">Папки реквизитов</h1>
        <Button
          onClick={() => createFolderModal.open()}
          className="bg-[#006039] hover:bg-[#006039]/90 dark:bg-[#2d6a42] dark:hover:bg-[#2d6a42]/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Создать папку
        </Button>
      </div>

      {/* Folders List */}
      <div className="space-y-4">
        {folders.length === 0 ? (
          <Card className="p-8 text-center text-gray-500 dark:text-gray-400 dark:bg-[#29382f] dark:border-gray-700">
            <Folder className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="dark:text-gray-400">Нет созданных папок</p>
            <p className="text-sm mt-2 dark:text-gray-500">Создайте папку для группировки реквизитов</p>
          </Card>
        ) : (
          folders.map((folder) => {
            const isExpanded = expandedFolders.has(folder.id)
            const activeCount = folder.requisites.filter(r => !r.isArchived).length
            const totalCount = folder.requisites.length

            return (
              <Card key={folder.id} className="overflow-hidden dark:bg-[#29382f] dark:border-gray-700">
                <Collapsible open={isExpanded} onOpenChange={() => toggleFolder(folder.id)}>
                  <div className="p-4 hover:bg-gray-50 dark:hover:bg-[#29382f]/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <CollapsibleTrigger className="flex items-center gap-3 flex-1 text-left">
                        {isExpanded ? (
                          <>
                            <FolderOpen className="h-6 w-6 text-[#006039] dark:text-[#2d6a42]" />
                            <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          </>
                        ) : (
                          <>
                            <Folder className="h-6 w-6 text-[#006039] dark:text-[#2d6a42]" />
                            <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          </>
                        )}
                        <div>
                          <h3 className="font-semibold dark:text-[#eeeeee]">{folder.title}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {totalCount} реквизитов • {activeCount} активных
                          </p>
                        </div>
                      </CollapsibleTrigger>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleAllRequisites(folder.id, true)}
                          disabled={activeCount === totalCount}
                          className="dark:border-gray-600 dark:hover:bg-[#29382f]/50"
                        >
                          <PlayCircle className="h-4 w-4 mr-1 text-green-600 dark:text-green-500" />
                          Запустить все
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleAllRequisites(folder.id, false)}
                          disabled={activeCount === 0}
                          className="dark:border-gray-600 dark:hover:bg-[#29382f]/50"
                        >
                          <PauseCircle className="h-4 w-4 mr-1 text-red-600 dark:text-red-500" />
                          Остановить все
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedFolder(folder)
                            setEditFolderName(folder.title)
                            setEditSelectedRequisites(
                              folder.requisites
                                .filter(r => r && r.id)
                                .map(r => r.id)
                            )
                            editFolderModal.open()
                          }}
                          className="dark:hover:bg-[#29382f]/50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteFolder(folder.id)}
                          className="dark:hover:bg-[#29382f]/50"
                        >
                          <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <CollapsibleContent>
                    <div className="border-t dark:border-gray-700">
                      {folder.requisites.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                          <p>В папке нет реквизитов</p>
                        </div>
                      ) : (
                        <div className="divide-y dark:divide-gray-700">
                          {folder.requisites.map((requisite) => (
                            <div key={requisite.id} className="p-4 hover:bg-gray-50 dark:hover:bg-[#29382f]/30">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <CreditCard className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                                  <div>
                                    <div className="font-medium dark:text-[#eeeeee]">
                                      {requisite.cardNumber}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                      {requisite.bankType} • {requisite.recipientName}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <div className="text-sm dark:text-[#eeeeee]">
                                      Лимит: {(requisite.currentTotalAmount || 0).toLocaleString()} / {(requisite.totalAmountLimit || 0).toLocaleString()} ₽
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      Активные: {(requisite.activeDeals || 0)}
                                    </div>
                                  </div>
                                  
                                  <Badge
                                    variant={!requisite.isArchived ? "success" : "secondary"}
                                    className={cn(
                                      "min-w-[80px] justify-center",
                                      !requisite.isArchived 
                                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" 
                                        : "dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                                    )}
                                  >
                                    {!requisite.isArchived ? "Активен" : "Архивирован"}
                                  </Badge>
                                  
                                  <Switch
                                    checked={!requisite.isArchived}
                                    onCheckedChange={(checked) => handleToggleRequisite(requisite.id, checked)}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )
          })
        )}
      </div>

      {/* Unassigned Requisites */}
      {getUnassignedRequisites().length > 0 && (
        <Card className="p-4 dark:bg-[#29382f] dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
            <h3 className="font-semibold dark:text-[#eeeeee]">Реквизиты без папки</h3>
          </div>
          <div className="space-y-2">
            {getUnassignedRequisites().map((requisite) => (
              <div key={requisite.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#29382f]/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-sm dark:text-[#eeeeee]">{requisite.cardNumber}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{requisite.bankType}</span>
                </div>
                <Badge variant="outline" className="text-xs dark:border-gray-600 dark:text-gray-300">
                  Не назначен
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Create Folder Dialog */}
      <Dialog open={createFolderModal.isOpen} onOpenChange={createFolderModal.setOpen}>
        <DialogContent className="dark:bg-[#29382f] dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="dark:text-[#eeeeee]">Создать папку</DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              Создайте папку для группировки реквизитов
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="folder-name" className="dark:text-[#eeeeee]">Название папки</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Например, Основные карты"
                className="dark:bg-[#0f0f0f] dark:border-gray-600 dark:text-[#eeeeee] dark:placeholder-gray-500"
              />
            </div>
            
            <div>
              <Label className="dark:text-[#eeeeee]">Выберите реквизиты</Label>
              <div className="border dark:border-gray-600 rounded-lg max-h-60 overflow-y-auto p-3 space-y-2 dark:bg-[#0f0f0f]">
                {requisites.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    Нет доступных реквизитов
                  </p>
                ) : (
                  requisites.map((requisite) => (
                    <label
                      key={requisite.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-[#29382f]/30 rounded cursor-pointer"
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
                        className="dark:border-gray-600 dark:data-[state=checked]:bg-[#2d6a42] dark:data-[state=checked]:border-[#2d6a42]"
                      />
                      <CreditCard className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <div className="flex-1">
                        <div className="text-sm font-medium dark:text-[#eeeeee]">{requisite.cardNumber}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {requisite.bankType} • {requisite.recipientName}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => createFolderModal.close()}
              className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-[#29382f]/50"
            >
              Отмена
            </Button>
            <Button
              onClick={handleCreateFolder}
              className="bg-[#006039] hover:bg-[#006039]/90 dark:bg-[#2d6a42] dark:hover:bg-[#2d6a42]/90"
              disabled={!newFolderName.trim() || selectedRequisites.length === 0}
            >
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Folder Dialog */}
      <Dialog open={editFolderModal.isOpen} onOpenChange={editFolderModal.setOpen}>
        <DialogContent className="dark:bg-[#29382f] dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="dark:text-[#eeeeee]">Редактировать папку</DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              Измените название папки и состав реквизитов
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-folder-name" className="dark:text-[#eeeeee]">Название папки</Label>
              <Input
                id="edit-folder-name"
                value={editFolderName}
                onChange={(e) => setEditFolderName(e.target.value)}
                placeholder="Например, Основные карты"
                className="dark:bg-[#0f0f0f] dark:border-gray-600 dark:text-[#eeeeee] dark:placeholder-gray-500"
              />
            </div>
            
            <div>
              <Label className="dark:text-[#eeeeee]">Выберите реквизиты</Label>
              <div className="border dark:border-gray-600 rounded-lg max-h-60 overflow-y-auto p-3 space-y-2 dark:bg-[#0f0f0f]">
                {requisites.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    Нет доступных реквизитов
                  </p>
                ) : (
                  requisites.map((requisite) => (
                    <label
                      key={requisite.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-[#29382f]/30 rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={editSelectedRequisites.includes(requisite.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setEditSelectedRequisites([...editSelectedRequisites, requisite.id])
                          } else {
                            setEditSelectedRequisites(editSelectedRequisites.filter(id => id !== requisite.id))
                          }
                        }}
                        className="dark:border-gray-600 dark:data-[state=checked]:bg-[#2d6a42] dark:data-[state=checked]:border-[#2d6a42]"
                      />
                      <CreditCard className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <div className="flex-1">
                        <div className="text-sm font-medium dark:text-[#eeeeee]">{requisite.cardNumber}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {requisite.bankType} • {requisite.recipientName}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => editFolderModal.close()}
              className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-[#29382f]/50"
            >
              Отмена
            </Button>
            <Button
              onClick={handleUpdateFolder}
              className="bg-[#006039] hover:bg-[#006039]/90 dark:bg-[#2d6a42] dark:hover:bg-[#2d6a42]/90"
              disabled={!editFolderName.trim() || editSelectedRequisites.length === 0}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}