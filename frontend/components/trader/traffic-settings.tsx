"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Settings, Users, AlertCircle, CheckCircle } from "lucide-react";
import { traderApi } from "@/services/api";

interface TrafficSettings {
  isEnabled: boolean;
  maxCounterparties: number;
  trafficType: "PRIMARY" | "SECONDARY" | "VIP";
}

const trafficTypeLabels = {
  PRIMARY: "Первичный",
  SECONDARY: "Вторичный", 
  VIP: "VIP"
};

const trafficTypeDescriptions = {
  PRIMARY: "Первая сделка от клиента (новые клиенты)",
  SECONDARY: "2+ сделок от клиента (повторные клиенты)",
  VIP: "10+ сделок от клиента (VIP клиенты)"
};

const trafficTypeColors = {
  PRIMARY: "bg-green-500",
  SECONDARY: "bg-blue-500", 
  VIP: "bg-purple-500"
};

export function TrafficSettings() {
  const [settings, setSettings] = useState<TrafficSettings>({
    isEnabled: false,
    maxCounterparties: 5,
    trafficType: "PRIMARY"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await traderApi.getTrafficSettings();
      if (response?.settings) {
        setSettings(response.settings);
      }
    } catch (error) {
      console.error("Failed to fetch traffic settings:", error);
      toast.error("Не удалось загрузить настройки трафика");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await traderApi.updateTrafficSettings(settings);
      toast.success("Настройки трафика сохранены");
    } catch (error) {
      console.error("Failed to save traffic settings:", error);
      toast.error("Не удалось сохранить настройки трафика");
    } finally {
      setSaving(false);
    }
  };

  const handleSettingsChange = (key: keyof TrafficSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Загрузка настроек...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Settings Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Настройки трафика</CardTitle>
          </div>
          <CardDescription>
            Настройте типы трафика и лимиты контрагентов для получения выплат
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Traffic Filtering */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Включить фильтрацию трафика</Label>
              <p className="text-sm text-muted-foreground">
                Получать ТОЛЬКО сделки с указанным идентификатором клиента определенного типа трафика
              </p>
            </div>
            <Switch
              checked={settings.isEnabled}
              onCheckedChange={(checked) => handleSettingsChange("isEnabled", checked)}
            />
          </div>

          {settings.isEnabled && (
            <>
              {/* Traffic Type Selection */}
              <div className="space-y-3">
                <Label>Тип трафика</Label>
                <Select
                  value={settings.trafficType}
                  onValueChange={(value) => handleSettingsChange("trafficType", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(trafficTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${trafficTypeColors[key as keyof typeof trafficTypeColors]}`} />
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {trafficTypeDescriptions[settings.trafficType]}
                </p>
              </div>

              {/* Max Counterparties */}
              <div className="space-y-3">
                <Label>Максимальное количество контрагентов</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.maxCounterparties}
                  onChange={(e) => handleSettingsChange("maxCounterparties", parseInt(e.target.value) || 1)}
                  className="w-32"
                />
                <p className="text-sm text-muted-foreground">
                  Максимальное количество уникальных клиентов, с которыми вы можете работать одновременно
                </p>
              </div>
            </>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={saveSettings} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить настройки
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <CardTitle>Как работает фильтрация трафика</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              <strong>Важно:</strong> При включенной фильтрации вы будете получать ТОЛЬКО сделки с указанным идентификатором клиента определенного типа трафика. Сделки без clientIdentifier будут отклоняться.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(trafficTypeLabels).map(([key, label]) => (
              <div key={key} className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${trafficTypeColors[key as keyof typeof trafficTypeColors]}`} />
                  <h4 className="font-medium">{label} трафик</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  {trafficTypeDescriptions[key as keyof typeof trafficTypeDescriptions]}
                </p>
              </div>
            ))}
          </div>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Правила фильтрации:</strong><br/>
              • <strong>Отключена</strong> - получаете все сделки (с clientIdentifier и без)<br/>
              • <strong>Включена</strong> - получаете ТОЛЬКО сделки с clientIdentifier выбранного типа трафика
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle>Текущий статус</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant={settings.isEnabled ? "default" : "secondary"}>
              {settings.isEnabled ? "Фильтрация включена" : "Фильтрация отключена"}
            </Badge>
            {settings.isEnabled && (
              <>
                <Badge variant="outline">
                  <div className={`w-2 h-2 rounded-full mr-2 ${trafficTypeColors[settings.trafficType]}`} />
                  {trafficTypeLabels[settings.trafficType]} трафик
                </Badge>
                <Badge variant="outline">
                  До {settings.maxCounterparties} контрагентов
                </Badge>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
