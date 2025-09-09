"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Copy, AlertCircle, CheckCircle, Key, Link } from "lucide-react";
import { toast } from "sonner";

interface AggregatorModeSettingsProps {
  merchantId: string;
  token: string;
}

export function AggregatorModeSettings({ merchantId, token }: AggregatorModeSettingsProps) {
  const [isAggregatorMode, setIsAggregatorMode] = useState(false);
  const [externalApiToken, setExternalApiToken] = useState("");
  const [externalCallbackToken, setExternalCallbackToken] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://chasepay.pro/api";
  
  useEffect(() => {
    fetchMerchantSettings();
  }, [merchantId]);
  
  const fetchMerchantSettings = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/merchant/profile`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsAggregatorMode(data.isAggregatorMode || false);
        setExternalApiToken(data.externalApiToken || "");
        setExternalCallbackToken(data.externalCallbackToken || "");
      }
    } catch (error) {
      console.error("Failed to fetch merchant settings:", error);
      toast.error("Не удалось загрузить настройки");
    } finally {
      setIsLoading(false);
    }
  };
  
  const generateToken = () => {
    const token = `ext_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
    return token;
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const response = await fetch(`${apiBaseUrl}/merchant/settings/aggregator-mode`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          isAggregatorMode,
          externalApiToken: isAggregatorMode ? externalApiToken : null,
          externalCallbackToken: isAggregatorMode ? externalCallbackToken : null
        })
      });
      
      if (response.ok) {
        toast.success("Настройки сохранены");
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Не удалось сохранить настройки");
    } finally {
      setIsSaving(false);
    }
  };
  
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} скопирован в буфер обмена`);
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Режим агрегатора</CardTitle>
        <CardDescription>
          Настройте прием платежей от внешних систем через агрегаторский API
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-2">
          <Switch
            id="aggregator-mode"
            checked={isAggregatorMode}
            onCheckedChange={setIsAggregatorMode}
          />
          <Label htmlFor="aggregator-mode">
            Включить режим агрегатора
          </Label>
        </div>
        
        {isAggregatorMode && (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Важно</AlertTitle>
              <AlertDescription>
                В режиме агрегатора ваша система может принимать заявки от внешних платформ
                через специальный API. Убедитесь, что токены хранятся в безопасности.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-token">API токен для входящих запросов</Label>
                <div className="flex space-x-2">
                  <Input
                    id="api-token"
                    type="text"
                    value={externalApiToken}
                    onChange={(e) => setExternalApiToken(e.target.value)}
                    placeholder="Введите или сгенерируйте токен"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExternalApiToken(generateToken())}
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Генерировать
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(externalApiToken, "API токен")}
                    disabled={!externalApiToken}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="callback-token">Токен для отправки колбэков</Label>
                <div className="flex space-x-2">
                  <Input
                    id="callback-token"
                    type="text"
                    value={externalCallbackToken}
                    onChange={(e) => setExternalCallbackToken(e.target.value)}
                    placeholder="Введите или сгенерируйте токен"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExternalCallbackToken(generateToken())}
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Генерировать
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(externalCallbackToken, "Callback токен")}
                    disabled={!externalCallbackToken}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="border rounded-lg p-4 bg-muted/50">
              <h4 className="font-semibold mb-3 flex items-center">
                <Link className="h-4 w-4 mr-2" />
                Endpoints для интеграции
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Создание сделки:</span>
                  <div className="flex items-center space-x-2">
                    <code className="bg-background px-2 py-1 rounded">
                      POST {apiBaseUrl}/external/aggregator/deals
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(`${apiBaseUrl}/external/aggregator/deals`, "URL")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Информация о сделке:</span>
                  <div className="flex items-center space-x-2">
                    <code className="bg-background px-2 py-1 rounded">
                      GET {apiBaseUrl}/external/aggregator/deals/:id
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(`${apiBaseUrl}/external/aggregator/deals/{id}`, "URL")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Отмена сделки:</span>
                  <div className="flex items-center space-x-2">
                    <code className="bg-background px-2 py-1 rounded">
                      POST {apiBaseUrl}/external/aggregator/deals/:id/cancel
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(`${apiBaseUrl}/external/aggregator/deals/{id}/cancel`, "URL")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Создание спора:</span>
                  <div className="flex items-center space-x-2">
                    <code className="bg-background px-2 py-1 rounded">
                      POST {apiBaseUrl}/external/aggregator/deals/:id/disputes
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(`${apiBaseUrl}/external/aggregator/deals/{id}/disputes`, "URL")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Заголовки авторизации</AlertTitle>
              <AlertDescription className="text-green-700">
                Используйте один из следующих заголовков для авторизации:
                <ul className="mt-2 space-y-1">
                  <li><code>Authorization: Bearer {"{token}"}</code></li>
                  <li><code>x-aggregator-token: {"{token}"}</code></li>
                  <li><code>x-api-token: {"{token}"}</code></li>
                </ul>
              </AlertDescription>
            </Alert>
          </>
        )}
        
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving || (isAggregatorMode && (!externalApiToken || !externalCallbackToken))}
          >
            {isSaving ? "Сохранение..." : "Сохранить настройки"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}