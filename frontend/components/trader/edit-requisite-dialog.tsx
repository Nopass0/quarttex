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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
  operationLimit: numberField(0).optional(),
  sumLimit: numberField(0).optional(),
  intervalMinutes: numberField(0).optional(),
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
      operationLimit: requisite?.operationLimit || 0,
      sumLimit: requisite?.sumLimit || 0,
      intervalMinutes: requisite?.intervalMinutes || 0,
    },
  });

  // Локальные строки для числовых полей, чтобы мгновенно очищать ввод
  const [minAmountInput, setMinAmountInput] = useState<string>("");
  const [maxAmountInput, setMaxAmountInput] = useState<string>("");
  const [operationLimitInput, setOperationLimitInput] = useState<string>("");
  const [sumLimitInput, setSumLimitInput] = useState<string>("");
  const [intervalMinutesInput, setIntervalMinutesInput] = useState<string>("");


  useEffect(() => {
    const values = form.getValues();
    setMinAmountInput(values.minAmount !== undefined ? String(values.minAmount) : "");
    setMaxAmountInput(values.maxAmount !== undefined ? String(values.maxAmount) : "");
    setOperationLimitInput(values.operationLimit !== undefined ? String(values.operationLimit) : "");
    setSumLimitInput(values.sumLimit !== undefined ? String(values.sumLimit) : "");
    setIntervalMinutesInput(values.intervalMinutes !== undefined ? String(values.intervalMinutes) : "");

  }, [requisite, open]);

  const [minAmount, maxAmount, operationLimit, sumLimit, intervalMinutes] = form.watch([
    "minAmount",
    "maxAmount",
    "operationLimit",
    "sumLimit",
    "intervalMinutes",
  ]);
  const hasEmptyRequiredNumbers =
    minAmount === undefined ||
    maxAmount === undefined ||
    operationLimit === undefined ||
    sumLimit === undefined ||
    intervalMinutes === undefined;

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
        operationLimit: requisite.operationLimit || 0,
        sumLimit: requisite.sumLimit || 0,
        intervalMinutes: requisite.intervalMinutes || 0,
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
        data.operationLimit === undefined ||
        data.sumLimit === undefined ||
        data.intervalMinutes === undefined
      ) {
        toast.error("Заполните все числовые поля");
        return;
      }
      await traderApi.updateRequisite(requisite.id, {
        ...data,
        minAmount: Number(data.minAmount),
        maxAmount: Number(data.maxAmount),
        operationLimit: Number(data.operationLimit),
        sumLimit: Number(data.sumLimit),
        intervalMinutes: Number(data.intervalMinutes),
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
                    />
                  </FormControl>
                  <FormDescription>0 = без ограничений</FormDescription>
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
                    />
                  </FormControl>
                  <FormDescription>0 = без ограничений</FormDescription>
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
