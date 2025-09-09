"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Copy, Check, Key, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";

interface WellbitApiTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WellbitApiTestDialog({ open, onOpenChange }: WellbitApiTestDialogProps) {
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [endpoint, setEndpoint] = useState("payment/create");
  const [requestBody, setRequestBody] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [signature, setSignature] = useState("");
  const [copiedSignature, setCopiedSignature] = useState(false);

  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}`
    : 'https://api.example.com';

  // Initialize with random data when dialog opens
  useEffect(() => {
    if (open && !requestBody) {
      const newBody = getDefaultBody(endpoint);
      setRequestBody(JSON.stringify(newBody, null, 2));
    }
  }, [open]);

  // Auto-generate signature when keys or body change
  useEffect(() => {
    if (apiKey && privateKey && requestBody) {
      try {
        JSON.parse(requestBody); // Validate JSON
        generateSignature(requestBody, privateKey).then(sig => {
          setSignature(sig);
        });
      } catch (e) {
        // Invalid JSON, clear signature
        setSignature("");
      }
    } else {
      setSignature("");
    }
  }, [apiKey, privateKey, requestBody]);

  // Generate random data for request bodies
  const generateRandomData = () => {
    const paymentId = Math.floor(Math.random() * 1000000) + 4000000;
    const amount = Math.floor(Math.random() * 5000) + 1000;
    const course = 75 + Math.random() * 10;
    const amountUsdt = amount / course;
    const feePercent = 5 + Math.random() * 3;
    const profit = amount * (1 - feePercent / 100);
    const profitUsdt = profit / course;
    
    return {
      paymentId,
      amount,
      course: parseFloat(course.toFixed(2)),
      amountUsdt: parseFloat(amountUsdt.toFixed(8)),
      feePercent: parseFloat(feePercent.toFixed(1)),
      profit: parseFloat(profit.toFixed(3)),
      profitUsdt: parseFloat(profitUsdt.toFixed(8))
    };
  };

  // Default request bodies for each endpoint
  const getDefaultBody = (endpointType: string) => {
    const randomData = generateRandomData();
    
    switch (endpointType) {
      case "payment/create":
        return {
          payment_id: randomData.paymentId,
          payment_amount: randomData.amount,
          payment_amount_usdt: randomData.amountUsdt,
          payment_amount_profit: randomData.profit,
          payment_amount_profit_usdt: randomData.profitUsdt,
          payment_fee_percent_profit: randomData.feePercent,
          payment_type: Math.random() > 0.5 ? "card" : "sbp",
          payment_bank: ["SBERBANK", "TINKOFF", "VTB", "ALFA"][Math.floor(Math.random() * 4)],
          payment_course: randomData.course,
          payment_lifetime: 720,
          payment_status: "new"
        };
      case "payment/get":
        return {
          payment_id: randomData.paymentId
        };
      case "payment/status":
        return {
          payment_id: randomData.paymentId,
          payment_status: ["new", "complete", "cancel"][Math.floor(Math.random() * 3)]
        };
      default:
        return {};
    }
  };

  // Update request body when endpoint changes
  const handleEndpointChange = (value: string) => {
    setEndpoint(value);
    const newBody = getDefaultBody(value);
    setRequestBody(JSON.stringify(newBody, null, 2));
    setResponse(null);
  };

  // Generate new random data for current endpoint
  const generateNewData = () => {
    const newBody = getDefaultBody(endpoint);
    setRequestBody(JSON.stringify(newBody, null, 2));
    setResponse(null);
  };

  // Generate HMAC signature
  const generateSignature = async (body: string, secret: string) => {
    try {
      // Parse and sort the JSON object
      const parsed = JSON.parse(body);
      const sorted = Object.keys(parsed)
        .sort()
        .reduce((obj, key) => {
          obj[key] = parsed[key];
          return obj;
        }, {} as any);
      
      // Create canonical JSON (no spaces, sorted keys)
      const canonicalJson = JSON.stringify(sorted);
      
      // Generate HMAC-SHA256
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret);
      const messageData = encoder.encode(canonicalJson);
      
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        cryptoKey,
        messageData
      );
      
      // Convert to hex string
      const signatureArray = Array.from(new Uint8Array(signatureBuffer));
      return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error("Error generating signature:", error);
      throw new Error("Failed to generate signature");
    }
  };

  const handleTest = async () => {
    if (!apiKey || !privateKey) {
      toast.error("Пожалуйста, введите публичный и приватный ключи");
      return;
    }

    try {
      setLoading(true);
      setResponse(null);
      
      // Parse request body
      let parsedBody;
      try {
        parsedBody = JSON.parse(requestBody);
      } catch (e) {
        toast.error("Неверный формат JSON");
        return;
      }

      // Check if we have a signature
      if (!signature) {
        toast.error("Подпись не сгенерирована");
        return;
      }

      // Send request
      const res = await fetch(`${baseUrl}/api/wellbit/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "x-api-token": signature,
        },
        body: requestBody,
      });

      const data = await res.json();
      
      setResponse({
        status: res.status,
        statusText: res.statusText,
        data,
        headers: {
          "Content-Type": res.headers.get("Content-Type"),
        },
      });

      if (res.ok) {
        toast.success("Запрос выполнен успешно");
      } else {
        toast.error(`Ошибка: ${res.status} ${res.statusText}`);
      }
    } catch (error) {
      console.error("Test error:", error);
      toast.error("Ошибка при выполнении запроса");
      setResponse({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  const copySignature = () => {
    if (signature) {
      navigator.clipboard.writeText(signature);
      setCopiedSignature(true);
      toast.success("Подпись скопирована");
      setTimeout(() => setCopiedSignature(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Тестирование Wellbit API
          </DialogTitle>
          <DialogDescription>
            Введите ваши API ключи для тестирования интеграции
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* API Keys Input */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">Публичный ключ (x-api-key)</Label>
              <Input
                id="api-key"
                placeholder="Введите публичный ключ"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="private-key">Приватный ключ (для генерации x-api-token)</Label>
              <Input
                id="private-key"
                type="password"
                placeholder="Введите приватный ключ"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
              />
            </div>
          </div>

          {/* Endpoint Selection */}
          <div className="space-y-2">
            <Label>Endpoint</Label>
            <Select value={endpoint} onValueChange={handleEndpointChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="payment/create">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">POST</Badge>
                    /payment/create
                  </div>
                </SelectItem>
                <SelectItem value="payment/get">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">POST</Badge>
                    /payment/get
                  </div>
                </SelectItem>
                <SelectItem value="payment/status">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">POST</Badge>
                    /payment/status
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Request Body */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Request Body</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={generateNewData}
                className="gap-2"
              >
                <RefreshCw className="h-3 w-3" />
                Сгенерировать данные
              </Button>
            </div>
            <Textarea
              value={requestBody}
              onChange={(e) => setRequestBody(e.target.value)}
              className="font-mono text-sm"
              rows={10}
              placeholder="JSON body"
            />
          </div>

          {/* Generated Signature */}
          {apiKey && privateKey && (
            <Alert className={signature ? "" : "border-orange-200 dark:border-orange-800"}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p className="font-medium">
                  {signature ? "Сгенерированная подпись (x-api-token):" : "Введите корректный JSON для генерации подписи"}
                </p>
                {signature && (
                  <div className="flex items-center gap-2">
                    <code className="text-xs break-all flex-1 bg-muted px-2 py-1 rounded">
                      {signature}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copySignature}
                      className="shrink-0"
                    >
                      {copiedSignature ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Response */}
          {response && (
            <div className="space-y-2">
              <Label>Response</Label>
              <div className="bg-muted rounded-lg p-4">
                {response.status && (
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={response.status < 400 ? "success" : "destructive"}>
                      {response.status} {response.statusText}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {response.headers?.["Content-Type"]}
                    </span>
                  </div>
                )}
                <pre className="text-sm overflow-x-auto">
                  <code>
                    {JSON.stringify(response.error || response.data, null, 2)}
                  </code>
                </pre>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleTest} disabled={loading || !apiKey || !privateKey}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Отправка...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Отправить запрос
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}