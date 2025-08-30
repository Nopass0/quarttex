"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { merchantApi } from "@/services/api";
import { formatAmount } from "@/lib/utils";
import { 
  Loader2, 
  AlertCircle,
  Upload,
  X,
  FileText,
  Image,
  Paperclip,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  numericId: number;
  amount: number;
  status: string;
  createdAt: string;
  method?: {
    name: string;
  };
  orderId?: string;
}

interface CreateDisputeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  onSuccess?: () => void;
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export function CreateDisputeDialog({
  open,
  onOpenChange,
  transaction,
  onSuccess
}: CreateDisputeDialogProps) {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    addFiles(selectedFiles);
  };

  const addFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`Файл ${file.name} превышает максимальный размер 20MB`);
        return false;
      }
      return true;
    });

    if (files.length + validFiles.length > MAX_FILES) {
      toast.error(`Максимальное количество файлов: ${MAX_FILES}`);
      return;
    }

    setFiles([...files, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  };

  const handleSubmit = async () => {
    if (!transaction || !message.trim()) {
      toast.error("Пожалуйста, опишите проблему");
      return;
    }

    try {
      setCreating(true);

      const formData = new FormData();
      formData.append("message", message);
      
      // Append files only if there are any
      if (files.length > 0) {
        files.forEach(file => {
          formData.append("files", file);
        });
      }

      console.log("Creating dispute for deal ID:", transaction.id);
      const response = await merchantApi.createDealDispute(transaction.id, formData);

      // API returns { success: true, dispute: {...} }
      if (response && response.success && response.dispute) {
        toast.success("Спор успешно создан");
        onOpenChange(false);
        setMessage("");
        setFiles([]);
        onSuccess?.();
      } else {
        throw new Error("Unexpected response format");
      }
    } catch (error: any) {
      console.error("Failed to create dispute:", error);
      if (error.response?.status === 404) {
        console.error("404 Error - URL not found:", error.config?.url);
        console.error("Request method:", error.config?.method);
      }
      toast.error(error.response?.data?.error || "Не удалось создать спор");
    } finally {
      setCreating(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Создание спора</DialogTitle>
          <DialogDescription>
            Опишите проблему и приложите подтверждающие документы
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-1">
          <div className="space-y-6">
            {/* Transaction info */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Транзакция</span>
                <Badge variant="outline">#{transaction.numericId}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Сумма</span>
                <span className="font-medium">{formatAmount(transaction.amount)} ₽</span>
              </div>
              {transaction.method && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Метод</span>
                  <span className="text-sm">{transaction.method.name}</span>
                </div>
              )}
              {transaction.orderId && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Order ID</span>
                  <span className="text-sm font-mono">{transaction.orderId}</span>
                </div>
              )}
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Перед созданием спора
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Убедитесь, что вы проверили все детали транзакции и попытались решить вопрос напрямую с трейдером.
                  </p>
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Опишите проблему *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Подробно опишите суть проблемы..."
                className="min-h-[120px]"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Минимум 10 символов
              </p>
            </div>

            {/* File upload */}
            <div className="space-y-2">
              <Label>Прикрепить файлы</Label>
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="file-upload"
                  className="sr-only"
                  multiple
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8 text-gray-400" />
                  <div className="text-sm">
                    <span className="font-medium text-primary">Нажмите для загрузки</span>
                    <span className="text-gray-500 dark:text-gray-400"> или перетащите файлы сюда</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Максимум {MAX_FILES} файлов, до 20MB каждый
                  </p>
                </label>
              </div>

              {/* Attached files */}
              {files.length > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="text-sm font-medium">
                    Прикрепленные файлы ({files.length})
                  </p>
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        {getFileIcon(file)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={creating}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={creating || !message.trim() || message.length < 10}
          >
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Создать спор
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}