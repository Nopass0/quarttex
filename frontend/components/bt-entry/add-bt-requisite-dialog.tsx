"use client";

import { useState } from "react";
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
import { PhoneInput, CardNumberInput } from "@/components/ui/formatted-input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { traderApi } from "@/services/api";
import { Loader2 } from "lucide-react";
import { BANKS } from "@/constants/banks";

const formSchema = z.object({
  methodId: z.string().min(1, "Выберите метод"),
  bankType: z.string().min(1, "Выберите банк"),
  cardNumber: z.string().optional(),
  recipientName: z.string().min(3, "Введите имя получателя"),
  phoneNumber: z.string().optional(),
  minAmount: z.number().min(100),
  maxAmount: z.number().min(1000),
  sumLimit: z.number().min(0),
  operationLimit: z.number().min(0),
});

type FormData = z.infer<typeof formSchema>;

interface Method {
  id: string;
  name: string;
  type: string;
  minAmount: number;
  maxAmount: number;
  minPayin: number;
  maxPayin: number;
}

interface AddBTRequisiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const AVAILABLE_BANKS = BANKS;

export function AddBTRequisiteDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddBTRequisiteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      methodId: "",
      bankType: "",
      cardNumber: "",
      recipientName: "",
      phoneNumber: "",
      minAmount: 1000,
      maxAmount: 100000,
      sumLimit: 0,
      operationLimit: 0,
    },
  });


  const handleMethodChange = (methodType: string) => {
    // Create a method object for the selected type
    const method = { id: methodType, name: methodType, type: methodType, minAmount: 1000, maxAmount: 100000, minPayin: 1000, maxPayin: 100000 };
    setSelectedMethod(method);
    
    // Set default values for method type
    form.setValue("minAmount", 1000);
    form.setValue("maxAmount", 100000);
    
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

      // Validate card number for card methods
      if (selectedMethod.type === "CARD" && !data.cardNumber) {
        toast.error("Введите номер карты");
        return;
      }

      // Validate phone for SBP
      if (selectedMethod.type === "SBP" && !data.phoneNumber) {
        toast.error("Введите номер телефона для СБП");
        return;
      }

      const payload = {
        cardNumber: selectedMethod.type === "CARD" ? data.cardNumber : "",
        bankType: data.bankType,
        methodType: selectedMethod.type === "CARD" ? "c2c" : "sbp",
        recipientName: data.recipientName,
        phoneNumber: data.phoneNumber || "",
        minAmount: data.minAmount,
        maxAmount: data.maxAmount,
        intervalMinutes: 5,
        sumLimit: data.sumLimit,
        operationLimit: data.operationLimit,
      };

      console.log('[BTEntrance] Creating requisite with data:', payload);
      await traderApi.btEntrance.createRequisite(payload);
      toast.success("Реквизит успешно добавлен");
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating requisite:", error);
      const errorMessage = error.response?.data?.error || "Не удалось создать реквизит";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const selectedMethodType = selectedMethod?.type;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Добавить реквизит для БТ-входа</DialogTitle>
          <DialogDescription>
            Заполните информацию о новом реквизите без устройства
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="methodId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тип платежа</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleMethodChange(value);
                    }}
                    value={field.value}
                    disabled={false}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип платежа" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CARD">Банковская карта</SelectItem>
                      <SelectItem value="SBP">СБП</SelectItem>
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
                    disabled={!selectedMethodType}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите банк" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AVAILABLE_BANKS.filter(bank => bank.code !== "SBP").map((bank) => (
                        <SelectItem key={bank.code} value={bank.code}>
                          {bank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedMethodType === "CARD" && (
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
                        disabled={loading}
                      />
                    </FormControl>
                    <FormDescription>
                      Введите номер карты
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedMethodType === "SBP" && (
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
                        disabled={loading}
                      />
                    </FormControl>
                    <FormDescription>
                      Номер телефона для СБП
                    </FormDescription>
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
                    <Input placeholder="Иван Иванов" {...field} />
                  </FormControl>
                  <FormDescription>
                    Имя получателя платежа
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="minAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Мин. сумма</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
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
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
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
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
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
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>0 = без ограничений</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={loading}>
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