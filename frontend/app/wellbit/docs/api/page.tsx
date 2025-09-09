"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Code, FileJson, Key, Lock, Send, Clock, CheckCircle, XCircle, RotateCcw, AlertCircle, ExternalLink, TestTube } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { WellbitApiTestDialog } from "@/components/wellbit/api-test-dialog";

export default function WellbitApiDocsPage() {
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}`
    : 'https://api.example.com';

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Wellbit API Documentation</h1>
            <p className="text-lg text-muted-foreground mt-2">
              API документация для интеграции с платежной платформой Wellbit v1.6
            </p>
          </div>
          <Button onClick={() => setTestDialogOpen(true)} className="gap-2">
            <TestTube className="h-4 w-4" />
            Тестировать API
          </Button>
        </div>
      </div>

      {/* General Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Общие положения
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Для работы с API необходимо иметь активный и настроенный API ключ</li>
            <li>Интеграция подразумевает подготовку на вашей стороне определённых эндпоинтов и алгоритмов взаимодействия с Wellbit</li>
            <li>Максимальное время ответа на запрос - 2 секунды</li>
            <li>
              Перед началом работы произведите маппинг справочника банков, справочник банков можете просмотреть тут{" "}
              <a href="https://wellbit.pro/cabinet/cascadedoc/banks" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                https://wellbit.pro/cabinet/cascadedoc/banks
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Авторизация, аутентификация
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Заголовки</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Header</TableHead>
                  <TableHead>Описание</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <code className="bg-muted px-2 py-1 rounded text-sm">x-api-key</code>
                  </TableCell>
                  <TableCell>Публичный ключ API токена</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <code className="bg-muted px-2 py-1 rounded text-sm">x-api-token</code>
                  </TableCell>
                  <TableCell>Токен подписи запроса, сгенерированный на основании приватного ключа API токена</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <code className="bg-muted px-2 py-1 rounded text-sm">Content-Type</code>
                  </TableCell>
                  <TableCell>application/json</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Alert className="mt-4">
              <AlertDescription>
                Все запросы и ответы на запросы происходят исключительно в формате JSON
              </AlertDescription>
            </Alert>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Генерация X-API-TOKEN</h3>
            <p className="text-sm text-muted-foreground mb-4">
              X-API-TOKEN — hash конкатенированной строки состоящей из Private Key и тела запроса
            </p>
            <div className="bg-muted rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm"><code className="language-php">{`//php
/**
* Генерирует HMAC-подпись запроса с сортировкой параметров по алфавиту
*
* @param string $secretKey Секретный ключ (приватный ключ)
* @param mixed $requestBody Тело запроса (массив, объект или строка)
* @param string $algo Алгоритм хеширования (по умолчанию sha256)
* @return string HMAC-подпись
* @throws InvalidArgumentException Если тело запроса не может быть преобразовано в строку
*/
function generateHmacSignatureWithSorting(string $secretKey, $requestBody, string $algo = 'sha256'): string
{
  // Если тело запроса - строка, пытаемся декодировать JSON (если возможно)
  if (is_string($requestBody)) {
      $decoded = json_decode($requestBody, true);
      $requestData = (json_last_error() === JSON_ERROR_NONE) ? $decoded : $requestBody;
  } else {
      $requestData = $requestBody;
  }

  // Если данные - массив или объект, сортируем и преобразуем в JSON-строку
  if (is_array($requestData) || is_object($requestData)) {
      $requestData = (array)$requestData;
      ksort($requestData); // Сортировка по ключам в алфавитном порядке
      $requestString = json_encode($requestData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  } else {
      $requestString = (string)$requestData;
  }

  // Генерируем HMAC-подпись
  return hash_hmac($algo, $requestString, $secretKey);
}

// Пример использования:
$secretKey = 'your_super_secret_key';
$requestData = [
    "payment_id" => 4086997,
    "payment_amount" => 3833,
    "payment_amount_usdt" => 48.42091966,
    "payment_amount_profit" => 3583.855,
    "payment_amount_profit_usdt" => 45.2735598821,
    "payment_fee_percent_profit" => 6.5,
    "payment_type" => "sbp",
    "payment_bank" => null,
    "payment_course" => 79.16,
    "payment_lifetime" => 720,
    "payment_status" => "new"
];

$signature = generateHmacSignatureWithSorting($secretKey, $requestData);
echo "HMAC Signature: " . $signature;`}</code></pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Методы для реализации
          </CardTitle>
          <CardDescription>
            Эндпоинты, которые необходимо реализовать на вашей стороне
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Метод</TableHead>
                <TableHead>Тип запроса</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead>URL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <code className="bg-muted px-2 py-1 rounded text-sm">/payment/create</code>
                </TableCell>
                <TableCell>
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">POST</Badge>
                </TableCell>
                <TableCell>Эндпоинт для приёма запроса на создание платежа</TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-2 py-1 rounded break-all">{baseUrl}/api/wellbit/payment/create</code>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <code className="bg-muted px-2 py-1 rounded text-sm">/payment/get</code>
                </TableCell>
                <TableCell>
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">POST</Badge>
                </TableCell>
                <TableCell>Эндпоинт для предоставления данных платежа</TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-2 py-1 rounded break-all">{baseUrl}/api/wellbit/payment/get</code>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <code className="bg-muted px-2 py-1 rounded text-sm">/payment/status</code>
                </TableCell>
                <TableCell>
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">POST</Badge>
                </TableCell>
                <TableCell>Эндпоинт для установки платежу определённого статуса</TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-2 py-1 rounded break-all">{baseUrl}/api/wellbit/payment/status</code>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* API Endpoints Details */}
      <div className="space-y-6">
        {/* Create Payment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Создание платежа</CardTitle>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">POST</Badge>
              <code className="text-sm bg-muted px-2 py-1 rounded">{baseUrl}/api/wellbit/payment/create</code>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              При запросе реквизита для заявки, вам поступит запрос от Wellbit с данными и в формате, указанном ниже
            </p>
            
            <Tabs defaultValue="request" className="mt-4">
              <TabsList>
                <TabsTrigger value="request">Request</TabsTrigger>
                <TabsTrigger value="response">Response</TabsTrigger>
              </TabsList>
              
              <TabsContent value="request" className="space-y-4">
                <div className="bg-muted rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm"><code className="language-json">{`{
  "payment_id": 4086997,
  "payment_amount": 3833,
  "payment_amount_usdt": 48.42091966,
  "payment_amount_profit": 3583.855,
  "payment_amount_profit_usdt": 45.2735598821,
  "payment_fee_percent_profit": 6.5,
  "payment_type": "sbp",
  "payment_bank": null,
  "payment_course": 79.16,
  "payment_lifetime": 720,
  "payment_status": "new"
}`}</code></pre>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Параметр</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Описание</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell><code>payment_id</code></TableCell>
                      <TableCell>integer</TableCell>
                      <TableCell>ID платежа (уникальный)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><code>payment_amount</code></TableCell>
                      <TableCell>float</TableCell>
                      <TableCell>Сумма платежа в рублях</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><code>payment_amount_usdt</code></TableCell>
                      <TableCell>float</TableCell>
                      <TableCell>Сумма платежа в USDT</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><code>payment_amount_profit</code></TableCell>
                      <TableCell>float</TableCell>
                      <TableCell>Вознаграждение платежа в рублях</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><code>payment_amount_profit_usdt</code></TableCell>
                      <TableCell>float</TableCell>
                      <TableCell>Вознаграждение платежа в USDT</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><code>payment_fee_percent_profit</code></TableCell>
                      <TableCell>float</TableCell>
                      <TableCell>Процент вознаграждения платежа</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><code>payment_type</code></TableCell>
                      <TableCell>string</TableCell>
                      <TableCell>Тип запрашиваемого реквизита (card - карта, sbp - сбп)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><code>payment_bank</code></TableCell>
                      <TableCell>string|null</TableCell>
                      <TableCell>Код банка, может быть null</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><code>payment_course</code></TableCell>
                      <TableCell>float</TableCell>
                      <TableCell>Курс конвертации RUB-USDT</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><code>payment_lifetime</code></TableCell>
                      <TableCell>integer</TableCell>
                      <TableCell>Время жизни заявки на платёж в секундах</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><code>payment_status</code></TableCell>
                      <TableCell>string</TableCell>
                      <TableCell>Текущий статус платежа</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="response" className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Вам необходимо дополнить данные полученного запроса выданным в заявку реквизитом.
                    Если в запросе отсутствовал код банка для платежа, вам необходимо его также дозаполнить.
                  </AlertDescription>
                </Alert>

                <div className="bg-muted rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm"><code className="language-json">{`{
  "payment_id": 4086997,
  "payment_amount": 3833,
  "payment_amount_usdt": 48.42091966,
  "payment_amount_profit": 3583.855,
  "payment_amount_profit_usdt": 45.2735598821,
  "payment_fee_percent_profit": 6.5,
  "payment_type": "sbp",
  "payment_bank": "TCSBRUB",
  "payment_course": 79.16,
  "payment_lifetime": 720,
  "payment_status": "new",
  "payment_credential": "9001112244"
}`}</code></pre>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Параметр</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Описание</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell><code>payment_credential</code></TableCell>
                      <TableCell>string</TableCell>
                      <TableCell>Реквизит для перечисления средств</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Get Payment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Получение данных по платежу</CardTitle>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">POST</Badge>
              <code className="text-sm bg-muted px-2 py-1 rounded">{baseUrl}/api/wellbit/payment/get</code>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Вам поступит запрос от Wellbit с данными и в формате, указанном ниже
            </p>
            
            <Tabs defaultValue="request" className="mt-4">
              <TabsList>
                <TabsTrigger value="request">Request</TabsTrigger>
                <TabsTrigger value="response">Response</TabsTrigger>
              </TabsList>
              
              <TabsContent value="request" className="space-y-4">
                <div className="bg-muted rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm"><code className="language-json">{`{
  "payment_id": 888888
}`}</code></pre>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Параметр</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Описание</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell><code>payment_id</code></TableCell>
                      <TableCell>integer</TableCell>
                      <TableCell>ID платежа (уникальный)</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="response" className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Вам необходимо дополнить данные полученного запроса статусом платежа
                  </AlertDescription>
                </Alert>

                <div className="bg-muted rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm"><code className="language-json">{`{
  "payment_id": 888888,
  "payment_status": "new"
}`}</code></pre>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Параметр</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Описание</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell><code>payment_status</code></TableCell>
                      <TableCell>string</TableCell>
                      <TableCell>Текущий статус платежа</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Update Payment Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Установка статуса платежа</CardTitle>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">POST</Badge>
              <code className="text-sm bg-muted px-2 py-1 rounded">{baseUrl}/api/wellbit/payment/status</code>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Вам поступит запрос от Wellbit с данными и в формате, указанном ниже
            </p>
            
            <Tabs defaultValue="request" className="mt-4">
              <TabsList>
                <TabsTrigger value="request">Request</TabsTrigger>
                <TabsTrigger value="response">Response</TabsTrigger>
              </TabsList>
              
              <TabsContent value="request" className="space-y-4">
                <div className="bg-muted rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm"><code className="language-json">{`{
  "payment_id": 888888,
  "payment_status": "complete"
}`}</code></pre>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Параметр</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Описание</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell><code>payment_id</code></TableCell>
                      <TableCell>integer</TableCell>
                      <TableCell>ID платежа (уникальный)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><code>payment_status</code></TableCell>
                      <TableCell>string</TableCell>
                      <TableCell>Новый статус платежа</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="response" className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Вам необходимо обновить статус платежа на своей стороне и вернуть данные
                  </AlertDescription>
                </Alert>

                <div className="bg-muted rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm"><code className="language-json">{`{
  "payment_id": 888888,
  "payment_status": "complete"
}`}</code></pre>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Параметр</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Описание</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell><code>payment_id</code></TableCell>
                      <TableCell>integer</TableCell>
                      <TableCell>ID платежа (уникальный)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><code>payment_status</code></TableCell>
                      <TableCell>string</TableCell>
                      <TableCell>Новый статус платежа</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Callback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Callback
          </CardTitle>
          <CardDescription>
            POST URL указан в настройках вашего ключа подключения
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Вам необходимо отправить на указанный URL колбек в случае смены статуса платежа
          </p>

          <div className="bg-muted rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm"><code className="language-json">{`{
  "payment_id": 888888,
  "payment_status": "complete"
}`}</code></pre>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Параметр</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Описание</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell><code>payment_id</code></TableCell>
                <TableCell>integer</TableCell>
                <TableCell>ID платежа (уникальный)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><code>payment_status</code></TableCell>
                <TableCell>string</TableCell>
                <TableCell>Новый статус платежа</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Alert>
            <AlertDescription className="space-y-2">
              <p>• Подпись запроса при отправке callback обязательна</p>
              <p>• Callback считается принятым при получении вами пустого ответа с кодом 200</p>
              <p>• При коде ответа не равном 200, рекомендуется повторно отправить callback позже</p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Payment Statuses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Статусы платежей
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge variant="secondary" className="mt-0.5">new</Badge>
              <div>
                <p className="font-medium">Новый платеж</p>
                <p className="text-sm text-muted-foreground">Статус присваивается платежу при создании.</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-3">
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 mt-0.5">
                <CheckCircle className="h-3 w-3 mr-1" />
                complete
              </Badge>
              <div>
                <p className="font-medium">Платёж выполнен</p>
                <p className="text-sm text-muted-foreground">Финальный статус.</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-3">
              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 mt-0.5">
                <XCircle className="h-3 w-3 mr-1" />
                cancel
              </Badge>
              <div>
                <p className="font-medium">Платёж отменен</p>
                <p className="text-sm text-muted-foreground">Финальный статус.</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-3">
              <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 mt-0.5">
                <RotateCcw className="h-3 w-3 mr-1" />
                chargeback
              </Badge>
              <div>
                <p className="font-medium">По платежу произведён возврат средств</p>
                <p className="text-sm text-muted-foreground">Финальный статус.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Dialog */}
      <WellbitApiTestDialog 
        open={testDialogOpen} 
        onOpenChange={setTestDialogOpen} 
      />
    </div>
  );
}