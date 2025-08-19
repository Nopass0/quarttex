'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
} from '@/components/ui/dialog'
import { 
  Upload, 
  Download, 
  Star, 
  Trash2, 
  FileArchive, 
  Calendar, 
  HardDrive,
  Loader2,
  CheckCircle,
  AlertCircle,
  Copy
} from 'lucide-react'
import { useAdminAuth } from '@/stores/auth'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'

type AppVersion = {
  id: string
  version: string
  description: string | null
  fileUrl: string
  fileName: string
  fileSize: number
  isPrimary: boolean
  uploadedAt: string
  uploadedBy: string
}

export function AppVersionsList() {
  const [versions, setVersions] = useState<AppVersion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [newVersion, setNewVersion] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const { token: adminToken } = useAdminAuth()

  useEffect(() => {
    fetchVersions()
  }, [])

  const fetchVersions = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/app-versions/`, {
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch versions')
      const data = await response.json()
      setVersions(data)
    } catch (error) {
      toast.error('Не удалось загрузить версии приложения')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.apk')) {
        toast.error('Только APK файлы разрешены')
        return
      }
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !newVersion) {
      toast.error('Выберите файл и укажите версию')
      return
    }

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('version', newVersion)
    formData.append('description', newDescription)
    formData.append('uploadedBy', 'admin') // TODO: Use actual admin ID

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/app-versions/upload`, {
        method: 'POST',
        headers: {
          'x-admin-key': adminToken || '',
        },
        body: formData,
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload')
      }
      
      toast.success('Версия успешно загружена')
      setIsUploadDialogOpen(false)
      setSelectedFile(null)
      setNewVersion('')
      setNewDescription('')
      await fetchVersions()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при загрузке версии')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSetPrimary = async (id: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/app-versions/${id}/set-primary`, {
        method: 'PATCH',
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      
      if (!response.ok) throw new Error('Failed to set primary')
      
      toast.success('Основная версия обновлена')
      await fetchVersions()
    } catch (error) {
      toast.error('Не удалось установить основную версию')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту версию?')) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/app-versions/${id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-key': adminToken || '',
        },
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete')
      }
      
      toast.success('Версия удалена')
      await fetchVersions()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить версию')
    }
  }

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(2)} MB`
  }

  const copyDownloadLink = () => {
    const link = `${window.location.origin}/api/app/download-apk`
    navigator.clipboard.writeText(link)
    toast.success('Ссылка скопирована')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-7xl p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Управление приложением</h1>
          <p className="text-sm text-gray-600 mt-1">
            Загружайте новые версии APK и управляйте историей версий
          </p>
        </div>
        <Button
          onClick={() => setIsUploadDialogOpen(true)}
          className="bg-[#006039] hover:bg-[#005030]"
        >
          <Upload className="mr-2 h-4 w-4" />
          Загрузить новую версию
        </Button>
      </div>

      {/* Current Version Card */}
      {versions.find(v => v.isPrimary) && (
        <Card className="p-6 bg-gradient-to-br from-[#006039]/5 to-[#006039]/10 border-[#006039]/20">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-[#006039] flex items-center justify-center">
                  <FileArchive className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    Текущая версия
                    <Badge className="bg-[#006039] text-white">
                      {versions.find(v => v.isPrimary)?.version}
                    </Badge>
                  </h2>
                  <p className="text-sm text-gray-600">
                    {versions.find(v => v.isPrimary)?.description || 'Без описания'}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyDownloadLink}
              >
                <Copy className="mr-2 h-4 w-4" />
                Скопировать ссылку
              </Button>
              <p className="text-xs text-gray-500">
                Загружено {formatDateTime(versions.find(v => v.isPrimary)!.uploadedAt)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Versions Table */}
      <Card>
        <Table>
          <TableCaption>
            Всего версий: {versions.length}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Версия</TableHead>
              <TableHead>Описание</TableHead>
              <TableHead>Размер</TableHead>
              <TableHead>Загружено</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.map((version) => (
              <TableRow key={version.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <FileArchive className="h-4 w-4 text-gray-400" />
                    {version.version}
                  </div>
                </TableCell>
                <TableCell className="max-w-xs">
                  <span className="text-sm text-gray-600 truncate">
                    {version.description || '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <HardDrive className="h-3 w-3 text-gray-400" />
                    {formatFileSize(version.fileSize)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Calendar className="h-3 w-3" />
                      {formatDateTime(version.uploadedAt)}
                    </div>
                    <div className="text-xs text-gray-500">
                      by {version.uploadedBy}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {version.isPrimary ? (
                    <Badge className="bg-[#006039] text-white">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Основная
                    </Badge>
                  ) : (
                    <Badge variant="outline">Архив</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/api${version.fileUrl}`, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {!version.isPrimary && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetPrimary(version.id)}
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(version.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Загрузить новую версию</DialogTitle>
            <DialogDescription>
              Загрузите APK файл новой версии приложения
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="version">Версия</Label>
              <Input
                id="version"
                placeholder="1.0.0"
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Описание (опционально)</Label>
              <Textarea
                id="description"
                placeholder="Исправления ошибок и улучшения"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="file">APK файл</Label>
              <div className="mt-1">
                <Input
                  id="file"
                  type="file"
                  accept=".apk"
                  onChange={handleFileSelect}
                  className="cursor-pointer"
                />
                {selectedFile && (
                  <p className="text-sm text-gray-600 mt-2">
                    Выбран: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsUploadDialogOpen(false)}
              disabled={isUploading}
            >
              Отмена
            </Button>
            <Button
              onClick={handleUpload}
              className="bg-[#006039] hover:bg-[#005030]"
              disabled={isUploading || !selectedFile || !newVersion}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Загрузка...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Загрузить
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}