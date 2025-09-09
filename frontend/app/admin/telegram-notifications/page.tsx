"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import { adminApi } from "@/services/api";
import { toast } from "sonner";
import { Save, Eye, EyeOff, RefreshCw } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AuthLayout } from "@/components/layouts/auth-layout";

interface TelegramSettings {
  botLink: string;
  botUsername: string;
  botToken: string;
}

export default function TelegramNotificationsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<TelegramSettings>({
    botLink: "",
    botUsername: "",
    botToken: "",
  });
  const [originalSettings, setOriginalSettings] = useState<TelegramSettings>({
    botLink: "",
    botUsername: "",
    botToken: "",
  });
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getTelegramSettings();
      // Handle both response.data and direct response
      const data = response.data || response;
      const settingsData = {
        botLink: data.botLink || "",
        botUsername: data.botUsername || "",
        botToken: data.botToken || "",
      };
      setSettings(settingsData);
      setOriginalSettings(settingsData);
    } catch (error) {
      console.error("Failed to fetch telegram settings:", error);
      toast.error("Не удалось загрузить настройки Telegram");
    } finally {
      setLoading(false);
    }
  };

  const validateSettings = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate bot link
    if (settings.botLink) {
      if (!settings.botLink.startsWith("https://")) {
        newErrors.botLink = "Ссылка должна начинаться с https://";
      } else if (!settings.botLink.includes("/bot")) {
        newErrors.botLink = "Ссылка должна содержать /bot";
      }
    }

    // Validate bot username
    if (settings.botUsername) {
      const usernameRegex = /^[a-zA-Z0-9_]{5,32}$/;
      if (!usernameRegex.test(settings.botUsername)) {
        newErrors.botUsername = "Только буквы, цифры и _, от 5 до 32 символов";
      }
    }

    // Validate bot token
    if (settings.botToken && settings.botToken !== "••••••••") {
      const tokenRegex = /^\d{10}:[A-Za-z0-9_-]{35}$/;
      if (!tokenRegex.test(settings.botToken)) {
        newErrors.botToken = "Неверный формат токена бота";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateSettings()) {
      toast.error("Проверьте правильность заполнения полей");
      return;
    }

    setSaving(true);
    try {
      const tokenChanged = settings.botToken !== originalSettings.botToken && 
                          settings.botToken !== "••••••••";
      
      await adminApi.updateTelegramSettings(settings);
      toast.success("Настройки Telegram сохранены");
      
      if (tokenChanged) {
        toast.info("Перезапуск сервиса уведомлений...");
        await adminApi.restartTelegramService();
        toast.success("Сервис уведомлений перезапущен");
      }
      
      // Refresh settings to get masked token
      await fetchSettings();
    } catch (error) {
      console.error("Failed to save telegram settings:", error);
      toast.error("Не удалось сохранить настройки");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof TelegramSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (loading) {
    return (
      <ProtectedRoute variant="admin">
        <AuthLayout variant="admin">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </AuthLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Telegram-уведомления</h1>
            <p className="text-muted-foreground mt-1">
              Настройки бота для отправки уведомлений в Telegram
            </p>
          </div>

      <Card>
        <CardHeader>
          <CardTitle>Настройки бота</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="botLink">Bot link</Label>
            <Input
              id="botLink"
              type="url"
              placeholder="https://t.me/your_bot"
              value={settings.botLink}
              onChange={(e) => handleChange("botLink", e.target.value)}
              className={errors.botLink ? "border-red-500" : ""}
            />
            {errors.botLink && (
              <p className="text-sm text-red-500">{errors.botLink}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Ссылка на бота в Telegram (должна начинаться с https:// и содержать /bot)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="botUsername">Bot username</Label>
            <Input
              id="botUsername"
              type="text"
              placeholder="your_bot_username"
              value={settings.botUsername}
              onChange={(e) => handleChange("botUsername", e.target.value)}
              className={errors.botUsername ? "border-red-500" : ""}
            />
            {errors.botUsername && (
              <p className="text-sm text-red-500">{errors.botUsername}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Имя пользователя бота (без @, только буквы, цифры и _, 5-32 символа)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="botToken">Bot token</Label>
            <div className="relative">
              <Input
                id="botToken"
                type={showToken ? "text" : "password"}
                placeholder="Введите токен бота"
                value={settings.botToken}
                onChange={(e) => handleChange("botToken", e.target.value)}
                className={errors.botToken ? "border-red-500 pr-10" : "pr-10"}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.botToken && (
              <p className="text-sm text-red-500">{errors.botToken}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Токен бота от @BotFather (при изменении сервис будет перезапущен)
            </p>
          </div>

          {settings.botToken !== originalSettings.botToken && settings.botToken !== "••••••••" && (
            <Alert>
              <RefreshCw className="h-4 w-4" />
              <AlertDescription>
                При сохранении сервис Telegram-уведомлений будет автоматически перезапущен
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Сохранить настройки
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
        </div>
      </AuthLayout>
    </ProtectedRoute>
  );
}