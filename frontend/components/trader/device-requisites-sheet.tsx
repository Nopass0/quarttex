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
import { PhoneInput, CardNumberInput } from "@/components/ui/formatted-input";
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
  TrendingUp,
  DollarSign
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getBankIcon } from "@/lib/bank-utils";
import { BANKS } from "@/constants/banks";

// Препроцессинг чисел: позволяет временно держать пустое значение в инпутах,
// но требует число при валидации (кнопка Сохранить будет неактивна)
const numberField = (minValue: number) =>
  z.preprocess((val) => {
    if (val === "" || val === null || typeof val === "undefined") return undefined;
    if (typeof val === "string" && val.trim() === "") return undefined;
    const num = typeof val === "number" ? val : Number(val);
    return Number.isNaN(num) ? undefined : num;
  }, z.number().min(minValue));

const formSchema = z.object({
  methodId: z.string().min(1, "Выберите метод"),
  bankType: z.string().min(1, "Выберите банк"),
  cardNumber: z.string().optional(),
  recipientName: z.string().min(3, "Введите имя получателя"),
  phoneNumber: z.string().optional(),
  // Делаем опциональными, чтобы не мешать стиранию; валидируем вручную
  minAmount: numberField(100).optional(),
  maxAmount: numberField(1000).optional(),
  operationLimit: numberField(0).optional(),
  sumLimit: numberField(0).optional(),
  intervalMinutes: numberField(0).optional(),
  isActive: z.boolean().default(true),
});

// Используем тип входных данных схемы, чтобы совместить типы с zodResolver (он ожидает input-тип)
type FormData = z.input<typeof formSchema>;

interface Method {
  id: string;
  name: string;
  type: string;
  minAmount: number;
  maxAmount: number;
  minPayin: number;
  maxPayin: number;
}

interface DeviceRequisite {
  id: string;
  cardNumber: string;
  bankType: string;
  recipientName: string;
  isArchived: boolean;
  isActive: boolean;
  currentTotalAmount: number;
  operationLimit: number;
  sumLimit: number;
  intervalMinutes?: number;
  activeDeals: number;
  minAmount: number;
  maxAmount: number;
  methodType?: string;
  transactionsInProgress?: number;
  transactionsReady?: number;
  phoneNumber?: string;
  method?: {
    id: string;
    type: string;
    name: string;
  };
}

interface DeviceRequisitesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: string;
  onSuccess?: () => void;
  existingRequisite?: DeviceRequisite;
}

const AVAILABLE_BANKS = BANKS;

export function DeviceRequisitesSheet({
  open,
  onOpenChange,
  deviceId,
  onSuccess,
  existingRequisite,
}: DeviceRequisitesSheetProps) {
  const [loading, setLoading] = useState(false);
  const [requisites, setRequisites] = useState<DeviceRequisite[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRequisite, setEditingRequisite] = useState<DeviceRequisite | null>(null);
  const [requisitesLoading, setRequisitesLoading] = useState(false);
  const editingId = editingRequisite?.id ?? existingRequisite?.id;

  const isEditing = Boolean(editingId);



  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: {
      methodId: "",
      bankType: "",
      cardNumber: "",
      recipientName: "",
      phoneNumber: "",
      minAmount: 1000,
      maxAmount: 100000,
      operationLimit: 0,
      sumLimit: 0,
      intervalMinutes: 0,
      isActive: true,
    },
  });

  // Локальные строки для мгновенного отображения и полной очистки инпутов
  const [minAmountInput, setMinAmountInput] = useState<string>("");
  const [maxAmountInput, setMaxAmountInput] = useState<string>("");
  const [operationLimitInput, setOperationLimitInput] = useState<string>("");
  const [sumLimitInput, setSumLimitInput] = useState<string>("");
  const [counterpartyLimitInput, setCounterpartyLimitInput] = useState<string>("");
  const [intervalMinutesInput, setIntervalMinutesInput] = useState<string>("");

  useEffect(() => {
    // Инициализируем строки из текущих значений формы
    const values = form.getValues();
    setMinAmountInput(values.minAmount !== undefined ? String(values.minAmount) : "");
    setMaxAmountInput(values.maxAmount !== undefined ? String(values.maxAmount) : "");
    setOperationLimitInput(values.operationLimit !== undefined ? String(values.operationLimit) : "");
    setSumLimitInput(values.sumLimit !== undefined ? String(values.sumLimit) : "");
    setCounterpartyLimitInput(values.counterpartyLimit !== undefined ? String(values.counterpartyLimit) : "");
    setIntervalMinutesInput(values.intervalMinutes !== undefined ? String(values.intervalMinutes) : "");
  }, [showForm]);

  // Блокируем сохранение, если любой из инпутов пуст
  const hasEmptyRequiredNumbers =
    minAmountInput === "" ||
    maxAmountInput === "" ||
    operationLimitInput === "" ||
    sumLimitInput === "" ||
    counterpartyLimitInput === "" ||
    intervalMinutesInput === "";

  useEffect(() => {
    if (open && !showForm) {
      fetchRequisites();
      fetchMethods();
    }
  }, [open, showForm, deviceId]);

  useEffect(() => {
    if (existingRequisite) {
      setEditingRequisite(existingRequisite);
      setShowForm(true);

      // Determine method type even if method object is missing
      const methodType =
        existingRequisite.method?.type ||
        (existingRequisite.cardNumber.length <= 12 ? "sbp" : "c2c");

      const method = methods.find((m) => m.type === methodType);
      if (method) {
        setSelectedMethod(method);
        form.setValue("methodId", method.type);
      }

      form.reset({
        methodId: methodType,
        bankType: existingRequisite.bankType,
        cardNumber: methodType === "c2c" ? existingRequisite.cardNumber : "",
        recipientName: existingRequisite.recipientName,
        phoneNumber:
          methodType === "sbp"
            ? existingRequisite.phoneNumber || existingRequisite.cardNumber || ""
            : "",
        minAmount: existingRequisite.minAmount,
        maxAmount: existingRequisite.maxAmount,
        operationLimit: existingRequisite.operationLimit || 0,
        sumLimit: existingRequisite.sumLimit || 0,
        counterpartyLimit: existingRequisite.counterpartyLimit || 0,
        intervalMinutes: existingRequisite.intervalMinutes || 0,
        isActive: existingRequisite.isActive ?? true,
      });
      setMinAmountInput(String(existingRequisite.minAmount ?? ""));
      setMaxAmountInput(String(existingRequisite.maxAmount ?? ""));
      setOperationLimitInput(String(existingRequisite.operationLimit ?? ""));
      setSumLimitInput(String(existingRequisite.sumLimit ?? ""));
      setCounterpartyLimitInput(String(existingRequisite.counterpartyLimit ?? ""));
      setIntervalMinutesInput(String(existingRequisite.intervalMinutes ?? ""));
    }
  }, [existingRequisite, methods, form]);

  const fetchRequisites = async () => {
    try {
      setRequisitesLoading(true);
      const response = await traderApi.getDevice(deviceId);
      setRequisites(response.linkedBankDetails || []);
    } catch (error) {
      console.error("Failed to fetch device requisites:", error);
      toast.error("Не удалось загрузить реквизиты");
    } finally {
      setRequisitesLoading(false);
    }
  };

  const fetchMethods = async () => {
    try {
      const response = await traderApi.getMethods();
      const methodsData = response.data || response.methods || response || [];
      setMethods(Array.isArray(methodsData) ? methodsData : []);
    } catch (error) {
      console.error("Error fetching methods:", error);
      toast.error("Не удалось загрузить методы");
    }
  };

  const handleAddNew = () => {
    setEditingRequisite(null);
    form.reset({
      methodId: "",
      bankType: "",
      cardNumber: "",
      recipientName: "",
      phoneNumber: "",
      minAmount: 1000,
      maxAmount: 100000,
      operationLimit: 0,
      sumLimit: 0,
      counterpartyLimit: 0,
      intervalMinutes: 0,
      isActive: true,
    });
    setMinAmountInput("1000");
    setMaxAmountInput("100000");
    setOperationLimitInput("0");
    setSumLimitInput("0");
    setCounterpartyLimitInput("0");
    setIntervalMinutesInput("0");
    setShowForm(true);
  };

  const handleEdit = (requisite: DeviceRequisite) => {
    setEditingRequisite(requisite);
    // Pre-select method based on method type or card number pattern
    let methodType =
      requisite.method?.type || (requisite.cardNumber.length <= 12 ? "sbp" : "c2c");
    const method = methods.find(m => m.type === methodType);
    if (method) {
      setSelectedMethod(method);
      form.setValue("methodId", methodType);
    }
    
    form.reset({
      methodId: methodType,
      bankType: requisite.bankType,
      cardNumber: methodType === "c2c" ? requisite.cardNumber : "",
      recipientName: requisite.recipientName,
      phoneNumber:
        methodType === "sbp"
          ? requisite.phoneNumber || requisite.cardNumber || ""
          : "",
      minAmount: requisite.minAmount,
      maxAmount: requisite.maxAmount,
      operationLimit: requisite.operationLimit || 0,
      sumLimit: requisite.sumLimit || 0,
      counterpartyLimit: requisite.counterpartyLimit || 0,
      intervalMinutes: requisite.intervalMinutes || 0,
      isActive: requisite.isActive ?? true,
    });
    setMinAmountInput(String(requisite.minAmount ?? ""));
    setMaxAmountInput(String(requisite.maxAmount ?? ""));
    setOperationLimitInput(String(requisite.operationLimit ?? ""));
    setSumLimitInput(String(requisite.sumLimit ?? ""));
    setCounterpartyLimitInput(String(requisite.counterpartyLimit ?? ""));
    setIntervalMinutesInput(String(requisite.intervalMinutes ?? ""));
    setShowForm(true);
  };

  const handleDelete = async (requisiteId: string) => {
    if (!confirm("Вы уверены, что хотите отвязать этот реквизит от устройства?")) return;

    try {
      await traderApi.unlinkDevice(deviceId, requisiteId);
      toast.success("Реквизит отвязан от устройства");
      fetchRequisites();
    } catch (error) {
      console.error("Failed to unlink requisite:", error);
      toast.error("Не удалось отвязать реквизит");
    }
  };

  const handleToggleArchive = async (requisite: DeviceRequisite) => {
    try {
      await traderApi.updateRequisite(requisite.id, {
        isArchived: !requisite.isArchived,
      });
      toast.success(requisite.isArchived ? "Реквизит активирован" : "Реквизит архивирован");
      fetchRequisites();
    } catch (error) {
      console.error("Failed to toggle requisite status:", error);
      toast.error("Не удалось изменить статус реквизита");
    }
  };

  const handleMethodChange = (methodType: string) => {
    const method = methods.find(m => m.type === methodType);
    
    // If method not found in methods array, create a default one
    const selectedMethodData = method || {
      id: methodType,
      name: methodType === 'sbp' ? 'СБП' : 'C2C',
      type: methodType,
      minAmount: 1000,
      maxAmount: 100000,
      minPayin: 1000,
      maxPayin: 100000
    };
    
    setSelectedMethod(selectedMethodData);
    
    form.setValue("minAmount", selectedMethodData.minPayin || 1000);
    form.setValue("maxAmount", selectedMethodData.maxPayin || 100000);
    form.setValue("bankType", "");
    setMinAmountInput(String(selectedMethodData.minPayin || 1000));
    setMaxAmountInput(String(selectedMethodData.maxPayin || 100000));
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      // Обязательные числовые поля должны быть заполнены
      if (
        data.minAmount === undefined ||
        data.maxAmount === undefined ||
        data.operationLimit === undefined ||
        data.sumLimit === undefined ||
        data.intervalMinutes === undefined
      ) {
        toast.error("Заполните все числовые поля");
        return;
      }


      if (!selectedMethod) {
        toast.error("Выберите метод");
        return;
      }

      // Validate required fields based on method type
      if (selectedMethod.type === "c2c" && !data.cardNumber) {
        toast.error("Введите номер карты");
        return;
      }

      // При редактировании СБП реквизитов номер телефона не требуется (он заблокирован)
      if (selectedMethod.type === "sbp" && !data.phoneNumber && !isEditing) {
        toast.error("Введите номер телефона");
        return;
      }

      const actualMethod = methods.find(m => m.type === selectedMethod.type);

      const requisiteData: any = {
        recipientName: data.recipientName,
        minAmount: Number(data.minAmount),
        maxAmount: Number(data.maxAmount),
        operationLimit: Number(data.operationLimit),
        sumLimit: Number(data.sumLimit),
        intervalMinutes: Number(data.intervalMinutes || 0),
        isActive: data.isActive ?? true,
        deviceId,
        isArchived: editingRequisite ? editingRequisite.isArchived : existingRequisite?.isArchived ?? false,
      };

      if (!isEditing) {

        requisiteData.methodId = actualMethod?.id || data.methodId;
        requisiteData.methodType = selectedMethod.type;
        requisiteData.cardNumber = selectedMethod.type === "sbp" ? (data.phoneNumber || "") : (data.cardNumber || "");
        requisiteData.bankType = data.bankType;
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
      await fetchRequisites();
      setShowForm(false);
      onSuccess?.();
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
                : "Реквизиты устройства"
              }
            </SheetTitle>
          </div>
          <SheetDescription>
            {showForm
              ? "Заполните данные для банковского реквизита"
              : "Управление реквизитами устройства"
            }
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {!showForm ? (
            <div className="space-y-4">
              <Button onClick={handleAddNew} className="w-full">
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
                  <p className="text-gray-500">Нет привязанных реквизитов</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Добавьте реквизиты для приема платежей через это устройство
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {requisites.map((requisite) => (
                    <Card key={requisite.id} className="p-4">
                      <div className="space-y-3">
                        {/* Header with status */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={requisite.isActive ? "default" : "secondary"}>
                              {requisite.isActive ? 'Активен' : 'Неактивен'}
                            </Badge>
                            {requisite.isArchived && (
                              <Badge variant="secondary">В архиве</Badge>
                            )}
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
                              <DropdownMenuItem onClick={() => handleToggleArchive(requisite)}>
                                {requisite.isArchived ? (
                                  <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Активировать
                                  </>
                                ) : (
                                  <>
                                    <Ban className="mr-2 h-4 w-4" />
                                    Архивировать
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(requisite.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Отвязать от устройства
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Bank and card info */}
                        <div className="flex items-center gap-3">
                          {getBankIcon(requisite.bankType, "sm")}
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {requisite.cardNumber.replace(/(\d{4})/g, '$1 ').trim()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {requisite.recipientName}
                            </p>
                          </div>
                        </div>

                        {/* Method type */}
                        <div className="flex items-center gap-2 pt-2 border-t text-xs text-muted-foreground">
                          <span>Метод: {requisite.methodType === 'sbp' ? 'СБП' : requisite.methodType === 'c2c' ? 'C2C' : requisite.method?.type || ''}</span>
                        </div>

                        {/* Limits */}
                        <div className="space-y-1 text-xs">
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
                              {((requisite.activeDeals || 0) + (requisite.transactionsReady || 0))} / {requisite.operationLimit === 0 ? '∞' : requisite.operationLimit}
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
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="methodId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Тип метода</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleMethodChange(value);
                        }}
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
                      {selectedMethod && (
                        <FormDescription>
                          Лимиты: {selectedMethod.minAmount} - {selectedMethod.maxAmount} ₽
                        </FormDescription>
                      )}
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
                          disabled={isEditing || !form.watch("methodId") || loading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={
                                !form.watch("methodId") ? "Сначала выберите метод" : "Выберите банк"
                              } />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {AVAILABLE_BANKS.filter(bank => bank.code !== "SBP").map((bank) => (
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

                {selectedMethod?.type === "c2c" && (
                  <FormField
                    control={form.control}
                    name="cardNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Номер карты</FormLabel>
                        <FormControl>
                          <CardNumberInput
                            value={field.value}
                            onChange={field.onChange}
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
                          disabled={isEditing || loading}
                        />
                      </FormControl>
                      <FormDescription>
                        Полное имя как на карте
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedMethod?.type === "sbp" && (
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Номер телефона</FormLabel>
                        <FormControl>
                          <PhoneInput
                            value={field.value}
                            onChange={field.onChange}
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
                            placeholder="1000"
                            value={minAmountInput}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const digitsOnly = raw.replace(/\D/g, "");
                              setMinAmountInput(digitsOnly);
                              form.setValue("minAmount", digitsOnly === "" ? undefined : Number(digitsOnly), { shouldValidate: false, shouldDirty: true });
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
                            placeholder="100000"
                            value={maxAmountInput}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const digitsOnly = raw.replace(/\D/g, "");
                              setMaxAmountInput(digitsOnly);
                              form.setValue("maxAmount", digitsOnly === "" ? undefined : Number(digitsOnly), { shouldValidate: false, shouldDirty: true });
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
                    name="operationLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Лимит операций (всего)</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={operationLimitInput}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const digitsOnly = raw.replace(/\D/g, "");
                              setOperationLimitInput(digitsOnly);
                              form.setValue("operationLimit", digitsOnly === "" ? undefined : Number(digitsOnly), { shouldValidate: false, shouldDirty: true });
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
                    name="sumLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Лимит общей суммы (₽)</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={sumLimitInput}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const digitsOnly = raw.replace(/\D/g, "");
                              setSumLimitInput(digitsOnly);
                              form.setValue("sumLimit", digitsOnly === "" ? undefined : Number(digitsOnly), { shouldValidate: false, shouldDirty: true });
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
                          placeholder="0"
                          value={intervalMinutesInput}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const digitsOnly = raw.replace(/\D/g, "");
                            setIntervalMinutesInput(digitsOnly);
                            form.setValue("intervalMinutes", digitsOnly === "" ? undefined : Number(digitsOnly), { shouldValidate: false, shouldDirty: true });
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

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Активен</FormLabel>
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
                  )}
                />

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
                    disabled={loading || hasEmptyRequiredNumbers}
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