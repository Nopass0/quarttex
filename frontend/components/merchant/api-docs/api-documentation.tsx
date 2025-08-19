"use client";

import { useState } from "react";
import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Copy,
  Play,
  Code,
  FileJson,
  Key,
  AlertCircle,
  Check,
  ChevronRight,
  Server,
  Shield,
  Zap,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Link,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMerchantAuth } from "@/stores/merchant-auth";
import { BANKS } from "@/constants/banks";

interface ApiEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  description: string;
  category: string;
  headers?: Record<string, string>;
  params?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
    example?: any;
  }[];
  body?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
    example?: any;
  }[];
  responses: {
    status: number;
    description: string;
    example: any;
  }[];
}

const API_ENDPOINTS: ApiEndpoint[] = [
  // Общие
  {
    method: "GET",
    path: "/api/merchant/connect",
    category: "general",
    description: "Информация о мерчанте",
    headers: { "x-merchant-api-key": "API_KEY" },
    responses: [
      { status: 200, description: "OK", example: { id: "m1", name: "Shop" } },
    ],
  },
  {
    method: "GET",
    path: "/api/merchant/balance",
    category: "general",
    description: "Текущий баланс",
    headers: { "x-merchant-api-key": "API_KEY" },
    responses: [{ status: 200, description: "OK", example: { balance: 0 } }],
  },
  {
    method: "GET",
    path: "/api/merchant/methods",
    category: "general",
    description: "Доступные методы",
    headers: { "x-merchant-api-key": "API_KEY" },
    responses: [{ status: 200, description: "OK", example: [] }],
  },
  {
    method: "GET",
    path: "/api/merchant/enums",
    category: "general",
    description: "Enum значения",
    headers: { "x-merchant-api-key": "API_KEY" },
    responses: [{ status: 200, description: "OK", example: {} }],
  },
  {
    method: "GET",
    path: "/api/merchant/traders/stats",
    category: "general",
    description: "Статистика трейдеров",
    headers: { "x-merchant-api-key": "API_KEY" },
    responses: [{ status: 200, description: "OK", example: { success: true } }],
  },

  // Транзакции
  {
    method: "POST",
    path: "/api/merchant/transactions/in",
    category: "transactions",
    description:
      "Создание входящей транзакции (IN) с автоматическим подбором реквизита",
    headers: { "x-merchant-api-key": "API_KEY" },
    body: [
      {
        name: "amount",
        type: "number",
        required: true,
        description: "Сумма транзакции в рублях",
      },
      {
        name: "orderId",
        type: "string",
        required: true,
        description: "Уникальный ID заказа от мерчанта",
      },
      {
        name: "methodId",
        type: "string",
        required: true,
        description: "ID метода платежа",
      },
      {
        name: "rate",
        type: "number",
        required: false,
        description: "Курс USDT/RUB. ВАЖНО: если у мерчанта включена настройка 'Расчеты в рублях', курс НЕ передается (получается автоматически от системы). Если настройка выключена - курс ОБЯЗАТЕЛЕН.",
      },
      {
        name: "expired_at",
        type: "string",
        required: true,
        description: "ISO дата истечения транзакции",
      },
      {
        name: "userIp",
        type: "string",
        required: false,
        description: "IP адрес пользователя",
      },
      {
        name: "callbackUri",
        type: "string",
        required: false,
        description: "URL для callback уведомлений",
      },
    ],
    responses: [
      {
        status: 201,
        description: "Успешно создана IN транзакция",
        example: {
          id: "tx123",
          numericId: 1001,
          amount: 1000,
          status: "IN_PROGRESS",
          requisites: { cardNumber: "4111111111111111" },
        },
      },
      {
        status: 400,
        description: "Ошибка валидации курса",
        example: { 
          error: "Курс не должен передаваться при включенных расчетах в рублях. Курс автоматически получается от системы." 
        },
      },
      {
        status: 400,
        description: "Ошибка валидации (курс не указан)",
        example: { 
          error: "Курс обязателен при выключенных расчетах в рублях. Укажите параметр rate." 
        },
      },
    ],
  },
  {
    method: "POST",
    path: "/api/merchant/transactions/out",
    category: "transactions",
    description: "Создание исходящей транзакции (OUT)",
    headers: { "x-merchant-api-key": "API_KEY" },
    body: [
      {
        name: "amount",
        type: "number",
        required: true,
        description: "Сумма транзакции в рублях",
      },
      {
        name: "orderId",
        type: "string",
        required: true,
        description: "Уникальный ID заказа от мерчанта",
      },
      {
        name: "methodId",
        type: "string",
        required: true,
        description: "ID метода платежа",
      },
      {
        name: "rate",
        type: "number",
        required: false,
        description: "Курс USDT/RUB. ВАЖНО: если у мерчанта включена настройка 'Расчеты в рублях', курс НЕ передается (получается автоматически от системы). Если настройка выключена - курс ОБЯЗАТЕЛЕН.",
      },
      {
        name: "expired_at",
        type: "string",
        required: true,
        description: "ISO дата истечения транзакции",
      },
      {
        name: "userIp",
        type: "string",
        required: false,
        description: "IP адрес пользователя",
      },
      {
        name: "callbackUri",
        type: "string",
        required: false,
        description: "URL для callback уведомлений",
      },
    ],
    responses: [
      {
        status: 201,
        description: "Успешно создана OUT транзакция",
        example: {
          id: "tx123",
          numericId: 1001,
          amount: 1000,
          status: "IN_PROGRESS",
          requisites: null,
        },
      },
      {
        status: 400,
        description: "Ошибка валидации курса",
        example: { 
          error: "Курс не должен передаваться при включенных расчетах в рублях. Курс автоматически получается от системы." 
        },
      },
      {
        status: 400,
        description: "Ошибка валидации (курс не указан)",
        example: { 
          error: "Курс обязателен при выключенных расчетах в рублях. Укажите параметр rate." 
        },
      },
    ],
  },
  {
    method: "GET",
    path: "/api/merchant/transactions/list",
    category: "transactions",
    description: "Список транзакций",
    headers: { "x-merchant-api-key": "API_KEY" },
    params: [
      {
        name: "page",
        type: "number",
        required: false,
        description: "Страница",
      },
    ],
    responses: [{ status: 200, description: "OK", example: { data: [] } }],
  },
  {
    method: "GET",
    path: "/api/merchant/transactions/by-order-id/:orderId",
    category: "transactions",
    description: "Транзакция по orderId",
    headers: { "x-merchant-api-key": "API_KEY" },
    params: [
      {
        name: "orderId",
        type: "string",
        required: true,
        description: "ID заказа",
      },
    ],
    responses: [{ status: 200, description: "OK", example: { id: "tx" } }],
  },
  {
    method: "PATCH",
    path: "/api/merchant/transactions/by-order-id/:orderId/cancel",
    category: "transactions",
    description: "Отмена транзакции",
    headers: { "x-merchant-api-key": "API_KEY" },
    params: [
      {
        name: "orderId",
        type: "string",
        required: true,
        description: "ID заказа",
      },
    ],
    responses: [{ status: 200, description: "OK", example: { success: true } }],
  },
  {
    method: "GET",
    path: "/api/merchant/transactions/status/:id",
    category: "transactions",
    description: "Статус транзакции",
    headers: { "x-merchant-api-key": "API_KEY" },
    params: [{ name: "id", type: "string", required: true, description: "ID" }],
    responses: [
      { status: 200, description: "OK", example: { status: "READY" } },
    ],
  },
  {
    method: "POST",
    path: "/api/merchant/transactions/:id/receipt",
    category: "transactions",
    description: "Загрузка чека",
    headers: { "x-merchant-api-key": "API_KEY" },
    params: [{ name: "id", type: "string", required: true, description: "ID" }],
    body: [
      {
        name: "fileData",
        type: "string",
        required: true,
        description: "base64",
      },
    ],
    responses: [{ status: 201, description: "OK", example: { id: "r" } }],
  },
  {
    method: "GET",
    path: "/api/merchant/transactions/:id/receipts",
    category: "transactions",
    description: "Получение чеков",
    headers: { "x-merchant-api-key": "API_KEY" },
    params: [{ name: "id", type: "string", required: true, description: "ID" }],
    responses: [{ status: 200, description: "OK", example: [] }],
  },

  // Выплаты
  {
    method: "POST",
    path: "/api/merchant/payouts",
    category: "payouts",
    description:
      "Создать выплату. Мерчант самостоятельно указывает реквизиты для выплаты (банк, тип карта/СБП, номер карты/телефона)",
    headers: { "x-merchant-api-key": "API_KEY" },
    body: [
      {
        name: "amount",
        type: "number",
        required: true,
        description: "Сумма выплаты в рублях (минимум 100)",
        example: 5000,
      },
      {
        name: "methodId",
        type: "string",
        required: true,
        description: "ID метода платежа (обязательное поле)",
        example: "method_1a2b3c4d5e6f",
      },
      {
        name: "wallet",
        type: "string",
        required: true,
        description:
          "Номер карты (16 цифр) или номер телефона для СБП (+7XXXXXXXXXX)",
        example: "4111111111111111",
      },
      {
        name: "bank",
        type: "string",
        required: true,
        description: "Код банка получателя (например: SBERBANK, TBANK, VTB)",
        example: "SBERBANK",
      },
      {
        name: "isCard",
        type: "boolean",
        required: true,
        description: "true - выплата на карту, false - выплата по СБП",
        example: true,
      },
      {
        name: "merchantRate",
        type: "number",
        required: false,
        description: "Курс USDT/RUB для расчета. ВАЖНО: если у мерчанта включена настройка 'Расчеты в рублях', курс НЕ передается (получается автоматически от системы). Если настройка выключена - курс ОБЯЗАТЕЛЕН.",
        example: 95.5,
      },
      {
        name: "externalReference",
        type: "string",
        required: false,
        description: "Внешний идентификатор для отслеживания",
        example: "PAYOUT-12345",
      },
      {
        name: "processingTime",
        type: "number",
        required: false,
        description: "Время на обработку в минутах (5-60, по умолчанию 15)",
        example: 15,
      },
      {
        name: "webhookUrl",
        type: "string",
        required: false,
        description: "URL для отправки уведомлений о статусе выплаты",
        example: "https://example.com/webhook/payout",
      },
      {
        name: "metadata",
        type: "object",
        required: false,
        description: "Дополнительные данные в произвольном формате",
        example: { userId: "user123", orderId: "order456" },
      },
    ],
    responses: [
      {
        status: 200,
        description: "Выплата успешно создана",
        example: {
          success: true,
          payout: {
            id: "py_1a2b3c4d5e6f",
            numericId: 10001,
            amount: 5000,
            amountUsdt: 52.35,
            total: 5000,
            totalUsdt: 52.35,
            rate: 95.5,
            wallet: "4111111111111111",
            bank: "SBERBANK",
            isCard: true,
            status: "CREATED",
            expireAt: "2024-03-10T15:30:00.000Z",
            createdAt: "2024-03-10T12:30:00.000Z",
          },
        },
      },
      {
        status: 400,
        description: "Ошибка валидации",
        example: { 
          error: "Курс не должен передаваться при включенных расчетах в рублях. Курс автоматически получается от системы." 
        },
      },
      {
        status: 400,
        description: "Ошибка валидации (курс не указан)",
        example: { 
          error: "Курс обязателен при выключенных расчетах в рублях. Укажите параметр merchantRate." 
        },
      },
    ],
  },
  {
    method: "GET",
    path: "/api/merchant/payouts/:id",
    category: "payouts",
    description: "Получить информацию о выплате по ID",
    headers: { "x-merchant-api-key": "API_KEY" },
    params: [
      {
        name: "id",
        type: "string",
        required: true,
        description: "ID выплаты",
        example: "py_1a2b3c4d5e6f",
      },
    ],
    responses: [
      {
        status: 200,
        description: "Информация о выплате",
        example: {
          success: true,
          payout: {
            id: "py_1a2b3c4d5e6f",
            numericId: 10001,
            amount: 5000,
            amountUsdt: 52.35,
            total: 5000,
            totalUsdt: 52.35,
            rate: 95.5,
            wallet: "4111111111111111",
            bank: "SBERBANK",
            isCard: true,
            status: "ACTIVE",
            expireAt: "2024-03-10T15:30:00.000Z",
            createdAt: "2024-03-10T12:30:00.000Z",
            acceptedAt: "2024-03-10T12:35:00.000Z",
            confirmedAt: null,
            cancelledAt: null,
            proofFiles: [],
            disputeFiles: [],
            disputeMessage: null,
            cancelReason: null,
          },
        },
      },
      {
        status: 404,
        description: "Выплата не найдена",
        example: { error: "Payout not found" },
      },
    ],
  },
  {
    method: "POST",
    path: "/api/merchant/payouts/:id/dispute",
    category: "payouts",
    description: "Создать спор по выплате (оспорить выплату)",
    headers: { "x-merchant-api-key": "API_KEY" },
    params: [
      {
        name: "id",
        type: "string",
        required: true,
        description: "ID выплаты",
        example: "py_1a2b3c4d5e6f",
      },
    ],
    body: [
      {
        name: "message",
        type: "string",
        required: true,
        description: "Описание проблемы (минимум 10 символов)",
        example: "Средства не получены на указанную карту",
      },
      {
        name: "files",
        type: "string[]",
        required: false,
        description: "Массив URL файлов-доказательств",
        example: [
          "https://example.com/proof1.jpg",
          "https://example.com/screenshot.png",
        ],
      },
    ],
    responses: [
      {
        status: 200,
        description: "Спор создан",
        example: {
          success: true,
          payout: {
            id: "py_1a2b3c4d5e6f",
            numericId: 10001,
            status: "DISPUTED",
          },
        },
      },
      {
        status: 400,
        description: "Невозможно создать спор",
        example: { error: "Выплата уже завершена или отменена" },
      },
    ],
  },
  {
    method: "PATCH",
    path: "/api/merchant/payouts/:id/cancel",
    category: "payouts",
    description: "Отменить выплату",
    headers: { "x-merchant-api-key": "API_KEY" },
    params: [
      {
        name: "id",
        type: "string",
        required: true,
        description: "ID выплаты",
        example: "py_1a2b3c4d5e6f",
      },
    ],
    body: [
      {
        name: "reasonCode",
        type: "string",
        required: true,
        description: "Код причины отмены (минимум 3 символа)",
        example: "MERCHANT_REQUEST",
      },
    ],
    responses: [
      {
        status: 200,
        description: "Выплата отменена",
        example: {
          success: true,
          payout: {
            id: "py_1a2b3c4d5e6f",
            numericId: 10001,
            status: "CANCELLED",
            cancelledAt: "2024-03-10T13:00:00.000Z",
            cancelReasonCode: "MERCHANT_REQUEST",
          },
        },
      },
      {
        status: 400,
        description: "Невозможно отменить",
        example: { error: "Выплата уже обработана" },
      },
    ],
  },
  {
    method: "PATCH",
    path: "/api/merchant/payouts/:id/rate",
    category: "payouts",
    description: "Изменить курс или сумму выплаты",
    headers: { "x-merchant-api-key": "API_KEY" },
    params: [
      {
        name: "id",
        type: "string",
        required: true,
        description: "ID выплаты",
        example: "py_1a2b3c4d5e6f",
      },
    ],
    body: [
      {
        name: "merchantRate",
        type: "number",
        required: false,
        description: "Новый курс USDT/RUB",
        example: 96.5,
      },
      {
        name: "amount",
        type: "number",
        required: false,
        description: "Новая сумма в рублях",
        example: 5500,
      },
    ],
    responses: [
      {
        status: 200,
        description: "Параметры обновлены",
        example: {
          success: true,
          payout: {
            id: "py_1a2b3c4d5e6f",
            numericId: 10001,
            amount: 5500,
            merchantRate: 96.5,
            rate: 94.5,
            total: 5610,
          },
        },
      },
      {
        status: 400,
        description: "Невозможно изменить",
        example: { error: "Выплата уже принята трейдером" },
      },
    ],
  },
  {
    method: "GET",
    path: "/api/merchant/payouts",
    category: "payouts",
    description: "Получить список выплат с фильтрацией",
    headers: { "x-merchant-api-key": "API_KEY" },
    params: [
      {
        name: "status",
        type: "string",
        required: false,
        description: "Фильтр по статусу (можно несколько через запятую)",
        example: "ACTIVE,CHECKING",
      },
      {
        name: "direction",
        type: "string",
        required: false,
        description: "Направление: IN (входящие) или OUT (исходящие)",
        example: "OUT",
      },
      {
        name: "dateFrom",
        type: "string",
        required: false,
        description: "Дата начала периода (ISO 8601)",
        example: "2024-03-01T00:00:00.000Z",
      },
      {
        name: "dateTo",
        type: "string",
        required: false,
        description: "Дата конца периода (ISO 8601)",
        example: "2024-03-31T23:59:59.999Z",
      },
      {
        name: "page",
        type: "number",
        required: false,
        description: "Номер страницы (по умолчанию 1)",
        example: 1,
      },
      {
        name: "limit",
        type: "number",
        required: false,
        description: "Количество записей на странице (1-100, по умолчанию 20)",
        example: 20,
      },
    ],
    responses: [
      {
        status: 200,
        description: "Список выплат",
        example: {
          success: true,
          data: [
            {
              id: "py_1a2b3c4d5e6f",
              numericId: 10001,
              status: "ACTIVE",
              direction: "OUT",
              amount: 5000,
              rate: 95.5,
              total: 5000,
              wallet: "4111111111111111",
              bank: "SBERBANK",
              isCard: true,
              externalReference: "PAYOUT-12345",
              createdAt: "2024-03-10T12:30:00.000Z",
              acceptedAt: "2024-03-10T12:35:00.000Z",
              confirmedAt: null,
              cancelledAt: null,
              trader: {
                numericId: 1001,
                email: "trader@example.com",
              },
            },
          ],
          meta: {
            total: 150,
            page: 1,
            limit: 20,
            totalPages: 8,
          },
        },
      },
    ],
  },

  // Споры по выплатам
  {
    method: "POST",
    path: "/api/merchant/disputes/payout/:payoutId",
    category: "disputes",
    description: "Создать спор по выплате",
    headers: { Authorization: "Bearer" },
    params: [
      { name: "payoutId", type: "string", required: true, description: "ID" },
    ],
    body: [
      {
        name: "message",
        type: "string",
        required: true,
        description: "Сообщение",
      },
    ],
    responses: [{ status: 200, description: "OK", example: { success: true } }],
  },
  {
    method: "GET",
    path: "/api/merchant/disputes",
    category: "disputes",
    description: "Список споров",
    headers: { Authorization: "Bearer" },
    params: [
      {
        name: "page",
        type: "number",
        required: false,
        description: "Страница",
      },
    ],
    responses: [{ status: 200, description: "OK", example: { data: [] } }],
  },
  {
    method: "GET",
    path: "/api/merchant/disputes/:disputeId",
    category: "disputes",
    description: "Получить спор",
    headers: { Authorization: "Bearer" },
    params: [
      { name: "disputeId", type: "string", required: true, description: "ID" },
    ],
    responses: [{ status: 200, description: "OK", example: { data: {} } }],
  },
  {
    method: "POST",
    path: "/api/merchant/disputes/:disputeId/messages",
    category: "disputes",
    description: "Сообщение в споре",
    headers: { Authorization: "Bearer" },
    params: [
      { name: "disputeId", type: "string", required: true, description: "ID" },
    ],
    body: [
      {
        name: "message",
        type: "string",
        required: true,
        description: "Сообщение",
      },
    ],
    responses: [{ status: 200, description: "OK", example: { success: true } }],
  },

  // Споры по сделкам
  {
    method: "GET",
    path: "/api/merchant/deal-disputes/test",
    category: "deal-disputes",
    description: "Тест",
    headers: { Authorization: "Bearer" },
    responses: [
      {
        status: 200,
        description: "OK",
        example: { message: "Deal disputes routes are working!" },
      },
    ],
  },
  {
    method: "POST",
    path: "/api/merchant/deal-disputes/deal/:dealId",
    category: "deal-disputes",
    description: "Создать спор по сделке",
    headers: { Authorization: "Bearer" },
    params: [
      { name: "dealId", type: "string", required: true, description: "ID" },
    ],
    body: [
      {
        name: "message",
        type: "string",
        required: true,
        description: "Сообщение",
      },
    ],
    responses: [{ status: 200, description: "OK", example: { success: true } }],
  },
  {
    method: "GET",
    path: "/api/merchant/deal-disputes",
    category: "deal-disputes",
    description: "Список споров по сделкам",
    headers: { Authorization: "Bearer" },
    params: [
      {
        name: "page",
        type: "number",
        required: false,
        description: "Страница",
      },
    ],
    responses: [{ status: 200, description: "OK", example: { data: [] } }],
  },
  {
    method: "GET",
    path: "/api/merchant/deal-disputes/:disputeId",
    category: "deal-disputes",
    description: "Получить спор по сделке",
    headers: { Authorization: "Bearer" },
    params: [
      { name: "disputeId", type: "string", required: true, description: "ID" },
    ],
    responses: [{ status: 200, description: "OK", example: { data: {} } }],
  },
  {
    method: "POST",
    path: "/api/merchant/deal-disputes/:disputeId/messages",
    category: "deal-disputes",
    description: "Сообщение в споре по сделке",
    headers: { Authorization: "Bearer" },
    params: [
      { name: "disputeId", type: "string", required: true, description: "ID" },
    ],
    body: [
      {
        name: "message",
        type: "string",
        required: true,
        description: "Сообщение",
      },
    ],
    responses: [{ status: 200, description: "OK", example: { success: true } }],
  },
];

const CATEGORIES = [
  { id: "general", name: "Общие", icon: Server },
  { id: "transactions", name: "Транзакции", icon: CreditCard },
  { id: "payouts", name: "Выплаты", icon: DollarSign },
  { id: "disputes", name: "Споры", icon: AlertCircle },
  { id: "deal-disputes", name: "Споры по сделкам", icon: AlertCircle },
];

export function ApiDocumentation() {
  const { merchant, token } = useMerchantAuth();
  const [selectedCategory, setSelectedCategory] = useState("general");
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(
    null,
  );
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [testParams, setTestParams] = useState<Record<string, any>>({});
  const [testBody, setTestBody] = useState<string>("{}");
  const [testResponse, setTestResponse] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState<string>("");

  // Set base URL based on environment
  React.useEffect(() => {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      setBaseUrl("http://localhost:3000");
    } else {
      setBaseUrl(`https://${host}`);
    }
  }, []);

  const filteredEndpoints = API_ENDPOINTS.filter(
    (e) => e.category === selectedCategory,
  );

  // Generate random test data
  const generateRandomData = (endpoint: ApiEndpoint) => {
    const data: Record<string, any> = {};

    if (endpoint.body) {
      endpoint.body.forEach((field) => {
        switch (field.name) {
          case "amount":
            data[field.name] = Math.floor(Math.random() * 10000) + 100;
            break;
          case "orderId":
            data[field.name] =
              `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            break;
          case "methodId":
            data[field.name] = "method_1a2b3c4d5e6f"; // Example method ID
            break;
          case "rate":
            data[field.name] = 95.5 + Math.random() * 5;
            break;
          case "expired_at":
            const futureDate = new Date();
            futureDate.setHours(futureDate.getHours() + 24);
            data[field.name] = futureDate.toISOString();
            break;
          case "userIp":
            data[field.name] =
              `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
            break;
          case "userId":
            data[field.name] =
              `user_${Math.random().toString(36).substr(2, 9)}`;
            break;
          case "type":
            data[field.name] = Math.random() > 0.5 ? "IN" : "OUT";
            break;
          case "callbackUri":
          case "successUri":
          case "failUri":
            data[field.name] =
              `https://example.com/${field.name.replace("Uri", "")}`;
            break;
          case "message":
          case "reason":
            data[field.name] = "Тестовое сообщение";
            break;
          case "token":
            data[field.name] = token || "your-api-token-here";
            break;
          case "reasonCode":
            data[field.name] = "MERCHANT_REQUEST";
            break;
          case "merchantRate":
            data[field.name] = 95.5 + Math.random() * 5;
            break;
          case "fileData":
            data[field.name] =
              "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
            break;
          default:
            data[field.name] = field.example || `test_${field.name}`;
        }
      });
    }

    return JSON.stringify(data, null, 2);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success("Скопировано в буфер обмена");
    setTimeout(() => setCopied(null), 2000);
  };

  const testEndpoint = async (endpoint: ApiEndpoint) => {
    try {
      setTestingEndpoint(endpoint.path);
      setTestResponse(null);

      // Build URL
      let url = `${baseUrl}${endpoint.path}`;

      // Replace path params
      if (endpoint.params) {
        endpoint.params.forEach((param) => {
          if (param.name in testParams) {
            url = url.replace(`:${param.name}`, testParams[param.name]);
          }
        });
      }

      // Add query params
      const queryParams =
        endpoint.params?.filter((p) => !endpoint.path.includes(`:${p.name}`)) ||
        [];
      if (queryParams.length > 0) {
        const query = new URLSearchParams();
        queryParams.forEach((param) => {
          if (param.name in testParams && testParams[param.name]) {
            query.append(param.name, testParams[param.name]);
          }
        });
        const queryString = query.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }

      // Build request
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Автоматически подставляем API токен мерчанта только если он требуется
      if (endpoint.headers && endpoint.headers["x-merchant-api-key"]) {
        headers["x-merchant-api-key"] = token || "YOUR_API_KEY_HERE";
      }

      const options: RequestInit = {
        method: endpoint.method,
        headers,
      };

      if (["POST", "PUT", "PATCH"].includes(endpoint.method)) {
        try {
          options.body = JSON.stringify(JSON.parse(testBody));
        } catch {
          toast.error("Некорректный JSON в теле запроса");
          return;
        }
      }

      const response = await fetch(url, options);
      const data = await response.json();

      setTestResponse({
        status: response.status,
        data,
        headers: Object.fromEntries(response.headers.entries()),
      });
    } catch (error: any) {
      setTestResponse({
        error: error.message || "Ошибка выполнения запроса",
      });
    } finally {
      setTestingEndpoint(null);
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "POST":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "PUT":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "DELETE":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "PATCH":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">API Документация</h1>
        <p className="text-muted-foreground">
          Полная документация по API для интеграции с платежной системой
        </p>
      </div>

      {/* API Info */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Server className="h-4 w-4 mr-2 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Base URL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {baseUrl}
              </code>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => copyToClipboard(baseUrl, "base-url")}
              >
                {copied === "base-url" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">
              Аутентификация
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">
              Используйте заголовок <code>x-merchant-api-key</code>
            </p>
            {token && (
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[200px]">
                  {token}
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(token, "api-key")}
                >
                  {copied === "api-key" ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Версия API</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge>v1.0</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-4">
        {/* Categories */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Категории</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {CATEGORIES.map((category) => {
                const Icon = category.icon;
                const count = API_ENDPOINTS.filter(
                  (e) => e.category === category.id,
                ).length;

                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setSelectedEndpoint(null);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent transition-colors",
                      selectedCategory === category.id && "bg-accent",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <Badge variant="secondary" className="ml-auto">
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Endpoints */}
        <div className="md:col-span-3 space-y-4">
          {!selectedEndpoint ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {CATEGORIES.find((c) => c.id === selectedCategory)?.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredEndpoints.map((endpoint) => (
                    <button
                      key={`${endpoint.method}-${endpoint.path}`}
                      onClick={() => {
                        setSelectedEndpoint(endpoint);
                        setTestParams({});
                        if (
                          ["POST", "PUT", "PATCH"].includes(endpoint.method)
                        ) {
                          setTestBody(generateRandomData(endpoint));
                        } else {
                          setTestBody("{}");
                        }
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left"
                    >
                      <Badge
                        className={cn(
                          "font-mono",
                          getMethodColor(endpoint.method),
                        )}
                      >
                        {endpoint.method}
                      </Badge>
                      <code className="flex-1 text-sm">{endpoint.path}</code>
                      <p className="text-sm text-muted-foreground">
                        {endpoint.description}
                      </p>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge
                      className={cn(
                        "font-mono",
                        getMethodColor(selectedEndpoint.method),
                      )}
                    >
                      {selectedEndpoint.method}
                    </Badge>
                    <code className="text-lg">{selectedEndpoint.path}</code>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedEndpoint(null)}
                  >
                    Назад
                  </Button>
                </div>
                <CardDescription>
                  {selectedEndpoint.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="docs">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="docs">Документация</TabsTrigger>
                    <TabsTrigger value="test">Тестирование</TabsTrigger>
                  </TabsList>

                  {/* Documentation Tab */}
                  <TabsContent value="docs" className="space-y-6">
                    {/* Headers */}
                    {selectedEndpoint.headers && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">
                          Заголовки
                        </h3>
                        <div className="bg-muted rounded-lg p-3">
                          {Object.entries(selectedEndpoint.headers).map(
                            ([key, value]) => (
                              <div
                                key={key}
                                className="flex items-center justify-between"
                              >
                                <code className="text-sm">
                                  {key}: {value}
                                </code>
                                {key === "x-merchant-api-key" &&
                                  merchant?.apiKey && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6"
                                      onClick={() =>
                                        copyToClipboard(
                                          merchant.apiKey,
                                          `header-${key}`,
                                        )
                                      }
                                    >
                                      {copied === `header-${key}` ? (
                                        <Check className="h-3 w-3" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </Button>
                                  )}
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                    {/* Parameters */}
                    {selectedEndpoint.params &&
                      selectedEndpoint.params.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold mb-2">
                            Параметры
                          </h3>
                          <div className="space-y-2">
                            {selectedEndpoint.params.map((param) => (
                              <div
                                key={param.name}
                                className="border rounded-lg p-3"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <code className="text-sm font-medium">
                                    {param.name}
                                  </code>
                                  <Badge
                                    variant={
                                      param.required ? "default" : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    {param.type}
                                  </Badge>
                                  {param.required && (
                                    <Badge
                                      variant="destructive"
                                      className="text-xs"
                                    >
                                      обязательный
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {param.description}
                                </p>
                                {param.example && (
                                  <code className="text-xs bg-muted px-2 py-1 rounded mt-1 inline-block">
                                    {JSON.stringify(param.example)}
                                  </code>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Body */}
                    {selectedEndpoint.body &&
                      selectedEndpoint.body.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold mb-2">
                            Тело запроса
                          </h3>
                          <div className="space-y-2">
                            {selectedEndpoint.body.map((field) => (
                              <div
                                key={field.name}
                                className="border rounded-lg p-3"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <code className="text-sm font-medium">
                                    {field.name}
                                  </code>
                                  <Badge
                                    variant={
                                      field.required ? "default" : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    {field.type}
                                  </Badge>
                                  {field.required && (
                                    <Badge
                                      variant="destructive"
                                      className="text-xs"
                                    >
                                      обязательный
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {field.description}
                                </p>
                                {field.example && (
                                  <code className="text-xs bg-muted px-2 py-1 rounded mt-1 inline-block">
                                    {JSON.stringify(field.example)}
                                  </code>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Example body */}
                          <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2">
                              Пример запроса:
                            </h4>
                            <div className="relative">
                              <pre className="bg-muted rounded-lg p-3 text-sm overflow-x-auto">
                                {JSON.stringify(
                                  selectedEndpoint.body.reduce((acc, field) => {
                                    acc[field.name] =
                                      field.example || `<${field.type}>`;
                                    return acc;
                                  }, {} as any),
                                  null,
                                  2,
                                )}
                              </pre>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="absolute top-2 right-2 h-6 w-6"
                                onClick={() =>
                                  copyToClipboard(
                                    JSON.stringify(
                                      selectedEndpoint.body?.reduce(
                                        (acc, field) => {
                                          acc[field.name] = field.example || "";
                                          return acc;
                                        },
                                        {} as any,
                                      ),
                                      null,
                                      2,
                                    ),
                                    "example-body",
                                  )
                                }
                              >
                                {copied === "example-body" ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Responses */}
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Ответы</h3>
                      <div className="space-y-3">
                        {selectedEndpoint.responses.map((response, idx) => (
                          <div key={idx} className="border rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge
                                variant={
                                  response.status < 400
                                    ? "default"
                                    : "destructive"
                                }
                              >
                                {response.status}
                              </Badge>
                              <span className="text-sm">
                                {response.description}
                              </span>
                            </div>
                            <pre className="bg-muted rounded p-2 text-xs overflow-x-auto">
                              {JSON.stringify(response.example, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Test Tab */}
                  <TabsContent value="test" className="space-y-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Тестовые запросы отправляются на реальный API. Будьте
                        осторожны!
                      </AlertDescription>
                    </Alert>

                    {/* Test Parameters */}
                    {selectedEndpoint.params &&
                      selectedEndpoint.params.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold mb-2">
                            Параметры
                          </h3>
                          <div className="space-y-2">
                            {selectedEndpoint.params.map((param) => (
                              <div key={param.name}>
                                <Label htmlFor={param.name}>
                                  {param.name}
                                  {param.required && (
                                    <span className="text-red-500 ml-1">*</span>
                                  )}
                                </Label>
                                <Input
                                  id={param.name}
                                  placeholder={
                                    param.example?.toString() ||
                                    param.description
                                  }
                                  value={testParams[param.name] || ""}
                                  onChange={(e) =>
                                    setTestParams({
                                      ...testParams,
                                      [param.name]: e.target.value,
                                    })
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Test Body */}
                    {["POST", "PUT", "PATCH"].includes(
                      selectedEndpoint.method,
                    ) && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label htmlFor="test-body">Тело запроса (JSON)</Label>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setTestBody(generateRandomData(selectedEndpoint))
                            }
                          >
                            <Zap className="mr-2 h-3 w-3" />
                            Сгенерировать данные
                          </Button>
                        </div>
                        <Textarea
                          id="test-body"
                          className="font-mono text-sm"
                          rows={10}
                          value={testBody}
                          onChange={(e) => setTestBody(e.target.value)}
                          placeholder={JSON.stringify(
                            selectedEndpoint.body?.reduce((acc, field) => {
                              acc[field.name] = field.example || "";
                              return acc;
                            }, {} as any),
                            null,
                            2,
                          )}
                        />
                      </div>
                    )}

                    {/* Test Button */}
                    <Button
                      onClick={() => testEndpoint(selectedEndpoint)}
                      disabled={testingEndpoint === selectedEndpoint.path}
                      className="w-full"
                    >
                      {testingEndpoint === selectedEndpoint.path ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Выполняется...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Выполнить запрос
                        </>
                      )}
                    </Button>

                    {/* Test Response */}
                    {testResponse && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Ответ</h3>
                        <div className="border rounded-lg p-3">
                          {testResponse.error ? (
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                {testResponse.error}
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge
                                  variant={
                                    testResponse.status < 400
                                      ? "default"
                                      : "destructive"
                                  }
                                >
                                  {testResponse.status}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {testResponse.headers["content-type"]}
                                </span>
                              </div>
                              <pre className="bg-muted rounded p-3 text-xs overflow-x-auto">
                                {JSON.stringify(testResponse.data, null, 2)}
                              </pre>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Payout Statuses */}
      <Card>
        <CardHeader>
          <CardTitle>Статусы выплат</CardTitle>
          <CardDescription>
            Все возможные статусы выплат и их описание
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary">CREATED</Badge>
                <span className="text-xs text-muted-foreground">
                  Начальный статус
                </span>
              </div>
              <p className="text-sm">
                Выплата создана и ожидает принятия трейдером. В этом статусе
                выплата находится в общем пуле доступных выплат.
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  ACTIVE
                </Badge>
                <span className="text-xs text-muted-foreground">В работе</span>
              </div>
              <p className="text-sm">
                Выплата принята трейдером к исполнению. Трейдер должен отправить
                средства на указанные реквизиты в течение установленного
                времени.
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                  CHECKING
                </Badge>
                <span className="text-xs text-muted-foreground">
                  На проверке
                </span>
              </div>
              <p className="text-sm">
                Трейдер отправил средства и загрузил подтверждение. Ожидается
                подтверждение от администратора. Администратор проверяет
                транзакцию и может подтвердить выплату или вернуть её на
                доработку.
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  COMPLETED
                </Badge>
                <span className="text-xs text-muted-foreground">Завершена</span>
              </div>
              <p className="text-sm">Выплата успешно завершена.</p>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="destructive">CANCELLED</Badge>
                <span className="text-xs text-muted-foreground">Отменена</span>
              </div>
              <p className="text-sm">
                Выплата отменена. Может быть отменена мерчантом, трейдером или
                администратором.
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  EXPIRED
                </Badge>
                <span className="text-xs text-muted-foreground">Истекла</span>
              </div>
              <p className="text-sm">
                Время на выполнение выплаты истекло. Выплата автоматически
                отменена системой.
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  DISPUTED
                </Badge>
                <span className="text-xs text-muted-foreground">Спор</span>
              </div>
              <p className="text-sm">
                По выплате открыт спор. Требуется вмешательство администратора
                для разрешения конфликтной ситуации между мерчантом и трейдером.
              </p>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Жизненный цикл выплаты:</h4>
            <div className="flex flex-wrap gap-2 items-center text-sm">
              <Badge variant="secondary">CREATED</Badge>
              <ChevronRight className="h-4 w-4" />
              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                ACTIVE
              </Badge>
              <ChevronRight className="h-4 w-4" />
              <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                CHECKING
              </Badge>
              <ChevronRight className="h-4 w-4" />
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                COMPLETED
              </Badge>
            </div>

            <div className="text-sm text-muted-foreground">
              <p className="mb-2">Альтернативные пути:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Из любого статуса (кроме COMPLETED) →{" "}
                  <Badge variant="destructive" className="ml-1">
                    CANCELLED
                  </Badge>
                </li>
                <li>
                  Из статуса CHECKING →{" "}
                  <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 ml-1">
                    DISPUTED
                  </Badge>
                </li>
                <li>
                  Из статуса ACTIVE (если время истекло) →{" "}
                  <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 ml-1">
                    EXPIRED
                  </Badge>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rate Logic */}
      <Card>
        <CardHeader>
          <CardTitle>Логика курса USDT/RUB</CardTitle>
          <CardDescription>
            Важная информация о том, как работает курс в API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  Расчеты в рублях ВКЛЮЧЕНЫ
                </Badge>
              </div>
              <p className="text-sm mb-2">
                Если в настройках мерчанта включен переключатель "Расчеты в рублях":
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>Курс USDT/RUB автоматически получается от системы (Rapira)</li>
                <li>НЕ передавайте параметры <code>rate</code> или <code>merchantRate</code></li>
                <li>При передаче курса получите ошибку 400</li>
              </ul>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  Расчеты в рублях ВЫКЛЮЧЕНЫ
                </Badge>
              </div>
              <p className="text-sm mb-2">
                Если в настройках мерчанта выключен переключатель "Расчеты в рублях":
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>Вы ОБЯЗАНЫ передавать курс USDT/RUB</li>
                <li>Для выплат используйте параметр <code>merchantRate</code></li>
                <li>Для транзакций используйте параметр <code>rate</code></li>
                <li>При отсутствии курса получите ошибку 400</li>
              </ul>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">Важно для трейдеров</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Курс у трейдера ВСЕГДА показывается с Rapira (ККК), независимо от настроек мерчанта.
                Это обеспечивает единообразие для трейдеров.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Code Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Примеры кода</CardTitle>
          <CardDescription>
            Примеры интеграции на популярных языках программирования
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="curl">
            <TabsList>
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="php">PHP</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
            </TabsList>

            <TabsContent value="curl">
              <div className="relative">
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
                  {`# Создание выплаты
curl -X POST ${baseUrl}/api/merchant/payouts \\
  -H "Content-Type: application/json" \\
  -H "x-merchant-api-key: YOUR_API_KEY" \\
  -d '{
    "amount": 5000,
    "methodId": "method_1a2b3c4d5e6f",
    "wallet": "4111111111111111",
    "bank": "SBERBANK",
    "isCard": true,
    "merchantRate": 95.5,
    "externalReference": "PAYOUT-12345",
    "webhookUrl": "https://example.com/webhook/payout"
  }'

# Получение информации о выплате
curl -X GET ${baseUrl}/api/merchant/payouts/py_1a2b3c4d5e6f \\
  -H "x-merchant-api-key: YOUR_API_KEY"`}
                </pre>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() =>
                    copyToClipboard(
                      `# Создание выплаты
curl -X POST ${baseUrl}/api/merchant/payouts \\
  -H "Content-Type: application/json" \\
  -H "x-merchant-api-key: YOUR_API_KEY" \\
  -d '{
    "amount": 5000,
    "methodId": "method_1a2b3c4d5e6f",
    "wallet": "4111111111111111",
    "bank": "SBERBANK",
    "isCard": true,
    "merchantRate": 95.5,
    "externalReference": "PAYOUT-12345",
    "webhookUrl": "https://example.com/webhook/payout"
  }'`,
                      "curl-example",
                    )
                  }
                >
                  {copied === "curl-example" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="javascript">
              <div className="relative">
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
                  {`// Создание выплаты
const createPayout = async () => {
  const response = await fetch('${baseUrl}/api/merchant/payouts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-merchant-api-key': 'YOUR_API_KEY'
    },
    body: JSON.stringify({
      amount: 5000,
      methodId: 'method_1a2b3c4d5e6f',
      wallet: '4111111111111111',
      bank: 'SBERBANK',
      isCard: true,
      merchantRate: 95.5,
      externalReference: 'PAYOUT-12345',
      webhookUrl: 'https://example.com/webhook/payout'
    })
  });

  const data = await response.json();
  console.log('Payout created:', data);
  return data;
};

// Проверка статуса выплаты
const checkPayoutStatus = async (payoutId) => {
  const response = await fetch(\`${baseUrl}/api/merchant/payouts/\${payoutId}\`, {
    headers: {
      'x-merchant-api-key': 'YOUR_API_KEY'
    }
  });

  const data = await response.json();
  console.log('Payout status:', data.payout.status);
  return data;
};

// Создание спора по выплате
const disputePayout = async (payoutId, message, files = []) => {
  const response = await fetch(\`${baseUrl}/api/merchant/payouts/\${payoutId}/dispute\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-merchant-api-key': 'YOUR_API_KEY'
    },
    body: JSON.stringify({
      message: message,
      files: files
    })
  });

  const data = await response.json();
  console.log('Dispute created:', data);
  return data;
};`}
                </pre>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() =>
                    copyToClipboard(
                      `// Создание выплаты
const createPayout = async () => {
  const response = await fetch('${baseUrl}/api/merchant/payouts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-merchant-api-key': 'YOUR_API_KEY'
    },
    body: JSON.stringify({
      amount: 5000,
      methodId: 'method_1a2b3c4d5e6f',
      wallet: '4111111111111111',
      bank: 'SBERBANK',
      isCard: true,
      merchantRate: 95.5,
      externalReference: 'PAYOUT-12345',
      webhookUrl: 'https://example.com/webhook/payout'
    })
  });

  const data = await response.json();
  console.log('Payout created:', data);
  return data;
};`,
                      "js-example",
                    )
                  }
                >
                  {copied === "js-example" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="php">
              <div className="relative">
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
                  {`<?php
// Создание выплаты
function createPayout($apiKey) {
    $data = [
        'amount' => 5000,
        'methodId' => 'method_1a2b3c4d5e6f',
        'wallet' => '4111111111111111',
        'bank' => 'SBERBANK',
        'isCard' => true,
        'merchantRate' => 95.5,
        'externalReference' => 'PAYOUT-12345',
        'webhookUrl' => 'https://example.com/webhook/payout'
    ];

    $ch = curl_init('${baseUrl}/api/merchant/payouts');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'x-merchant-api-key: ' . $apiKey
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $result = json_decode($response, true);

    if ($httpCode == 200) {
        echo "Выплата создана: " . $result['payout']['id'] . PHP_EOL;
        return $result['payout']['id'];
    } else {
        echo "Ошибка: " . $result['error'] . PHP_EOL;
        return false;
    }
}

// Проверка статуса выплаты
function checkPayoutStatus($payoutId, $apiKey) {
    $ch = curl_init('${baseUrl}/api/merchant/payouts/' . $payoutId);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'x-merchant-api-key: ' . $apiKey
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    curl_close($ch);

    $result = json_decode($response, true);
    echo "Статус выплаты: " . $result['payout']['status'] . PHP_EOL;
    return $result;
}

// Создание спора по выплате
function disputePayout($payoutId, $message, $files, $apiKey) {
    $data = [
        'message' => $message,
        'files' => $files
    ];

    $ch = curl_init('${baseUrl}/api/merchant/payouts/' . $payoutId . '/dispute');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'x-merchant-api-key: ' . $apiKey
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    curl_close($ch);

    $result = json_decode($response, true);
    echo "Спор создан" . PHP_EOL;
    return $result;
}

// Использование
$apiKey = 'YOUR_API_KEY';
$payoutId = createPayout($apiKey);
if ($payoutId) {
    checkPayoutStatus($payoutId, $apiKey);
    // Если что-то пошло не так:
    // disputePayout($payoutId, "Средства не получены", [], $apiKey);
}`}
                </pre>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() =>
                    copyToClipboard(
                      `<?php
$data = [
    'amount' => 1000,
    'orderId' => 'ORDER-123',
    'description' => 'Оплата заказа #123'
];

$ch = curl_init('https://api.example.com/api/merchant/transactions');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'x-merchant-api-key: YOUR_API_KEY'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);
print_r($result);`,
                      "php-example",
                    )
                  }
                >
                  {copied === "php-example" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="python">
              <div className="relative">
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
                  {`import requests
import json

BASE_URL = '${baseUrl}'
API_KEY = 'YOUR_API_KEY'

# Создание выплаты
def create_payout():
    url = f'{BASE_URL}/api/merchant/payouts'
    headers = {
        'Content-Type': 'application/json',
        'x-merchant-api-key': API_KEY
    }
    data = {
        'amount': 5000,
        'methodId': 'method_1a2b3c4d5e6f',
        'wallet': '4111111111111111',
        'bank': 'SBERBANK',
        'isCard': True,
        'merchantRate': 95.5,
        'externalReference': 'PAYOUT-12345',
        'webhookUrl': 'https://example.com/webhook/payout'
    }

    response = requests.post(url, headers=headers, json=data)

    if response.status_code == 200:
        result = response.json()
        print(f"Выплата создана: {result['payout']['id']}")
        return result['payout']['id']
    else:
        print(f"Ошибка: {response.json()['error']}")
        return None

# Проверка статуса выплаты
def check_payout_status(payout_id):
    url = f'{BASE_URL}/api/merchant/payouts/{payout_id}'
    headers = {'x-merchant-api-key': API_KEY}

    response = requests.get(url, headers=headers)
    result = response.json()
    print(f"Статус выплаты: {result['payout']['status']}")
    return result

# Создание спора по выплате
def dispute_payout(payout_id, message, files=None):
    url = f'{BASE_URL}/api/merchant/payouts/{payout_id}/dispute'
    headers = {
        'Content-Type': 'application/json',
        'x-merchant-api-key': API_KEY
    }
    data = {
        'message': message,
        'files': files or []
    }

    response = requests.post(url, headers=headers, json=data)
    result = response.json()
    print(f"Спор создан, статус: {result['payout']['status']}")
    return result

# Отмена выплаты
def cancel_payout(payout_id, reason_code):
    url = f'{BASE_URL}/api/merchant/payouts/{payout_id}/cancel'
    headers = {
        'Content-Type': 'application/json',
        'x-merchant-api-key': API_KEY
    }
    data = {
        'reasonCode': reason_code
    }

    response = requests.patch(url, headers=headers, json=data)
    result = response.json()
    print(f"Выплата отменена: {result['payout']['cancelReasonCode']}")
    return result

# Использование
if __name__ == '__main__':
    # Создаем выплату
    payout_id = create_payout()

    if payout_id:
        # Проверяем статус
        check_payout_status(payout_id)

        # Если что-то не так, создаем спор
        # dispute_payout(payout_id, "Средства не получены")

        # Или отменяем выплату
        # cancel_payout(payout_id, "MERCHANT_REQUEST")`}
                </pre>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() =>
                    copyToClipboard(
                      `import requests
import json

url = 'https://api.example.com/api/merchant/transactions'
headers = {
    'Content-Type': 'application/json',
    'x-merchant-api-key': 'YOUR_API_KEY'
}
data = {
    'amount': 1000,
    'orderId': 'ORDER-123',
    'description': 'Оплата заказа #123'
}

response = requests.post(url, headers=headers, json=data)
result = response.json()
print(result)`,
                      "python-example",
                    )
                  }
                >
                  {copied === "python-example" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Коды банков</CardTitle>
          <CardDescription>
            Поддерживаемые значения параметра <code>bank</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <pre className="text-xs whitespace-pre-wrap">
{BANKS.map(b => `${b.code} - ${b.label}`).join('\n')}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
