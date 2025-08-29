"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, ExternalLink, Send } from "lucide-react";
import { toast } from "sonner";
import { traderApi } from "@/services/api";

interface TelegramConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TelegramConnectModal({ open, onOpenChange }: TelegramConnectModalProps) {
  const [linkCode, setLinkCode] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate link code when modal opens
  useEffect(() => {
    if (open) {
      generateLinkCode();
    }
  }, [open]);

  const generateLinkCode = async () => {
    setLoading(true);
    try {
      const response = await traderApi.generateTelegramLinkCode();
      setLinkCode(response.linkCode);
    } catch (error) {
      console.error("Failed to generate link code:", error);
      toast.error("Не удалось сгенерировать код привязки");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (linkCode) {
      navigator.clipboard.writeText(linkCode);
      setCopied(true);
      toast.success("Код скопирован в буфер обмена");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openTelegramBot = () => {
    if (linkCode) {
      const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "chase_notifications_bot";
      const url = `https://t.me/${botUsername}?start=${linkCode}`;
      window.open(url, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-[#006039]" />
            Подключение уведомлений в Telegram
          </DialogTitle>
          <DialogDescription>
            Получайте уведомления о новых выплатах, изменениях статусов и спорах в Telegram
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#006039]"></div>
            </div>
          ) : (
            <>
              {/* Step 1 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#006039] text-white flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <h3 className="font-medium">Скопируйте код привязки</h3>
                </div>
                <div className="ml-10 space-y-2">
                  <div className="relative">
                    <Input
                      value={linkCode}
                      readOnly
                      className="pr-24 bg-gray-50 font-mono text-center text-lg"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute right-1 top-1 h-8"
                      onClick={copyCode}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      {copied ? "Скопировано" : "Копировать"}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Код действителен в течение 24 часов
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#006039] text-white flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <h3 className="font-medium">Откройте бота в Telegram</h3>
                </div>
                <div className="ml-10">
                  <Button
                    className="w-full bg-[#0088cc] hover:bg-[#0088cc]/90 text-white"
                    onClick={openTelegramBot}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Открыть в Telegram
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>

              {/* Step 3 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#006039] text-white flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <h3 className="font-medium">Отправьте код боту</h3>
                </div>
                <div className="ml-10">
                  <p className="text-sm text-gray-500">
                    После открытия бота нажмите "Начать" или отправьте ваш код привязки
                  </p>
                </div>
              </div>

              {/* Info box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <p className="text-sm text-blue-800">
                  <strong>Важно:</strong> После успешной привязки вы будете получать уведомления о:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-blue-700 list-disc list-inside">
                  <li>Новых выплатах</li>
                  <li>Изменениях статусов выплат</li>
                  <li>Новых спорах</li>
                  <li>Важных системных уведомлениях</li>
                </ul>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}