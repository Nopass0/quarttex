"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { getFileUrl } from "@/lib/file-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { traderApi } from "@/services/api";
import {
  Loader2,
  Send,
  Paperclip,
  X,
  FileText,
  Image,
  Download,
  Clock,
  User,
  Shield,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DisputeMessage {
  id: string;
  senderId: string;
  senderType: "TRADER" | "MERCHANT" | "ADMIN";
  message: string;
  createdAt: string;
  attachments?: {
    id: string;
    filename: string;
    url: string;
    size: number;
    mimeType: string;
  }[];
}

interface DisputeDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dispute: {
    id: string;
    type: "deal" | "payout";
    status: string;
    amount: number;
    currency?: string;
    transactionId?: string;
    payoutId?: string;
    reason?: string;
    createdAt: string;
    merchantName?: string;
  } | null;
}

const statusConfig = {
  OPEN: { 
    label: "Открыт", 
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: AlertCircle 
  },
  IN_PROGRESS: { 
    label: "На рассмотрении", 
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: Clock 
  },
  RESOLVED_SUCCESS: { 
    label: "Решен в вашу пользу", 
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle2 
  },
  RESOLVED_FAIL: { 
    label: "Решен не в вашу пользу", 
    color: "bg-red-100 text-red-800 border-red-200",
    icon: XCircle 
  },
  CANCELLED: { 
    label: "Отменен", 
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: X 
  },
};

export function DisputeDetailDialog({
  open,
  onOpenChange,
  dispute,
}: DisputeDetailDialogProps) {
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Mock messages for demonstration
  const mockMessages: DisputeMessage[] = [
    {
      id: "1",
      senderId: "merchant123",
      senderType: "MERCHANT",
      message: "Платеж не был получен на счет. Прошу предоставить подтверждение оплаты.",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "2",
      senderId: "trader123",
      senderType: "TRADER",
      message: "Платеж был отправлен. Прикладываю скриншот из банковского приложения.",
      createdAt: new Date(Date.now() - 3000000).toISOString(),
      attachments: [
        {
          id: "att1",
          filename: "payment_screenshot.png",
          url: "/api/files/payment_screenshot.png",
          size: 245678,
          mimeType: "image/png",
        },
      ],
    },
    {
      id: "3",
      senderId: "admin123",
      senderType: "ADMIN",
      message: "Спор принят на рассмотрение. Ожидайте решения в течение 24 часов.",
      createdAt: new Date(Date.now() - 1800000).toISOString(),
    },
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files).filter(file => {
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`Файл ${file.name} слишком большой. Максимум 10MB`);
          return false;
        }
        // Check file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
          toast.error(`Файл ${file.name} имеет неподдерживаемый формат`);
          return false;
        }
        return true;
      });
      setAttachments([...attachments, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) {
      toast.error("Введите сообщение или прикрепите файл");
      return;
    }

    if (!dispute) return;

    try {
      setSendingMessage(true);
      
      const formData = new FormData();
      formData.append("message", newMessage);
      
      attachments.forEach((file, index) => {
        formData.append(`files`, file);
      });

      await traderApi.sendDisputeMessage(dispute.id, formData);
      
      toast.success("Сообщение отправлено");
      setNewMessage("");
      setAttachments([]);
      
      // Refresh messages
      // fetchMessages();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Не удалось отправить сообщение");
    } finally {
      setSendingMessage(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return Image;
    return FileText;
  };

  if (!dispute) return null;

  const status = statusConfig[dispute.status as keyof typeof statusConfig] || statusConfig.OPEN;
  const StatusIcon = status.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            Спор ${dispute.type === "deal" ? dispute.transactionId : dispute.payoutId}
          </DialogTitle>
          <DialogDescription>
            <div className="flex items-center gap-4 mt-2">
              <Badge className={cn("border", status.color)}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
              <span className="text-sm">
                {dispute.merchantName && `${dispute.merchantName} • `}
                {dispute.amount} {dispute.currency || "₽"}
              </span>
              <span className="text-sm text-gray-500">
                {format(new Date(dispute.createdAt), "d MMMM yyyy 'в' HH:mm", { locale: ru })}
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-[calc(90vh-200px)]">
          {/* Messages */}
          <ScrollArea className="flex-1 border rounded-lg p-4 mb-4">
            <div className="space-y-4">
              {mockMessages.map((message) => {
                const isMerchant = message.senderType === "MERCHANT";
                const isAdmin = message.senderType === "ADMIN";
                const isTrader = message.senderType === "TRADER";

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      isTrader && "flex-row-reverse"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-full",
                      isMerchant && "bg-purple-100",
                      isAdmin && "bg-gray-100",
                      isTrader && "bg-green-100"
                    )}>
                      {isMerchant && <User className="h-4 w-4 text-purple-600" />}
                      {isAdmin && <Shield className="h-4 w-4 text-gray-600" />}
                      {isTrader && <User className="h-4 w-4 text-green-600" />}
                    </div>
                    
                    <div className={cn(
                      "flex-1 space-y-2",
                      isTrader && "items-end"
                    )}>
                      <div className={cn(
                        "rounded-lg p-3 max-w-[80%]",
                        isMerchant && "bg-purple-50 text-purple-900",
                        isAdmin && "bg-gray-50 text-gray-900",
                        isTrader && "bg-green-50 text-green-900 ml-auto"
                      )}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">
                            {isMerchant && "Мерчант"}
                            {isAdmin && "Администратор"}
                            {isTrader && "Вы"}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(message.createdAt), "HH:mm")}
                          </span>
                        </div>
                        <p className="text-sm">{message.message}</p>
                        
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {message.attachments.map((attachment) => {
                              const FileIcon = getFileIcon(attachment.mimeType);
                              return (
                                <a
                                  key={attachment.id}
                                  href={getFileUrl(attachment.url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-2 rounded bg-white/50 hover:bg-white/80 transition-colors"
                                >
                                  <FileIcon className="h-4 w-4" />
                                  <span className="text-xs flex-1 truncate">
                                    {attachment.filename}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatFileSize(attachment.size)}
                                  </span>
                                  <Download className="h-3 w-3" />
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Input area */}
          {dispute.status === "OPEN" || dispute.status === "IN_PROGRESS" ? (
            <div className="space-y-3">
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg text-sm"
                    >
                      <FileText className="h-4 w-4" />
                      <span className="truncate max-w-[150px]">{file.name}</span>
                      <button
                        onClick={() => removeAttachment(index)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Введите сообщение..."
                    className="pr-10 min-h-[80px]"
                    disabled={sendingMessage}
                  />
                  <label className="absolute bottom-2 right-2 cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={sendingMessage}
                    />
                    <Paperclip className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  </label>
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || (!newMessage.trim() && attachments.length === 0)}
                  className="bg-[#006039] hover:bg-[#006039]/90"
                >
                  {sendingMessage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <p>Спор закрыт</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}