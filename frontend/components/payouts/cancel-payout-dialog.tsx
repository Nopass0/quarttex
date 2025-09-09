"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { 
  AlertCircle,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Loader2
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { traderApiInstance } from "@/services/api"

interface CancelPayoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payoutId: string
  onSuccess?: () => void
}

const CANCEL_REASONS = [
  { value: "incorrect_details", label: "Неверные реквизиты" },
  { value: "suspicious_transaction", label: "Подозрительная транзакция" },
  { value: "insufficient_funds", label: "Недостаточно средств" },
  { value: "technical_issue", label: "Техническая проблема" },
  { value: "client_request", label: "По запросу клиента" },
  { value: "other", label: "Другая причина" }
]

interface UploadedFile {
  id: string
  url: string
  name: string
  size: number
  type: string
}

export function CancelPayoutDialog({ 
  open, 
  onOpenChange, 
  payoutId,
  onSuccess 
}: CancelPayoutDialogProps) {
  const [reasonCode, setReasonCode] = useState("")
  const [reasonText, setReasonText] = useState("")
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    // Validate file count
    if (files.length + selectedFiles.length > 10) {
      toast.error("Максимум 10 файлов")
      return
    }

    setUploading(true)
    const formData = new FormData()
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      
      // Validate file size (20MB max)
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`Файл ${file.name} слишком большой (макс. 20MB)`)
        continue
      }
      
      formData.append("files", file)
    }

    try {
      const response = await traderApiInstance.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })

      const uploadedFiles = response.data.files.map((file: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        url: file.url,
        name: file.originalname,
        size: file.size,
        type: file.mimetype
      }))

      setFiles(prev => [...prev, ...uploadedFiles])
      toast.success(`Загружено ${uploadedFiles.length} файл(ов)`)
    } catch (error) {
      toast.error("Ошибка загрузки файлов")
    } finally {
      setUploading(false)
    }
  }

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const handleCancel = async () => {
    if (!reasonCode) {
      toast.error("Выберите причину отмены")
      return
    }

    if (reasonCode === "other" && !reasonText.trim()) {
      toast.error("Укажите причину отмены")
      return
    }

    const reason = reasonCode === "other" 
      ? reasonText 
      : CANCEL_REASONS.find(r => r.value === reasonCode)?.label || reasonText

    setCancelling(true)
    try {
      await traderApiInstance.post(`/trader/payouts/${payoutId}/cancel`, {
        reason,
        reasonCode,
        files: files.map(f => f.url)
      })

      toast.success("Выплата успешно отменена")
      onOpenChange(false)
      onSuccess?.()
      
      // Reset form
      setReasonCode("")
      setReasonText("")
      setFiles([])
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Не удалось отменить выплату")
    } finally {
      setCancelling(false)
    }
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return ImageIcon
    return FileText
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            Отмена выплаты
          </DialogTitle>
          <DialogDescription>
            Укажите причину отмены выплаты ${payoutId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Reason Selection */}
          <div>
            <Label htmlFor="reason">Причина отмены</Label>
            <Select value={reasonCode} onValueChange={setReasonCode}>
              <SelectTrigger id="reason" className="mt-2">
                <SelectValue placeholder="Выберите причину" />
              </SelectTrigger>
              <SelectContent>
                {CANCEL_REASONS.map(reason => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Reason Text */}
          {reasonCode === "other" && (
            <div>
              <Label htmlFor="reason-text">Опишите причину</Label>
              <Textarea
                id="reason-text"
                placeholder="Укажите подробную причину отмены..."
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                className="mt-2 min-h-[100px]"
              />
            </div>
          )}

          {/* File Upload */}
          <div>
            <Label>Подтверждающие документы (опционально)</Label>
            <Card className="mt-2 p-4 border-dashed">
              <div className="text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  disabled={uploading}
                />
                <label
                  htmlFor="file-upload"
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors",
                    "bg-gray-100 hover:bg-gray-200 text-gray-700",
                    uploading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Загрузка...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Загрузить файлы
                    </>
                  )}
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  Макс. 10 файлов, до 20MB каждый
                </p>
              </div>

              {/* Uploaded Files */}
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map(file => {
                    const Icon = getFileIcon(file.type)
                    return (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                      >
                        <Icon className="h-4 w-4 text-gray-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => removeFile(file.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Warning */}
          <Card className="p-4 border-orange-200 bg-orange-50/50">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
              <div className="text-sm text-orange-800">
                <p className="font-medium mb-1">Внимание!</p>
                <p>После отмены выплата вернется в общий пул и может быть взята другим трейдером.</p>
              </div>
            </div>
          </Card>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={cancelling}
          >
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={!reasonCode || cancelling}
          >
            {cancelling ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Отмена...
              </>
            ) : (
              "Отменить выплату"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}