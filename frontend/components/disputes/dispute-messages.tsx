"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { getFileUrl } from "@/lib/file-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { 
  Send,
  Paperclip,
  Download,
  FileText,
  Image,
  Loader2,
  X,
  User,
  Shield,
  Building2
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

interface DisputeMessagesProps {
  disputeId: string;
  messages: DisputeMessage[];
  userType: "trader" | "merchant";
  userId: string;
  onMessageSent?: (message: DisputeMessage) => void;
  api: any; // trader or merchant API instance
}

export function DisputeMessages({
  disputeId,
  messages,
  userType,
  userId,
  onMessageSent,
  api
}: DisputeMessagesProps) {
  const [newMessage, setNewMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) {
      return;
    }

    try {
      setSending(true);

      const formData = new FormData();
      formData.append("message", newMessage);
      
      attachments.forEach(file => {
        formData.append("files", file);
      });

      // Both trader and merchant APIs use the same method name
      const response = await api.sendDealDisputeMessage(disputeId, formData);

      if (response.success) {
        setNewMessage("");
        setAttachments([]);
        onMessageSent?.(response.message);
        toast.success("Сообщение отправлено");
      }
    } catch (error: any) {
      console.error("Failed to send message:", error);
      toast.error("Не удалось отправить сообщение");
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`Файл ${file.name} превышает максимальный размер 20MB`);
        return false;
      }
      return true;
    });

    if (attachments.length + validFiles.length > 10) {
      toast.error("Максимальное количество файлов: 10");
      return;
    }

    setAttachments([...attachments, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const getSenderInfo = (msg: DisputeMessage) => {
    const isOwnMessage = msg.senderId === userId;
    
    switch (msg.senderType) {
      case "TRADER":
        return {
          name: "Трейдер",
          icon: User,
          color: "bg-blue-500",
          align: userType === "trader" && isOwnMessage ? "right" : "left"
        };
      case "MERCHANT":
        return {
          name: "Мерчант",
          icon: Building2,
          color: "bg-green-500",
          align: userType === "merchant" && isOwnMessage ? "right" : "left"
        };
      case "ADMIN":
        return {
          name: "Администратор",
          icon: Shield,
          color: "bg-purple-500",
          align: "center"
        };
      default:
        return {
          name: "Система",
          icon: Shield,
          color: "bg-gray-500",
          align: "center"
        };
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return Image;
    }
    return FileText;
  };

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg, index) => {
            const senderInfo = getSenderInfo(msg);
            const Icon = senderInfo.icon;
            const isOwnMessage = msg.senderId === userId;

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3",
                  senderInfo.align === "right" && "justify-end",
                  senderInfo.align === "center" && "justify-center"
                )}
              >
                {senderInfo.align === "left" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={senderInfo.color}>
                      <Icon className="h-4 w-4 text-white" />
                    </AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={cn(
                    "max-w-[70%] space-y-2",
                    senderInfo.align === "center" && "max-w-[90%]"
                  )}
                >
                  {/* Header */}
                  {senderInfo.align !== "center" && (
                    <div className={cn(
                      "flex items-center gap-2 text-xs",
                      senderInfo.align === "right" && "justify-end"
                    )}>
                      <span className="font-medium">{senderInfo.name}</span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {format(new Date(msg.createdAt), "HH:mm", { locale: ru })}
                      </span>
                    </div>
                  )}

                  {/* Message bubble */}
                  <div
                    className={cn(
                      "rounded-lg p-3",
                      senderInfo.align === "center"
                        ? "bg-gray-100 dark:bg-gray-800 text-center"
                        : isOwnMessage
                        ? "bg-primary text-primary-foreground"
                        : "bg-gray-100 dark:bg-gray-800"
                    )}
                  >
                    {senderInfo.align === "center" && (
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Icon className="h-4 w-4" />
                        <span className="font-medium">{senderInfo.name}</span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {msg.message}
                    </p>
                  </div>

                  {/* Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="space-y-1">
                      {msg.attachments.map((attachment) => {
                        const FileIcon = getFileIcon(attachment.mimeType);
                        return (
                          <a
                            key={attachment.id}
                            href={getFileUrl(attachment.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-lg text-sm hover:opacity-80 transition-opacity",
                              isOwnMessage
                                ? "bg-primary/20"
                                : "bg-gray-100 dark:bg-gray-800"
                            )}
                          >
                            <FileIcon className="h-4 w-4 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="truncate font-medium">{attachment.filename}</p>
                              <p className="text-xs opacity-70">
                                {formatFileSize(attachment.size)}
                              </p>
                            </div>
                            <Download className="h-4 w-4 flex-shrink-0" />
                          </a>
                        );
                      })}
                    </div>
                  )}

                  {/* Date separator for first message or new day */}
                  {(index === 0 || 
                    new Date(msg.createdAt).toDateString() !== 
                    new Date(messages[index - 1].createdAt).toDateString()) && (
                    <div className="flex items-center gap-2 my-4">
                      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                      <span className="text-xs text-gray-500 dark:text-gray-400 px-2">
                        {format(new Date(msg.createdAt), "d MMMM yyyy", { locale: ru })}
                      </span>
                      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    </div>
                  )}
                </div>

                {senderInfo.align === "right" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={senderInfo.color}>
                      <Icon className="h-4 w-4 text-white" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="p-3 border-t">
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-sm"
              >
                <Paperclip className="h-3 w-3" />
                <span className="max-w-[150px] truncate">{file.name}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Введите сообщение..."
            disabled={sending}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
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
    </div>
  );
}