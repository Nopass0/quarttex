"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { traderApi } from "@/services/api";
import { formatDateTime, cn } from "@/lib/utils";
import { 
  Loader2, 
  ArrowLeft,
  Plus,
  CreditCard,
  Building2,
  Calendar,
  Edit,
  Trash2,
  MoreVertical,
  CheckCircle,
  XCircle,
  Ban,
  Smartphone,
  Copy,
  Eye,
  EyeOff
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getBankIcon, formatCardNumber } from "@/lib/bank-utils";
import { BANKS } from "@/constants/banks";

// Позволяет временно держать пустое значение, но валидирует как число при сабмите
const numberField = (minValue: number) =>
  z.preprocess((val) => {
    if (val === "" || val === null || typeof val === "undefined") return undefined;
    if (typeof val === "string" && val.trim() === "") return undefined;
    const num = typeof val === "number" ? val : Number(val);
    return Number.isNaN(num) ? undefined : num;
  }, z.number().min(minValue));

const formSchema = z.object({
  methodType: z.string().min(1, "Выберите тип метода"),
  bankType: z.string().min(1, "Выберите банк"),
  cardNumber: z.string().optional(),
  recipientName: z.string().min(3, "Введите имя получателя"),
  phoneNumber: z.string().optional(),
  minAmount: numberField(100).optional(),
  maxAmount: numberField(1000).optional(),
  sumLimit: numberField(0).optional(),
  operationLimit: numberField(0).optional(),
  counterpartyLimit: numberField(0).optional(),
  intervalMinutes: numberField(0).optional(),
  isActive: z.boolean().default(true),
});

type FormData = z.input<typeof formSchema>;

interface Requisite {
  id: string;
  cardNumber: string;
  bankType: string;
  recipientName: string;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  minAmount: number;
  maxAmount: number;
  currentTotalAmount: number;
  activeDeals: number;
  methodType: string;
  phoneNumber?: string;
  sumLimit?: number;
  operationLimit?: number;
  counterpartyLimit?: number;
  intervalMinutes?: number;
  transactionsInProgress?: number;
  transactionsReady?: number;
  hasDevice?: boolean;
  device?: {
    id: string;
    name: string;
    isOnline: boolean;
  };
}

interface RequisitesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  existingRequisite?: Requisite;
  devices?: any[];
}

const AVAILABLE_BANKS = BANKS;

const requisiteStatusConfig = {
  ACTIVE: {
    label: "Активен",
    description: "Реквизит активен",
    color: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    badgeColor: "bg-green-50 text-green-700 border-green-200",
    icon: CheckCircle
  },
  INACTIVE: {
    label: "Неактивен",
    description: "Реквизит неактивен",
    color: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600",
    badgeColor: "bg-gray-50 text-gray-700 border-gray-200",
    icon: Ban
  },
  BLOCKED: {
    label: "Заблокирован",
    description: "Реквизит заблокирован",
    color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    badgeColor: "bg-red-50 text-red-700 border-red-200",
    icon: XCircle
  }
};

export function RequisitesSheet({
  open,
  onOpenChange,
  onSuccess,
  existingRequisite,
  devices = [],
}: RequisitesSheetProps) {
  const [loading, setLoading] = useState(false);

  const [requisites, setRequisites] = useState<Requisite[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRequisite, setEditingRequisite] = useState<Requisite | null>(null);
  const [requisitesLoading, setRequisitesLoading] = useState(false);
  const [showCardNumber, setShowCardNumber] = useState<{ [key: string]: boolean }>({});
  const editingId = editingRequisite?.id ?? existingRequisite?.id;
  const isEditing = Boolean(editingId);


  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: {
      methodType: "",
      bankType: "",
      cardNumber: "",
      recipientName: "",
      phoneNumber: "",
      minAmount: 1000,
      maxAmount: 100000,
      sumLimit: 0,
      operationLimit: 0,
      counterpartyLimit: 0,
      intervalMinutes: 0,
      isActive: true,
    },
  });

  // Локальные строки для мгновенного отображения числовых полей
  const [minAmountInput, setMinAmountInput] = useState<string>("");
  const [maxAmountInput, setMaxAmountInput] = useState<string>("");
  const [sumLimitInput, setSumLimitInput] = useState<string>("");
  const [operationLimitInput, setOperationLimitInput] = useState<string>("");
  const [counterpartyLimitInput, setCounterpartyLimitInput] = useState<string>("");
  const [intervalMinutesInput, setIntervalMinutesInput] = useState<string>("");

  useEffect(() => {
    const values = form.getValues();
    // Показываем пустую строку для 0 или undefined
    setMinAmountInput(values.minAmount && values.minAmount !== 0 ? String(values.minAmount) : "");
    setMaxAmountInput(values.maxAmount && values.maxAmount !== 0 ? String(values.maxAmount) : "");
    setSumLimitInput(values.sumLimit && values.sumLimit !== 0 ? String(values.sumLimit) : "");
    setOperationLimitInput(values.operationLimit && values.operationLimit !== 0 ? String(values.operationLimit) : "");
    setCounterpartyLimitInput(values.counterpartyLimit && values.counterpartyLimit !== 0 ? String(values.counterpartyLimit) : "");
    setIntervalMinutesInput(values.intervalMinutes && values.intervalMinutes !== 0 ? String(values.intervalMinutes) : "");
  }, [showForm, existingRequisite, open]);

  const [minAmount, maxAmount, sumLimit, operationLimit, counterpartyLimit, intervalMinutes] = form.watch([
    "minAmount",
    "maxAmount",
    "sumLimit",
    "operationLimit",
    "counterpartyLimit",
    "intervalMinutes",
  ]);
  const hasEmptyRequiredNumbers =
    minAmount === undefined ||
    maxAmount === undefined ||
    sumLimit === undefined ||
    operationLimit === undefined ||
    counterpartyLimit === undefined ||
    intervalMinutes === undefined;

  useEffect(() => {
    if (open && !showForm) {
      fetchRequisites();
    }
  }, [open, showForm]);

  useEffect(() => {
    if (existingRequisite && open) {
      setEditingRequisite(existingRequisite);
      setShowForm(true);
      form.reset({
        methodType: existingRequisite.methodType,
        bankType: existingRequisite.bankType,
        cardNumber: existingRequisite.cardNumber,
        recipientName: existingRequisite.recipientName,
        phoneNumber: existingRequisite.phoneNumber,
        minAmount: existingRequisite.minAmount,
        maxAmount: existingRequisite.maxAmount,
        sumLimit: existingRequisite.sumLimit || 0,
        operationLimit: existingRequisite.operationLimit || 0,
        counterpartyLimit: existingRequisite.counterpartyLimit || 0,
        intervalMinutes: existingRequisite.intervalMinutes || 0,
        isActive: existingRequisite.isActive,
        trafficPreference: existingRequisite.trafficPreference || 'ANY',
      });
      // Обновляем локальные состояния для числовых полей
      setMinAmountInput(existingRequisite.minAmount && existingRequisite.minAmount !== 0 ? String(existingRequisite.minAmount) : "");
      setMaxAmountInput(existingRequisite.maxAmount && existingRequisite.maxAmount !== 0 ? String(existingRequisite.maxAmount) : "");
      setSumLimitInput(existingRequisite.sumLimit && existingRequisite.sumLimit !== 0 ? String(existingRequisite.sumLimit) : "");
      setOperationLimitInput(existingRequisite.operationLimit && existingRequisite.operationLimit !== 0 ? String(existingRequisite.operationLimit) : "");
      setCounterpartyLimitInput(existingRequisite.counterpartyLimit && existingRequisite.counterpartyLimit !== 0 ? String(existingRequisite.counterpartyLimit) : "");
      setIntervalMinutesInput(existingRequisite.intervalMinutes && existingRequisite.intervalMinutes !== 0 ? String(existingRequisite.intervalMinutes) : "");
    } else if (!existingRequisite && open) {
      // Reset to list view when opening without a requisite
      setShowForm(false);
      setEditingRequisite(null);
    }
  }, [existingRequisite, open, form]);

  const fetchRequisites = async () => {
    try {
      setRequisitesLoading(true);
      const response = await traderApi.getRequisites();
      setRequisites(response || []);
    } catch (error) {
      console.error("Failed to fetch requisites:", error);
      toast.error("Не удалось загрузить реквизиты");
    } finally {
      setRequisitesLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingRequisite(null);
    form.reset();
    // Очищаем локальные состояния для числовых полей
    setMinAmountInput("");
    setMaxAmountInput("");
    setSumLimitInput("");
    setOperationLimitInput("");
    setCounterpartyLimitInput("");
    setIntervalMinutesInput("");
    setShowForm(true);
  };

  const handleEdit = (requisite: Requisite) => {
    setEditingRequisite(requisite);
    form.reset({
      methodType: requisite.methodType,
      bankType: requisite.bankType,
      cardNumber: requisite.cardNumber,
      recipientName: requisite.recipientName,
      phoneNumber: requisite.phoneNumber,
      minAmount: requisite.minAmount,
      maxAmount: requisite.maxAmount,
      sumLimit: requisite.sumLimit || 0,
      operationLimit: requisite.operationLimit || 0,
      counterpartyLimit: requisite.counterpartyLimit || 0,
      intervalMinutes: requisite.intervalMinutes || 0,
      isActive: !requisite.isArchived,
      trafficPreference: requisite.trafficPreference || 'ANY',
    });
    // Обновляем локальные состояния для числовых полей
    setMinAmountInput(requisite.minAmount && requisite.minAmount !== 0 ? String(requisite.minAmount) : "");
    setMaxAmountInput(requisite.maxAmount && requisite.maxAmount !== 0 ? String(requisite.maxAmount) : "");
    setSumLimitInput(requisite.sumLimit && requisite.sumLimit !== 0 ? String(requisite.sumLimit) : "");
    setOperationLimitInput(requisite.operationLimit && requisite.operationLimit !== 0 ? String(requisite.operationLimit) : "");
    setCounterpartyLimitInput(requisite.counterpartyLimit && requisite.counterpartyLimit !== 0 ? String(requisite.counterpartyLimit) : "");
    setIntervalMinutesInput(requisite.intervalMinutes && requisite.intervalMinutes !== 0 ? String(requisite.intervalMinutes) : "");
    setShowForm(true);
  };

  const handleDelete = async (requisiteId: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот реквизит?")) return;

    try {
      await traderApi.deleteRequisite(requisiteId);
      toast.success("Реквизит удален");
      fetchRequisites();
    } catch (error) {
      console.error("Failed to delete requisite:", error);
      toast.error("Не удалось удалить реквизит");
    }
  };

  const handleArchive = async (requisite: Requisite) => {
    try {
      await traderApi.updateRequisite(requisite.id, { isArchived: !requisite.isArchived });
      toast.success(requisite.isArchived ? "Реквизит разархивирован" : "Реквизит архивирован");
      fetchRequisites();
    } catch (error) {
      console.error("Failed to archive/unarchive requisite:", error);
      toast.error("Не удалось изменить статус архивации");
    }
  };

  const handleToggleActive = async (requisite: Requisite) => {
    try {
      if (requisite.isActive) {
        await traderApi.stopRequisite(requisite.id);
        toast.success("Реквизит деактивирован");
      } else {
        await traderApi.startRequisite(requisite.id);
        toast.success("Реквизит активирован");
      }
      fetchRequisites();
    } catch (error) {
      console.error("Failed to toggle requisite status:", error);
      toast.error("Не удалось изменить статус реквизита");
    }
  };

  const copyCardNumber = (cardNumber: string) => {
    navigator.clipboard.writeText(cardNumber.replace(/\s/g, ""));
    toast.success("Номер карты скопирован");
  };

  const toggleShowCardNumber = (requisiteId: string) => {
    setShowCardNumber(prev => ({
      ...prev,
      [requisiteId]: !prev[requisiteId]
    }));
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      if (
        data.minAmount === undefined ||
        data.maxAmount === undefined ||
        data.sumLimit === undefined ||
        data.operationLimit === undefined ||
        data.counterpartyLimit === undefined ||
        data.intervalMinutes === undefined
      ) {
        toast.error("Заполните все числовые поля");
        return;
      }

      // Validate required fields based on method type
      if (data.methodType === "c2c" && !data.cardNumber) {
        toast.error("Введите номер карты");
        return;
      }

      // При редактировании СБП реквизитов номер телефона не требуется (он заблокирован)
      if (data.methodType === "sbp" && !data.phoneNumber && !isEditing) {
        toast.error("Введите номер телефона");
        return;
      }


      const requisiteData: any = {
        recipientName: data.recipientName,
        minAmount: Number(data.minAmount),
        maxAmount: Number(data.maxAmount),
        sumLimit: Number(data.sumLimit),
        operationLimit: Number(data.operationLimit),
        counterpartyLimit: Number(data.counterpartyLimit),
        intervalMinutes: Number(data.intervalMinutes || 0),
        isActive: data.isActive,
        deviceId: null,
        trafficPreference: data.trafficPreference || 'ANY',
      };

      if (!isEditing) {
        requisiteData.methodType = data.methodType;
        requisiteData.bankType = data.bankType;
        requisiteData.cardNumber = data.methodType === "sbp" ? (data.phoneNumber || "") : (data.cardNumber || "");
      }

      if (editingId) {
        await traderApi.updateRequisite(editingId, requisiteData);
        toast.success("Реквизит обновлен");
      } else {
        await traderApi.createRequisite(requisiteData);
        toast.success("Реквизит добавлен");
      }



      form.reset();
      setEditingRequisite(null);
      setShowForm(false);
      onSuccess?.();
      onOpenChange(false); // Close the sheet
    } catch (error: any) {
      console.error("Error saving requisite:", error);
      toast.error(error.response?.data?.error || "Не удалось сохранить реквизит");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setShowForm(false);
    setEditingRequisite(null);
    form.reset();
  };

  const maskCardNumber = (cardNumber: string) => {
    if (!cardNumber) return "";
    const cleaned = cardNumber.replace(/\s/g, "");
    return cleaned.replace(/(\d{4})(\d{2})(\d+)(\d{4})/, "$1 $2** **** $4");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            {showForm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <SheetTitle>
              {showForm
                ? editingRequisite
                  ? "Редактировать реквизит"
                  : "Добавить реквизит"
                : "Реквизиты"
              }
            </SheetTitle>
          </div>
          <SheetDescription>
            {showForm
              ? "Заполните данные для банковского реквизита"
              : "Управление платежными реквизитами"
            }
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {!showForm ? (
            <div className="space-y-4">
              <Button onClick={handleAddNew} className="w-full bg-[#006039] hover:bg-[#006039]/90">
                <Plus className="h-4 w-4 mr-2" />
                Добавить реквизит
              </Button>

              {requisitesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : requisites.length === 0 ? (
                <Card className="p-8 text-center">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Нет реквизитов</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Добавьте реквизиты для приема платежей
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {requisites.map((requisite) => {
                    const status = requisite.isActive ? "ACTIVE" : "INACTIVE";
                    const statusConfig = requisiteStatusConfig[status as keyof typeof requisiteStatusConfig];
                    const StatusIcon = statusConfig?.icon || CheckCircle;

                    return (
                      <Card key={requisite.id} className="p-4">
                        <div className="space-y-3">
                          {/* Header with status */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "p-2 rounded-lg",
                                statusConfig?.color?.split(" ")[0] || "bg-gray-100"
                              )}>
                                <StatusIcon className="h-4 w-4" />
                              </div>
                              <Badge className={cn(
                                "text-xs",
                                statusConfig?.badgeColor || "bg-gray-50 text-gray-700 border-gray-200"
                              )}>
                                {requisite.isActive ? "В работе" : "Неактивен"}
                              </Badge>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(requisite)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Редактировать
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleArchive(requisite)}>
                                  <Ban className="mr-2 h-4 w-4" />
                                  {requisite.isArchived ? "Разархивировать" : "Архивировать"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(requisite.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Удалить
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Bank and card info */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              {getBankIcon(requisite.bankType, "sm")}
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  {requisite.recipientName}
                                </p>
                                {requisite.device && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Smartphone className="h-3 w-3" />
                                    <span>{requisite.device.name}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Card number with show/hide */}
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {showCardNumber[requisite.id] 
                                  ? formatCardNumber(requisite.cardNumber)
                                  : maskCardNumber(requisite.cardNumber)}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleShowCardNumber(requisite.id)}
                                className="h-8 w-8 p-0"
                              >
                                {showCardNumber[requisite.id] ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyCardNumber(requisite.cardNumber)}
                                className="h-8 w-8 p-0"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Method type and additional info */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Метод: {requisite.methodType === 'sbp' ? 'СБП' : requisite.methodType === 'c2c' ? 'C2C' : requisite.methodType || ''}</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDateTime(requisite.createdAt)}
                            </span>
                          </div>

                          {/* Limits */}
                          <div className="pt-2 border-t space-y-1 text-xs">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-muted-foreground">Лимиты суммы:</span>
                                <span className="ml-1 font-medium">
                                  {(requisite.minAmount || 0).toLocaleString()} - {(requisite.maxAmount || 0).toLocaleString()} ₽
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Активные сделки:</span>
                                <span className="ml-1 font-medium">
                                  {requisite.activeDeals || 0}
                                </span>
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Общий лимит суммы:</span>
                              <span className="ml-1 font-medium">
                                {(requisite.currentTotalAmount || 0).toLocaleString()} / {requisite.sumLimit === 0 ? '∞' : (requisite.sumLimit || 0).toLocaleString()} ₽
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Лимит операций:</span>
                              <span className="ml-1 font-medium">
                                {((requisite.activeDeals || 0) + (requisite.transactionsReady || 0))} / {requisite.operationLimit === 0 ? '∞' : (requisite.operationLimit || 0)}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Интервал:</span>
                              <span className="ml-1 font-medium">
                                {requisite.intervalMinutes === 0 ? 'без ограничений' : `${requisite.intervalMinutes || 0} мин`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="methodType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Тип метода</FormLabel>

                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isEditing || loading}
                      >

                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите тип метода" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sbp">СБП</SelectItem>
                          <SelectItem value="c2c">C2C</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bankType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Банк</FormLabel>

                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isEditing || loading}
                      >

                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите банк" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {AVAILABLE_BANKS.map((bank) => (
                            <SelectItem key={bank.code} value={bank.code}>
                              {bank.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("methodType") === "c2c" && (
                  <FormField
                    control={form.control}
                    name="cardNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Номер карты</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="1234 5678 9012 3456"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\s/g, "");
                              field.onChange(value);
                            }}

                            disabled={isEditing || loading}

                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="recipientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Имя получателя</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Иван Иванович И." 
                          {...field} 
                          disabled={loading}
                        />
                      </FormControl>
                      <FormDescription>
                        Полное имя как на карте
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("methodType") === "sbp" && (
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Номер телефона</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="+7 900 123 45 67" 
                            {...field} 
                            disabled={isEditing || loading}
                          />
                        </FormControl>
                        <FormDescription>
                          {isEditing ? "Номер телефона нельзя изменить" : "Обязательно для СБП"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="minAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Мин. сумма</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="1000"
                            value={minAmountInput}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const digitsOnly = raw.replace(/\D/g, "");
                              setMinAmountInput(digitsOnly);
                              form.setValue("minAmount", digitsOnly === "" ? undefined : Number(digitsOnly), { 
                                shouldValidate: false, 
                                shouldDirty: true 
                              });
                            }}
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Макс. сумма</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="100000"
                            value={maxAmountInput}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const digitsOnly = raw.replace(/\D/g, "");
                              setMaxAmountInput(digitsOnly);
                              form.setValue("maxAmount", digitsOnly === "" ? undefined : Number(digitsOnly), { 
                                shouldValidate: false, 
                                shouldDirty: true 
                              });
                            }}
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sumLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Общий лимит суммы (₽)</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="0"
                            value={sumLimitInput}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const digitsOnly = raw.replace(/\D/g, "");
                              setSumLimitInput(digitsOnly);
                              form.setValue("sumLimit", digitsOnly === "" ? undefined : Number(digitsOnly), { 
                                shouldValidate: false, 
                                shouldDirty: true 
                              });
                            }}
                            disabled={loading}
                          />
                        </FormControl>
                        <FormDescription>0 = без ограничений</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="operationLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Лимит операций</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="0"
                            value={operationLimitInput}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const digitsOnly = raw.replace(/\D/g, "");
                              setOperationLimitInput(digitsOnly);
                              form.setValue("operationLimit", digitsOnly === "" ? undefined : Number(digitsOnly), { 
                                shouldValidate: false, 
                                shouldDirty: true 
                              });
                            }}
                            disabled={loading}
                          />
                        </FormControl>
                        <FormDescription>0 = без ограничений</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="counterpartyLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Кол-во контрагентов</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="0"
                          value={counterpartyLimitInput}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const digitsOnly = raw.replace(/\D/g, "");
                            setCounterpartyLimitInput(digitsOnly);
                            form.setValue("counterpartyLimit", digitsOnly === "" ? undefined : Number(digitsOnly), { 
                              shouldValidate: false, 
                              shouldDirty: true 
                            });
                          }}
                          disabled={loading}
                        />
                      </FormControl>
                      <FormDescription>
                        Максимальное количество уникальных клиентов. 0 = без ограничений
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="intervalMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Интервал между сделками (мин)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="0"
                          value={intervalMinutesInput}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const digitsOnly = raw.replace(/\D/g, "");
                            setIntervalMinutesInput(digitsOnly);
                            form.setValue("intervalMinutes", digitsOnly === "" ? undefined : Number(digitsOnly), { 
                              shouldValidate: false, 
                              shouldDirty: true 
                            });
                          }}
                          disabled={loading}
                        />
                      </FormControl>
                      <FormDescription>
                        Минимальный интервал между новыми сделками на этом реквизите. 0 = без ограничений
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {editingRequisite && (
                  <>
                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => {
                        const status = field.value ? "ACTIVE" : "INACTIVE";
                        const statusConfig = requisiteStatusConfig[status as keyof typeof requisiteStatusConfig];
                        const StatusIcon = statusConfig?.icon || CheckCircle;
                        
                        return (
                          <>
                            {/* Status Badge */}
                            <div className="flex items-center gap-2 mb-4">
                              <div className={cn(
                                "p-2 rounded-lg",
                                statusConfig?.color?.split(" ")[0] || "bg-gray-100"
                              )}>
                                <StatusIcon className="h-4 w-4" />
                              </div>
                              <Badge className={cn(
                                "text-xs",
                                statusConfig?.badgeColor || "bg-gray-50 text-gray-700 border-gray-200"
                              )}>
                                {field.value ? "В работе" : "Неактивен"}
                              </Badge>
                            </div>
                            
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Активный реквизит</FormLabel>
                                <FormDescription>
                                  Реквизит будет доступен для приема платежей
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={loading}
                                />
                              </FormControl>
                            </FormItem>
                          </>
                        );
                      }}
                    />
                  </>
                )}

                <SheetFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={loading}
                  >
                    Отмена
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || !form.formState.isValid || hasEmptyRequiredNumbers}
                    className="bg-[#006039] hover:bg-[#006039]/90"
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingRequisite ? "Сохранить" : "Добавить"}
                  </Button>
                </SheetFooter>
              </form>
            </Form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}