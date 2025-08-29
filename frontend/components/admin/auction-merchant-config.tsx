"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Key, 
  Download, 
  Copy, 
  RefreshCw, 
  Settings, 
  ExternalLink,
  Shield,
  Loader2,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";

interface AuctionMerchantConfigProps {
  merchantId: string;
  merchantName: string;
  adminToken: string;
}

interface AuctionConfig {
  isAuctionEnabled: boolean;
  auctionBaseUrl?: string;
  auctionCallbackUrl?: string;
  externalSystemName?: string;
  hasKeys: boolean;
  keysGeneratedAt?: string;
  publicKeyPreview?: string;
}

interface KeyGenerationResult {
  success: boolean;
  publicKey: string;
  privateKey: string;
  warning: string;
}

export function AuctionMerchantConfig({ 
  merchantId, 
  merchantName, 
  adminToken 
}: AuctionMerchantConfigProps) {
  const [config, setConfig] = useState<AuctionConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);
  const [showKeysDialog, setShowKeysDialog] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState<KeyGenerationResult | null>(null);
  
  // Форма настроек
  const [formData, setFormData] = useState({
    isAuctionEnabled: false,
    auctionBaseUrl: "",
    auctionCallbackUrl: "",
    externalSystemName: ""
  });

  useEffect(() => {
    fetchAuctionConfig();
  }, [merchantId]);

  const fetchAuctionConfig = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/auction/status/${merchantId}`,
        {
          headers: {
            "x-admin-key": adminToken,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const auctionConfig = data.config || data.merchant;
        
        setConfig(auctionConfig);
        setFormData({
          isAuctionEnabled: auctionConfig.isAuctionEnabled || false,
          auctionBaseUrl: auctionConfig.auctionBaseUrl || "",
          auctionCallbackUrl: auctionConfig.auctionCallbackUrl || "",
          externalSystemName: auctionConfig.externalSystemName || ""
        });
      }
    } catch (error) {
      console.error("Failed to fetch auction config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAuction = async () => {
    try {
      setIsToggling(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/auction/toggle/${merchantId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminToken,
          },
          body: JSON.stringify({
            enabled: formData.isAuctionEnabled,
            auctionBaseUrl: formData.auctionBaseUrl,
            auctionCallbackUrl: formData.auctionCallbackUrl,
            externalSystemName: formData.externalSystemName
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        toast.success(
          formData.isAuctionEnabled 
            ? "Аукционный режим включен" 
            : "Аукционный режим выключен"
        );
        await fetchAuctionConfig();
      } else {
        const error = await response.text();
        toast.error(`Ошибка: ${error}`);
      }
    } catch (error) {
      toast.error("Не удалось обновить настройки");
    } finally {
      setIsToggling(false);
    }
  };

  const handleGenerateKeys = async () => {
    if (!config?.isAuctionEnabled) {
      toast.error("Сначала включите аукционный режим");
      return;
    }

    try {
      setIsGeneratingKeys(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/auction/generate-keys/${merchantId}`,
        {
          method: "POST",
          headers: {
            "x-admin-key": adminToken,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        setGeneratedKeys(result);
        setShowKeysDialog(true);
        toast.success("RSA ключи успешно сгенерированы");
        await fetchAuctionConfig();
      } else {
        const error = await response.text();
        toast.error(`Ошибка генерации ключей: ${error}`);
      }
    } catch (error) {
      toast.error("Не удалось сгенерировать ключи");
    } finally {
      setIsGeneratingKeys(false);
    }
  };

  const handleDownloadKey = async (keyType: "public" | "private") => {
    try {
      // Используем сгенерированные ключи из состояния если они есть
      if (generatedKeys) {
        const keyContent = keyType === "public" ? generatedKeys.publicKey : generatedKeys.privateKey;
        
        // Создаем blob и скачиваем
        const blob = new Blob([keyContent], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${merchantName.replace(/[^a-zA-Z0-9]/g, "_")}_${keyType}_key.pem`;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        toast.success(`${keyType === "public" ? "Публичный" : "Приватный"} ключ скачан`);
        return;
      }

      // Если ключей в состоянии нет, показываем предупреждение
      if (keyType === "private") {
        toast.error("Приватный ключ доступен только при генерации. Нажмите 'Сгенерировать ключи' для получения нового приватного ключа.");
        return;
      }

      // Для публичного ключа пробуем прямое скачивание
      toast.info("Для скачивания существующих ключей обратитесь к администратору или сгенерируйте новые ключи.");
      
      // Можно добавить инструкцию как получить ключи
      console.log("Для получения существующих ключей используйте backend API напрямую или сгенерируйте новые ключи");

    } catch (error) {
      console.error("Download error:", error);
      toast.error("Ошибка скачивания ключа");
    }
  };

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast.success(message);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Аукционная система
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Аукционная система
            {config?.isAuctionEnabled && (
              <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                Включена
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Настройка интеграции с внешними аукционными системами через RSA подпись
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Переключатель аукционного режима */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">
                Работает по системе аукциона
              </Label>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Включить интеграцию с внешними аукционными системами
              </div>
            </div>
            <Switch
              checked={formData.isAuctionEnabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isAuctionEnabled: checked })
              }
            />
          </div>

          {formData.isAuctionEnabled && (
            <>
              <Separator />
              
              {/* Настройки URL */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="baseUrl">Base API URL *</Label>
                  <Input
                    id="baseUrl"
                    placeholder="https://partner.example.com/api"
                    value={formData.auctionBaseUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, auctionBaseUrl: e.target.value })
                    }
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Базовый URL API внешней аукционной системы
                  </div>
                </div>

                <div>
                  <Label htmlFor="callbackUrl">Callback URL</Label>
                  <Input
                    id="callbackUrl"
                    placeholder="https://partner.example.com/callback"
                    value={formData.auctionCallbackUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, auctionCallbackUrl: e.target.value })
                    }
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    URL для отправки callback'ов (опционально, иначе используется Base URL + /callback)
                  </div>
                </div>

                <div>
                  <Label htmlFor="systemName">Имя внешней системы *</Label>
                  <Input
                    id="systemName"
                    placeholder="partner-auction-system"
                    value={formData.externalSystemName}
                    onChange={(e) =>
                      setFormData({ ...formData, externalSystemName: e.target.value })
                    }
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Уникальное имя внешней системы для RSA подписи
                  </div>
                </div>
              </div>

              <Separator />

              {/* RSA ключи */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">RSA ключи</Label>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      2048-битные ключи для подписи запросов
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {config?.hasKeys ? (
                      <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Ключи созданы
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Ключи не созданы
                      </Badge>
                    )}
                  </div>
                </div>

                {config?.keysGeneratedAt && (
                  <div className="text-xs text-gray-500">
                    Созданы: {new Date(config.keysGeneratedAt).toLocaleString('ru-RU')}
                  </div>
                )}

                {/* Показываем публичный ключ для копирования */}
                {config?.hasKeys && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Публичный ключ (для передачи партнеру)</Label>
                    <div className="flex items-center gap-2">
                      <textarea
                        readOnly
                        value={generatedKeys?.publicKey || config?.publicKeyPreview || "Ключ будет доступен после генерации"}
                        className="w-full h-32 p-2 text-xs font-mono bg-purple-50/30 dark:bg-gray-900 border rounded resize-none whitespace-pre"
                        placeholder="Публичный ключ появится здесь после генерации..."
                        style={{ 
                          fontFamily: 'monospace',
                          lineHeight: '1.2',
                          overflow: 'auto',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all'
                        }}
                        onFocus={(e) => e.target.select()} // Выделяем весь текст при фокусе
                      />
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const fullKey = generatedKeys?.publicKey || config?.publicKeyPreview || "";
                            console.log("Copying key, length:", fullKey.length);
                            copyToClipboard(fullKey, "Публичный ключ скопирован в буфер обмена");
                          }}
                          disabled={!(generatedKeys?.publicKey || config?.publicKeyPreview)}
                          title="Скопировать полный публичный ключ"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {(generatedKeys?.publicKey || config?.publicKeyPreview) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const keyContent = generatedKeys?.publicKey || config?.publicKeyPreview || "";
                              const blob = new Blob([keyContent], { type: "text/plain" });
                              const url = URL.createObjectURL(blob);
                              
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = `${merchantName.replace(/[^a-zA-Z0-9]/g, "_")}_public_key.pem`;
                              link.style.display = 'none';
                              
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              
                              URL.revokeObjectURL(url);
                              toast.success("Публичный ключ скачан");
                            }}
                            title="Скачать публичный ключ как файл"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Передайте этот публичный ключ партнеру для настройки RSA подписи
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleGenerateKeys}
                    disabled={isGeneratingKeys}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isGeneratingKeys ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Генерация...
                      </>
                    ) : (
                      <>
                        <Key className="h-4 w-4 mr-2" />
                        {config?.hasKeys ? "Перегенерировать ключи" : "Сгенерировать ключи"}
                      </>
                    )}
                  </Button>

                  {generatedKeys && (
                    <Button
                      variant="outline"
                      onClick={() => handleDownloadKey("private")}
                      className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-300"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Скачать приватный ключ
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Кнопка сохранения */}
          <div className="flex justify-end">
            <Button
              onClick={handleToggleAuction}
              disabled={isToggling}
              className={
                formData.isAuctionEnabled
                  ? "bg-[#530FAD] hover:bg-purple-800/60"
                  : "bg-gray-600 hover:bg-gray-700"
              }
            >
              {isToggling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4 mr-2" />
                  Сохранить настройки
                </>
              )}
            </Button>
          </div>

          {/* Информация о статусе */}
          {config?.isAuctionEnabled && (
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="space-y-2">
                  <div className="font-medium text-blue-900 dark:text-blue-100">
                    Аукционный режим активен
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    Этот мерчант интегрирован с внешней аукционной системой.
                    Все заказы обрабатываются через RSA подпись.
                  </div>
                  <div className="flex items-center gap-4 text-xs text-blue-600 dark:text-blue-400">
                    <span>📡 Base URL: {config.auctionBaseUrl || "не указан"}</span>
                    <span>📞 Callback URL: {config.auctionCallbackUrl || "не указан"}</span>
                    <span>🏷️ System: {config.externalSystemName || "не указано"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog для показа сгенерированных ключей */}
      <Dialog open={showKeysDialog} onOpenChange={setShowKeysDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              RSA ключи сгенерированы
            </DialogTitle>
            <DialogDescription>
              Ключи для подписи аукционных запросов. Сохраните их в безопасном месте.
            </DialogDescription>
          </DialogHeader>
          
          {generatedKeys && (
            <div className="space-y-6">
              {/* Предупреждение */}
              <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-yellow-900 dark:text-yellow-100">
                      Важно!
                    </div>
                    <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      {generatedKeys.warning}
                    </div>
                  </div>
                </div>
              </div>

              {/* Публичный ключ */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Публичный ключ (передайте партнеру)</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generatedKeys.publicKey, "Публичный ключ скопирован")}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Копировать
                  </Button>
                </div>
                <textarea
                  readOnly
                  value={generatedKeys.publicKey}
                  className="w-full h-24 p-3 text-xs font-mono bg-purple-50/30 dark:bg-gray-900 border rounded resize-none"
                />
              </div>

              {/* Приватный ключ */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Приватный ключ (храните в секрете)</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generatedKeys.privateKey, "Приватный ключ скопирован")}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Копировать
                  </Button>
                </div>
                <textarea
                  readOnly
                  value={generatedKeys.privateKey}
                  className="w-full h-32 p-3 text-xs font-mono bg-purple-50/30 dark:bg-gray-900 border rounded resize-none"
                />
              </div>

              {/* Кнопки скачивания */}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadKey("public")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Скачать публичный
                </Button>
                <Button
                  variant="outline" 
                  onClick={() => handleDownloadKey("private")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Скачать приватный
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
