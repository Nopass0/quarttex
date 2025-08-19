"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { traderApi } from "@/services/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Combobox } from "@/components/ui/combobox";

interface RequisitesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequisiteAdded: () => void;
}

const bankTypes = [
  { value: "SBERBANK", label: "Сбербанк" },
  { value: "TBANK", label: "Т-Банк" },
  { value: "VTB", label: "ВТБ" },
  { value: "ALFABANK", label: "Альфа-Банк" },
  { value: "RAIFFEISEN", label: "Райффайзенбанк" },
  { value: "GAZPROMBANK", label: "Газпромбанк" },
  { value: "OTPBANK", label: "ОТП Банк" },
  { value: "OTKRITIE", label: "Открытие" },
  { value: "ROSBANK", label: "Росбанк" },
  { value: "PROMSVYAZBANK", label: "Промсвязьбанк" },
  { value: "SOVCOMBANK", label: "Совкомбанк" },
  { value: "POCHTABANK", label: "Почта Банк" },
  { value: "ROSSELKHOZBANK", label: "Россельхозбанк" },
  { value: "MKB", label: "МКБ" },
  { value: "URALSIB", label: "Уралсиб" },
  { value: "AKBARS", label: "Ак Барс" },
  { value: "SPBBANK", label: "Банк Санкт-Петербург" },
  { value: "MTSBANK", label: "МТС Банк" },
  { value: "OZONBANK", label: "Озон Банк" },
  { value: "RENAISSANCE", label: "Ренессанс" },
  { value: "AVANGARD", label: "Авангард" },
  { value: "RNKB", label: "РНКБ" },
  { value: "LOKOBANK", label: "Локо-Банк" },
  { value: "RUSSIANSTANDARD", label: "Русский Стандарт" },
  { value: "HOMECREDIT", label: "Хоум Кредит" },
  { value: "UNICREDIT", label: "ЮниКредит" },
  { value: "CITIBANK", label: "Ситибанк" },
  { value: "BCSBANK", label: "БКС Банк" },
  { value: "ABSOLUTBANK", label: "Абсолют Банк" },
  { value: "SVOYBANK", label: "Свой Банк" },
  { value: "TRANSKAPITALBANK", label: "Транскапиталбанк" },
  { value: "MTSMONEY", label: "МТС Деньги" },
  { value: "FORABANK", label: "Фора-Банк" },
  { value: "CREDITEUROPE", label: "Кредит Европа" },
  { value: "BBRBANK", label: "ББР Банк" },
  { value: "UBRIR", label: "УБРиР" },
  { value: "GENBANK", label: "Генбанк" },
  { value: "SINARA", label: "Синара" },
  { value: "VLADBUSINESSBANK", label: "Владбизнесбанк" },
  { value: "TAVRICHESKIY", label: "Таврический" },
  { value: "DOLINSK", label: "Долинск" },
];

export function RequisitesDialog({
  open,
  onOpenChange,
  onRequisiteAdded,
}: RequisitesDialogProps) {
  const [loading, setLoading] = useState(false);
  const [methods, setMethods] = useState<any[]>([]);
  const [selectedMethodType, setSelectedMethodType] = useState<"sbp" | "c2c" | "">("")
  const [formData, setFormData] = useState({
    recipientName: "",
    cardNumber: "",
    bankType: "",
    phoneNumber: "",
    methodId: "",
    minAmount: "100",
    maxAmount: "100000",
  });

  // Fetch methods on mount
  useEffect(() => {
    const fetchMethods = async () => {
      try {
        const response = await traderApi.getMethods();
        setMethods(response.methods || response || []);
      } catch (error) {
        console.error("Failed to fetch methods:", error);
      }
    };
    if (open) {
      fetchMethods();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.recipientName || !formData.methodId) {
      toast.error("Пожалуйста, заполните все обязательные поля");
      return;
    }

    // Validate based on method type
    if (selectedMethodType === "c2c") {
      if (!formData.cardNumber || !formData.bankType) {
        toast.error("Пожалуйста, заполните номер карты и выберите банк");
        return;
      }
      const cleanCardNumber = formData.cardNumber.replace(/\s/g, "");
      if (cleanCardNumber.length !== 16 || !/^\d+$/.test(cleanCardNumber)) {
        toast.error("Номер карты должен содержать 16 цифр");
        return;
      }
    } else if (selectedMethodType === "sbp") {
      if (!formData.phoneNumber) {
        toast.error("Пожалуйста, введите номер телефона для СБП");
        return;
      }
      // Basic phone validation
      const cleanPhone = formData.phoneNumber.replace(/[^\d+]/g, "");
      if (cleanPhone.length < 10) {
        toast.error("Введите корректный номер телефона");
        return;
      }
    }

    setLoading(true);

    try {
      const payload: any = {
        recipientName: formData.recipientName,
        methodType: selectedMethodType,
        methodId: formData.methodId,
        minAmount: parseInt(formData.minAmount),
        maxAmount: parseInt(formData.maxAmount),
        intervalMinutes: 5,
      };

      // Add method-specific fields
      if (selectedMethodType === "c2c") {
        const cleanCardNumber = formData.cardNumber.replace(/\s/g, "");
        payload.cardNumber = cleanCardNumber;
        payload.bankType = formData.bankType;
      } else if (selectedMethodType === "sbp") {
        payload.phoneNumber = formData.phoneNumber;
        payload.bankType = "SBP";
      }

      console.log('Creating requisite with payload:', payload);
      await traderApi.createRequisite(payload);

      toast.success("Реквизит успешно добавлен");
      onRequisiteAdded();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        recipientName: "",
        cardNumber: "",
        bankType: "",
        phoneNumber: "",
        methodId: "",
        minAmount: "100",
        maxAmount: "100000",
      });
    } catch (error: any) {
      console.error("Failed to create requisite:", error);
      console.error("Error response:", error.response?.data);
      const errorMessage = error.response?.data?.error || error.message || "Не удалось добавить реквизит";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const cleanValue = value.replace(/\s/g, "");
    const groups = cleanValue.match(/.{1,4}/g) || [];
    return groups.join(" ");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Добавить реквизит</DialogTitle>
          <DialogDescription>
            Добавьте реквизит без привязки к устройству
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipientName">Имя получателя</Label>
            <Input
              id="recipientName"
              placeholder="Иван Иванов"
              value={formData.recipientName}
              onChange={(e) =>
                setFormData({ ...formData, recipientName: e.target.value })
              }
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="methodId">Метод платежа *</Label>
            <Combobox
              options={methods.map(m => ({ value: m.id, label: m.name }))}
              value={formData.methodId}
              onValueChange={(value) => {
                setFormData({ ...formData, methodId: value });
                // Determine method type based on selected method
                const method = methods.find(m => m.id === value);
                if (method) {
                  const methodType = method.name.toLowerCase().includes('сбп') || method.name.toLowerCase().includes('sbp') ? 'sbp' : 'c2c';
                  setSelectedMethodType(methodType);
                }
              }}
              placeholder="Выберите метод"
              searchPlaceholder="Поиск метода..."
              emptyText="Метод не найден"
              disabled={loading}
            />
          </div>

          {selectedMethodType === "c2c" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Номер карты *</Label>
                <Input
                  id="cardNumber"
                  placeholder="0000 0000 0000 0000"
                  value={formData.cardNumber}
                  onChange={(e) => {
                    const formatted = formatCardNumber(e.target.value);
                    if (formatted.replace(/\s/g, "").length <= 16) {
                      setFormData({ ...formData, cardNumber: formatted });
                    }
                  }}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankType">Банк *</Label>
                <Combobox
                  options={bankTypes}
                  value={formData.bankType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, bankType: value })
                  }
                  placeholder="Выберите банк"
                  searchPlaceholder="Поиск банка..."
                  emptyText="Банк не найден"
                  disabled={loading}
                />
              </div>
            </>
          )}

          {selectedMethodType === "sbp" && (
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Номер телефона *</Label>
              <Input
                id="phoneNumber"
                placeholder="+7 (999) 999-99-99"
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNumber: e.target.value })
                }
                disabled={loading}
              />
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minAmount">Мин. сумма (₽)</Label>
              <Input
                id="minAmount"
                type="number"
                placeholder="100"
                value={formData.minAmount}
                onChange={(e) =>
                  setFormData({ ...formData, minAmount: e.target.value })
                }
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxAmount">Макс. сумма (₽)</Label>
              <Input
                id="maxAmount"
                type="number"
                placeholder="100000"
                value={formData.maxAmount}
                onChange={(e) =>
                  setFormData({ ...formData, maxAmount: e.target.value })
                }
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Добавить
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}