"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useDealDisputeWS } from "@/hooks/use-deal-dispute-ws";
import { 
  Loader2, 
  Send,
  Paperclip,
  X as XIcon,
  Image,
  Download,
  FileText,
  File,
  User,
  Building2,
  Shield,
  Check,
  CheckCheck,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getFileUrl } from "@/lib/file-utils";

interface DisputeMessage {
  id: string;
  senderId: string;
  senderType: "TRADER" | "MERCHANT" | "ADMIN";
  senderName: string;
  message: string;
  createdAt: string;
  isRead?: boolean;
  attachments?: DisputeFile[];
}

interface DisputeFile {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedBy?: string;
  uploadedAt?: string;
}

interface DisputeChatEnhancedProps {
  disputeId: string;
  messages: DisputeMessage[];
  userType: "trader" | "merchant";
  userId: string;
  token?: string;
  onSendMessage: (message: string, files: File[]) => Promise<void>;
  onNewMessage?: (message: DisputeMessage) => void;
  isActive: boolean;
  disputeInfo?: {
    transactionId: string;
    amount: number;
    status: string;
    merchantName?: string;
    traderName?: string;
  };
}

export function DisputeChatEnhanced({
  disputeId,
  messages,
  userType,
  userId,
  token,
  onSendMessage,
  onNewMessage,
  isActive,
  disputeInfo
}: DisputeChatEnhancedProps) {
  const [newMessage, setNewMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // WebSocket connection for real-time updates
  const { isConnected } = useDealDisputeWS({
    disputeId,
    token: token || "",
    userType,
    onNewMessage: (message) => {
      if (onNewMessage && message.senderId !== userId) {
        onNewMessage(message);
      }
    },
    onDisputeResolved: (resolution) => {
      toast.info("Спор был разрешен");
    },
  });

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      // Check total files limit
      if (attachments.length + files.length > 10) {
        toast.error("Максимум 10 файлов");
        return;
      }
      
      const newFiles = Array.from(files).filter(file => {
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`Файл ${file.name} слишком большой. Максимум 20MB`);
          return false;
        }
        return true;
      });
      
      setAttachments([...attachments, ...newFiles]);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!newMessage.trim() && attachments.length === 0) {
      toast.error("Введите сообщение или прикрепите файл");
      return;
    }

    try {
      setSending(true);
      await onSendMessage(newMessage, attachments);
      setNewMessage("");
      setAttachments([]);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Не удалось отправить сообщение");
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
    if (mimeType.includes("pdf")) return FileText;
    return File;
  };

  const downloadFile = async (file: DisputeFile) => {
    try {
      setDownloadingFiles(prev => new Set(prev).add(file.id));
      
      // Use our utility function to get the correct URL
      const downloadUrl = getFileUrl(file.url);
      
      // Open in new tab for preview or download
      window.open(downloadUrl, "_blank");
      
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Не удалось загрузить файл");
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(file.id);
        return newSet;
      });
    }
  };

  const getSenderIcon = (senderType: string) => {
    switch (senderType) {
      case "MERCHANT":
        return <Building2 className="h-4 w-4" />;
      case "ADMIN":
        return <Shield className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getSenderColor = (senderType: string, isCurrentUser: boolean) => {
    if (isCurrentUser) return "bg-primary text-primary-foreground";
    
    switch (senderType) {
      case "MERCHANT":
        return "bg-purple-100 text-purple-900 dark:bg-purple-900/20 dark:text-purple-300";
      case "ADMIN":
        return "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-200";
      default:
        return "bg-green-100 text-green-900 dark:bg-green-900/20 dark:text-green-300";
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      {disputeInfo && (
        <>
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">
                  Спор по сделке #{disputeInfo.transactionId}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {userType === "merchant" && disputeInfo.traderName && (
                    <>{disputeInfo.traderName} • </>
                  )}
                  {(disputeInfo.amount || 0).toLocaleString()} ₽
                </p>
              </div>
              <div className={cn(
                "px-3 py-1 rounded-full text-sm font-medium",
                isActive 
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
              )}>
                {isActive ? "Активный" : "Закрыт"}
              </div>
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Нет сообщений</p>
            </div>
          ) : (
            messages.map((message) => {
              const isCurrentUser = (userType === "trader" && message.senderType === "TRADER") || 
                                  (userType === "merchant" && message.senderType === "MERCHANT");
              
              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    isCurrentUser && "justify-end"
                  )}
                >
                  {!isCurrentUser && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className={cn(
                        "text-xs",
                        message.senderType === "MERCHANT" && "bg-purple-100 dark:bg-purple-900/30",
                        message.senderType === "ADMIN" && "bg-gray-100 dark:bg-gray-800",
                        message.senderType === "TRADER" && "bg-green-100 dark:bg-green-900/30"
                      )}>
                        {getSenderIcon(message.senderType)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={cn(
                    "flex flex-col gap-1 max-w-[70%]",
                    isCurrentUser && "items-end"
                  )}>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium">{message.senderName}</span>
                      <span>{format(new Date(message.createdAt), "HH:mm")}</span>
                    </div>
                    
                    <div className={cn(
                      "rounded-lg px-4 py-2",
                      getSenderColor(message.senderType, isCurrentUser)
                    )}>
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.message}
                      </p>
                      
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.attachments.map((file) => {
                            const FileIcon = getFileIcon(file.mimeType);
                            const isDownloading = downloadingFiles.has(file.id);
                            
                            return (
                              <button
                                key={file.id}
                                onClick={() => downloadFile(file)}
                                disabled={isDownloading}
                                className={cn(
                                  "flex items-center gap-2 w-full p-2 rounded",
                                  "bg-white/20 hover:bg-white/30 dark:bg-black/20 dark:hover:bg-black/30",
                                  "transition-colors text-left group"
                                )}
                              >
                                <FileIcon className="h-4 w-4 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">
                                    {file.filename}
                                  </p>
                                  <p className="text-xs opacity-70">
                                    {formatFileSize(file.size)}
                                  </p>
                                </div>
                                {isDownloading ? (
                                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                                ) : (
                                  <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    {isCurrentUser && (
                      <div className="flex items-center gap-1">
                        {message.isRead ? (
                          <CheckCheck className="h-3 w-3 text-blue-600" />
                        ) : (
                          <Check className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>
                  
                  {isCurrentUser && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      {isActive && (
        <>
          <Separator />
          <div className="p-4 space-y-3">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-md text-sm"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="max-w-[150px] truncate">{file.name}</span>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Введите сообщение..."
                  disabled={sending}
                  className="pr-10"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={sending}
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={sending || (!newMessage.trim() && attachments.length === 0)}
                size="icon"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}