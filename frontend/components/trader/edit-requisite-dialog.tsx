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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BankSelector } from "@/components/ui/bank-selector";
import { traderApi } from "@/services/api";
import { toast } from "sonner";

const numberField = (minValue: number) =>
  z.preprocess((val) => {
    if (val === "" || val === null || typeof val === "undefined") return undefined;
    if (typeof val === "string" && val.trim() === "") return undefined;
    const num = typeof val === "number" ? val : Number(val);
    return Number.isNaN(num) ? undefined : num;
  }, z.number().min(minValue));

const formSchema = z.object({
  cardNumber: z.string().optional(),
  bankType: z.string().min(1, "Выберите банк"),
  recipientName: z.string().min(3, "Введите имя получателя"),
  phoneNumber: z.string().optional(),
  // Делаем опциональными, чтобы позволять пустой ввод без лагов; проверяем при сабмите
  minAmount: numberField(0).optional(),
  maxAmount: numberField(0).optional(),
  dailyLimit: numberField(0).optional(),
  monthlyLimit: numberField(0).optional(),
  trafficPreference: z.enum(["ANY", "PRIMARY", "SECONDARY", "VIP"]).optional(),
});

export interface EditRequisiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requisite: any | null;
  onSuccess?: () => void;
}

export function EditRequisiteDialog({ open, onOpenChange, requisite, onSuccess }: EditRequisiteDialogProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<z.input<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: {
      cardNumber: requisite?.cardNumber || "",
      bankType: requisite?.bankType || "",
      recipientName: requisite?.recipientName || "",
      phoneNumber: requisite?.phoneNumber || "",
      minAmount: requisite?.minAmount || 0,
      maxAmount: requisite?.maxAmount || 0,
      dailyLimit: requisite?.dailyLimit || 0,
      monthlyLimit: requisite?.monthlyLimit || 0,
      trafficPreference: requisite?.trafficPreference || "ANY",
    },
  });

  // Локальные строки для числовых полей, чтобы мгновенно очищать ввод
  const [minAmountInput, setMinAmountInput] = useState<string>("");
  const [maxAmountInput, setMaxAmountInput] = useState<string>("");
  const [dailyLimitInput, setDailyLimitInput] = useState<string>("");
  const [monthlyLimitInput, setMonthlyLimitInput] = useState<string>("");


  useEffect(() => {
    const values = form.getValues();
    setMinAmountInput(values.minAmount !== undefined ? String(values.minAmount) : "");
    setMaxAmountInput(values.maxAmount !== undefined ? String(values.maxAmount) : "");
    setDailyLimitInput(values.dailyLimit !== undefined ? String(values.dailyLimit) : "");
    setMonthlyLimitInput(values.monthlyLimit !== undefined ? String(values.monthlyLimit) : "");

  }, [requisite, open]);

  const [minAmount, maxAmount, dailyLimit, monthlyLimit] = form.watch([
    "minAmount",
    "maxAmount",
    "dailyLimit",
    "monthlyLimit",
  ]);
  const hasEmptyRequiredNumbers =
    minAmount === undefined ||
    maxAmount === undefined ||
    dailyLimit === undefined ||
    monthlyLimit === undefined;

  // Reset form values whenever a new requisite is selected
  useEffect(() => {
    if (requisite) {
      form.reset({
        cardNumber: requisite.cardNumber || "",
        bankType: requisite.bankType || "",
        recipientName: requisite.recipientName || "",
        phoneNumber: requisite.phoneNumber || "",
        minAmount: requisite.minAmount || 0,
        maxAmount: requisite.maxAmount || 0,
        dailyLimit: requisite.dailyLimit || 0,
        monthlyLimit: requisite.monthlyLimit || 0,
        trafficPreference: requisite.trafficPreference || "ANY",
      });
    }
  }, [requisite, form]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!requisite) return;
    try {
      setLoading(true);
      if (
        data.minAmount === undefined ||
        data.maxAmount === undefined ||
        data.dailyLimit === undefined ||
        data.monthlyLimit === undefined
      ) {
        toast.error("Заполните все числовые поля");
        return;
      }
      await traderApi.updateRequisite(requisite.id, {
        ...data,
        minAmount: Number(data.minAmount),
        maxAmount: Number(data.maxAmount),
        dailyLimit: Number(data.dailyLimit),
        monthlyLimit: Number(data.monthlyLimit),
        trafficPreference: data.trafficPreference || "ANY",
      });
      toast.success("Реквизит обновлен");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error updating requisite:", error);
      toast.error(error.response?.data?.error || "Не удалось обновить реквизит");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать реквизит</DialogTitle>
          <DialogDescription>Измените данные банковского реквизита</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cardNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Номер карты</FormLabel>
                  <FormControl>
                    <Input placeholder="0000 0000 0000 0000" {...field} />
                  </FormControl>
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
                  <FormControl>
                    <BankSelector value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recipientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Имя получателя</FormLabel>
                  <FormControl>
                    <Input placeholder="Иван Иванов" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Номер телефона (опционально)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="+7 900 000 00 00" 
                      {...field} 
                      disabled={true}
                      title="Номер телефона нельзя изменить после создания реквизита"
                    />
                  </FormControl>
                  <FormDescription className="text-orange-500">
                    Номер телефона нельзя изменить
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="trafficPreference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тип трафика</FormLabel>
                  <FormControl>
                    <select
                      className="w-full border rounded-md h-10 px-3"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                    >
                      <option value="ANY">Любой</option>
                      <option value="PRIMARY">Первичный</option>
                      <option value="SECONDARY">Вторичный</option>
                      <option value="VIP">VIP</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      value={minAmountInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const digitsOnly = raw.replace(/\D/g, "");
                        setMinAmountInput(digitsOnly);
                        form.setValue("minAmount", digitsOnly === "" ? undefined : Number(digitsOnly), { shouldValidate: false, shouldDirty: true });
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
                      value={maxAmountInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const digitsOnly = raw.replace(/\D/g, "");
                        setMaxAmountInput(digitsOnly);
                        form.setValue("maxAmount", digitsOnly === "" ? undefined : Number(digitsOnly), { shouldValidate: false, shouldDirty: true });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dailyLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Дневной лимит</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={dailyLimitInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const digitsOnly = raw.replace(/\D/g, "");
                        setDailyLimitInput(digitsOnly);
                        form.setValue("dailyLimit", digitsOnly === "" ? undefined : Number(digitsOnly), { shouldValidate: false, shouldDirty: true });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="monthlyLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Месячный лимит</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={monthlyLimitInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const digitsOnly = raw.replace(/\D/g, "");
                        setMonthlyLimitInput(digitsOnly);
                        form.setValue("monthlyLimit", digitsOnly === "" ? undefined : Number(digitsOnly), { shouldValidate: false, shouldDirty: true });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={loading || hasEmptyRequiredNumbers} className="bg-[#006039] hover:bg-[#006039]/90">
                Сохранить
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
