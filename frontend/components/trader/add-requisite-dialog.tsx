"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { traderApi } from "@/services/api";
import { Loader2 } from "lucide-react";
import { DeviceSelector } from "@/components/ui/device-selector";

const numberField = (minValue: number) =>
  z.preprocess((val) => {
    if (val === "" || val === null || typeof val === "undefined") return undefined;
    if (typeof val === "string" && val.trim() === "") return undefined;
    const num = typeof val === "number" ? val : Number(val);
    return Number.isNaN(num) ? undefined : num;
  }, z.number().min(minValue));

const formSchema = z.object({
  deviceId: z.string().min(1, "Выберите устройство"),
  methodId: z.string().min(1, "Выберите метод"),
  bankType: z.string().min(1, "Выберите банк"),
  cardNumber: z.string().optional(),
  recipientName: z.string().min(3, "Введите имя получателя"),
  phoneNumber: z.string().optional(),
  minAmount: numberField(100),
  maxAmount: numberField(1000),
  dailyLimit: numberField(0),
  monthlyLimit: numberField(0),
  maxCountTransactions: numberField(0),
});

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

interface Device {
  id: string;
  name: string;
  isOnline: boolean;
  isWorking: boolean;
  linkedBankDetails: number;
  firstConnectionAt?: string | null;
}

interface AddRequisiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId?: string;
  onSuccess?: () => void;
}

const AVAILABLE_BANKS = [
  { code: "SBERBANK", label: "Сбербанк" },
  { code: "TBANK", label: "Т-Банк" },
  { code: "VTB", label: "ВТБ" },
  { code: "ALFABANK", label: "Альфа-Банк" },
  { code: "RAIFFEISEN", label: "Райффайзенбанк" },
  { code: "GAZPROMBANK", label: "Газпромбанк" },
  { code: "OTPBANK", label: "ОТП Банк" },
  { code: "OTKRITIE", label: "Открытие" },
  { code: "ROSBANK", label: "Росбанк" },
  { code: "PROMSVYAZBANK", label: "Промсвязьбанк" },
  { code: "SOVCOMBANK", label: "Совкомбанк" },
  { code: "POCHTABANK", label: "Почта Банк" },
  { code: "ROSSELKHOZBANK", label: "Россельхозбанк" },
  { code: "MKB", label: "МКБ" },
  { code: "URALSIB", label: "Уралсиб" },
  { code: "AKBARS", label: "Ак Барс" },
  { code: "SPBBANK", label: "Банк Санкт-Петербург" },
  { code: "MTSBANK", label: "МТС Банк" },
  { code: "OZONBANK", label: "Озон Банк" },
  { code: "RENAISSANCE", label: "Ренессанс" },
  { code: "OTP", label: "ОТП Банк" },
  { code: "AVANGARD", label: "Авангард" },
  { code: "RNKB", label: "РНКБ" },
  { code: "LOKOBANK", label: "Локо-Банк" },
  { code: "RUSSIANSTANDARD", label: "Русский Стандарт" },
  { code: "HOMECREDIT", label: "Хоум Кредит" },
  { code: "UNICREDIT", label: "ЮниКредит" },
  { code: "CITIBANK", label: "Ситибанк" },
  { code: "BCSBANK", label: "БКС Банк" },
  { code: "ABSOLUTBANK", label: "Абсолют Банк" },
  { code: "SVOYBANK", label: "Свой Банк" },
  { code: "TRANSKAPITALBANK", label: "Транскапиталбанк" },
  { code: "MTSMONEY", label: "МТС Деньги" },
  { code: "FORABANK", label: "Фора-Банк" },
  { code: "CREDITEUROPE", label: "Кредит Европа" },
  { code: "BBRBANK", label: "ББР Банк" },
  { code: "UBRIR", label: "УБРиР" },
  { code: "GENBANK", label: "Генбанк" },
  { code: "SINARA", label: "Синара" },
  { code: "VLADBUSINESSBANK", label: "Владбизнесбанк" },
  { code: "TAVRICHESKIY", label: "Таврический" },
  { code: "DOLINSK", label: "Долинск" }
];

export function AddRequisiteDialog({
  open,
  onOpenChange,
  deviceId,
  onSuccess,
}: AddRequisiteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [methods, setMethods] = useState<Method[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      deviceId: deviceId || "",
      methodId: "",
      bankType: "",
      cardNumber: "",
      recipientName: "",
      phoneNumber: "",
      minAmount: 1000,
      maxAmount: 100000,
      dailyLimit: 0,
      monthlyLimit: 10000000,
      maxCountTransactions: 0,
    },
  });

  useEffect(() => {
    if (open) {
      fetchMethods();
      fetchDevices();
    }
  }, [open]);

  useEffect(() => {
    if (deviceId) {
      form.setValue("deviceId", deviceId);
    }
  }, [deviceId, form]);

  const fetchMethods = async () => {
    try {
      setLoadingMethods(true);
      const response = await traderApi.getMethods();
      const methodsData = response.data || response.methods || response || [];
      setMethods(Array.isArray(methodsData) ? methodsData : []);
    } catch (error) {
      console.error("Error fetching methods:", error);
      toast.error("Не удалось загрузить методы");
    } finally {
      setLoadingMethods(false);
    }
  };

  const fetchDevices = async () => {
    try {
      setLoadingDevices(true);
      const response = await traderApi.getDevices();
      const devicesData = Array.isArray(response) ? response : response.data || [];
      setDevices(devicesData);
    } catch (error) {
      console.error("Error fetching devices:", error);
      toast.error("Не удалось загрузить устройства");
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleMethodChange = (methodType: string) => {
    // Find first method with selected type
    const method = methods.find(m => m.type === methodType);
    setSelectedMethod(method || { id: methodType, name: methodType, type: methodType, minAmount: 1000, maxAmount: 100000, minPayin: 1000, maxPayin: 100000 });
    
    if (method) {
      form.setValue("minAmount", method.minPayin || 1000);
      form.setValue("maxAmount", method.maxPayin || 100000);
    } else {
      // Set default values for method type
      form.setValue("minAmount", 1000);
      form.setValue("maxAmount", 100000);
    }
    
    // Clear bank selection when method changes
    form.setValue("bankType", "");
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      
      if (!selectedMethod) {
        toast.error("Выберите метод");
        return;
      }

      // Validate bank selection for all methods
      if (!data.bankType) {
        toast.error("Выберите банк");
        return;
      }
      
      // Validate required fields based on method type
      if (selectedMethod.type === "c2c") {
        if (!data.cardNumber) {
          toast.error("Введите номер карты");
          return;
        }
      }

      if (selectedMethod.type === "sbp" && !data.phoneNumber) {
        toast.error("Введите номер телефона");
        return;
      }

      // Find actual method ID from methods list for API call
      const actualMethod = methods.find(m => m.type === selectedMethod.type);
      
      const requisiteData = {
        ...data,
        methodId: actualMethod?.id || data.methodId,
        methodType: selectedMethod.type,
        intervalMinutes: 5, // Требуется бэкендом
        // Set cardNumber as phoneNumber for SBP method
        cardNumber: selectedMethod.type === "sbp" ? (data.phoneNumber || "") : (data.cardNumber || ""),
      };

      await traderApi.createRequisite(requisiteData);
      
      toast.success("Реквизит успешно добавлен");
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating requisite:", error);
      toast.error(error.response?.data?.error || "Не удалось добавить реквизит");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Добавить реквизит</DialogTitle>
          <DialogDescription>
            Заполните данные для нового банковского реквизита
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!deviceId && (
              <FormField
                control={form.control}
                name="deviceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Устройство</FormLabel>
                    <FormControl>
                      <DeviceSelector
                        devices={devices}
                        selectedDeviceId={field.value}
                        onSelect={field.onChange}
                        loading={loadingDevices}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
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
                    disabled={!selectedMethod}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !selectedMethod ? "Сначала выберите метод" : "Выберите банк"
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
                      <Input
                        placeholder="1234 5678 9012 3456"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\s/g, "");
                          field.onChange(value);
                        }}
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
                    <Input placeholder="Иван Иванович И." {...field} />
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
                      <Input placeholder="+7 900 123 45 67" {...field} />
                    </FormControl>
                    <FormDescription>
                      Обязательно для СБП
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
                        value={(field.value as number | string | undefined) ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const digitsOnly = raw.replace(/\D/g, "");
                          field.onChange(digitsOnly === "" ? undefined : Number(digitsOnly));
                        }}
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
                        value={(field.value as number | string | undefined) ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const digitsOnly = raw.replace(/\D/g, "");
                          field.onChange(digitsOnly === "" ? undefined : Number(digitsOnly));
                        }}
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
                name="dailyLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дневной лимит (₽)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="500000"
                        value={(field.value as number | string | undefined) ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const digitsOnly = raw.replace(/\D/g, "");
                          field.onChange(digitsOnly === "" ? undefined : Number(digitsOnly));
                        }}
                      />
                    </FormControl>
                    <FormDescription>0 = без ограничений</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="monthlyLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Месячный лимит (₽)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="10000000"
                        value={(field.value as number | string | undefined) ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const digitsOnly = raw.replace(/\D/g, "");
                          field.onChange(digitsOnly === "" ? undefined : Number(digitsOnly));
                        }}
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
              name="maxCountTransactions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Дневной лимит транзакций</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={(field.value as number | string | undefined) ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const digitsOnly = raw.replace(/\D/g, "");
                        field.onChange(digitsOnly === "" ? undefined : Number(digitsOnly));
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Максимальное количество сделок в день (0 = без ограничений, по умолчанию 5)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={loading || !form.formState.isValid}
                className="bg-[#006039] hover:bg-[#006039]/90"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Добавить
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}