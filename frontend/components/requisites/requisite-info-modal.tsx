"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import {
  Star,
  Trash2,
  Clock,
  CreditCard,
  FileText,
  Smartphone,
  ChevronLeft,
  Share2,
  ChevronRight,
  Building,
  Edit,
  Phone,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EditRequisiteDialog } from "@/components/requisites/edit-requisite-dialog";
import { traderApi } from "@/services/api";
import { toast } from "sonner";

interface RequisiteInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requisite: {
    id: string;
    bankType: string;
    cardNumber: string;
    recipientName: string;
    phoneNumber?: string;
    accountNumber?: string;
    methodType: string;
    minAmount: number;
    maxAmount: number;
    totalAmountLimit?: number;
    currentTotalAmount?: number;
    operationLimit?: number;
    sumLimit?: number;
    activeDeals?: number;
    dailyLimit?: number;
    monthlyLimit?: number;
    intervalMinutes: number;
    successfulDeals?: number;
    totalDeals?: number;
    status: "active" | "inactive";
    isArchived?: boolean;
    device?: {
      id: string;
      name: string;
      isOnline?: boolean;
    };
    stats?: {
      turnover24h: number;
      deals24h: number;
      profit24h: number;
      conversion24h: number;
    };
    verifications?: {
      cardNumber: boolean;
      accountNumber: boolean;
      phoneNumber: boolean;
    };
  };
  onRequisiteUpdated?: () => void;
}

const PaymentSystemIcon = ({ cardNumber }: { cardNumber: string }) => {
  const detectSystem = (number: string) => {
    const clean = number.replace(/\s/g, "");
    if (clean.startsWith("2")) return "mir";
    if (clean.startsWith("4")) return "visa";
    if (clean.startsWith("5")) return "mastercard";
    return "unknown";
  };

  const system = detectSystem(cardNumber);

  if (system === "mir") {
    return (
      <div className="absolute top-4 right-4">
        <svg viewBox="0 0 30 18" fill="#eee" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M26.916 5H21.14c.337 1.907 2.187 3.701 4.206 3.701h4.598C30 8.533 30 8.252 30 8.084 30 6.402 28.598 5 26.916 5Z"
            fill="#eee"
          ></path>
          <path
            d="M21.645 9.038v4.654h2.803v-2.467h2.468c1.345 0 2.523-.954 2.915-2.187h-8.186ZM11.776 5v8.636h2.467s.617 0 .953-.617C16.88 9.71 17.383 8.7 17.383 8.7h.337v4.935h2.803V5h-2.467s-.617.056-.953.617c-1.402 2.86-2.187 4.318-2.187 4.318h-.336V5h-2.804ZM0 13.692V5.056h2.804s.785 0 1.233 1.234c1.122 3.252 1.234 3.7 1.234 3.7s.224-.784 1.234-3.7c.448-1.234 1.233-1.234 1.233-1.234h2.804v8.636H7.738V9.037h-.336l-1.57 4.655H4.598l-1.57-4.655h-.336v4.655H0Z"
            fill="#4FAD50"
          ></path>
          <defs>
            <linearGradient
              id="mir_svg__a"
              x1="21.13"
              y1="6.877"
              x2="29.98"
              y2="6.877"
              gradientUnits="userSpaceOnUse"
            >
              <stop stop-color="#27B1E6"></stop>
              <stop offset="1" stop-color="#148ACA"></stop>
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  if (system === "mastercard") {
    return (
      <div className="absolute top-4 right-4">
        <svg
          width="50"
          height="30"
          viewBox="0 0 32 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="11.5" y="2" width="9" height="16" fill="#FF5F00" />
          <circle cx="11.5" cy="10" r="8" fill="#EB001B" />
          <circle cx="20.5" cy="10" r="8" fill="#F79E1B" />
          <path
            d="M16 4.5C17.5 6 18.5 8 18.5 10C18.5 12 17.5 14 16 15.5C14.5 14 13.5 12 13.5 10C13.5 8 14.5 6 16 4.5Z"
            fill="#FF5F00"
          />
        </svg>
      </div>
    );
  }

  if (system === "visa") {
    return (
      <div className="absolute top-4 right-4">
        <svg
          width="50"
          height="20"
          viewBox="0 0 40 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.9 0.5L15.3 13.5H19.3L21.9 0.5H17.9Z" fill="white" />
          <path
            d="M29.5 0.5C28.6 0.5 27.9 0.9 27.6 1.6L21.3 13.5H25.5L26.4 11H31.6L32.2 13.5H36L32.7 0.5H29.5ZM27.5 8L29.7 2.5L31.1 8H27.5Z"
            fill="white"
          />
          <path
            d="M12.8 0.5L8.7 9.4L6.9 1.3C6.7 0.4 5.9 0.5 5.9 0.5H0V0.8C1.2 1.1 2.5 1.5 3.7 2.1C4.4 2.4 4.6 2.7 4.8 3.4L7.8 13.5H12L17.9 0.5H12.8Z"
            fill="white"
          />
        </svg>
      </div>
    );
  }

  return null;
};

const getBankName = (bankType: string): string => {
  const banks: Record<string, string> = {
    SBERBANK: "Сбербанк",
    TBANK: "Т-Банк",
    VTB: "ВТБ",
    ALFABANK: "Альфа-Банк",
    RAIFFEISEN: "Райффайзен",
    GAZPROMBANK: "Газпромбанк",
    OTPBANK: "ОТП Банк",
    OTKRITIE: "Открытие",
    ROSBANK: "Росбанк",
    PROMSVYAZBANK: "Промсвязьбанк",
    SOVCOMBANK: "Совкомбанк",
    POCHTABANK: "Почта Банк",
    ROSSELKHOZBANK: "Россельхозбанк",
    MKB: "МКБ",
    URALSIB: "Уралсиб",
    AKBARS: "Ак Барс",
    SPBBANK: "Банк Санкт-Петербург",
    MTSBANK: "МТС Банк",
    OZONBANK: "Озон Банк",
    RENAISSANCE: "Ренессанс",
    AVANGARD: "Авангард",
    RNKB: "РНКБ",
    LOKOBANK: "Локо-Банк",
    RUSSIANSTANDARD: "Русский Стандарт",
    HOMECREDIT: "Хоум Кредит",
    UNICREDIT: "ЮниКредит",
    CITIBANK: "Ситибанк",
    BCSBANK: "БКС Банк",
    ABSOLUTBANK: "Абсолют Банк",
    SVOYBANK: "Свой Банк",
    TRANSKAPITALBANK: "Транскапиталбанк",
    MTSMONEY: "МТС Деньги",
    FORABANK: "Фора-Банк",
    CREDITEUROPE: "Кредит Европа",
    BBRBANK: "ББР Банк",
    UBRIR: "УБРиР",
    GENBANK: "Генбанк",
    SINARA: "Синара",
    VLADBUSINESSBANK: "Владбизнесбанк",
    TAVRICHESKIY: "Таврический",
    DOLINSK: "Долинск",
  };
  return banks[bankType] || bankType;
};

export function RequisiteInfoModal({
  open,
  onOpenChange,
  requisite,
  onRequisiteUpdated,
}: RequisiteInfoModalProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatCardNumber = (number: string) => {
    return number.replace(/(\d{4})/g, "$1 ").trim();
  };

  const handleDelete = async () => {
    if (!confirm("Вы уверены, что хотите удалить этот реквизит?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await traderApi.deleteRequisite(requisite.id);
      toast.success("Реквизит успешно удален");
      onOpenChange(false);
      onRequisiteUpdated?.();
    } catch (error: any) {
      console.error("Failed to delete requisite:", error);
      toast.error("Не удалось удалить реквизит");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      await traderApi.archiveRequisite(requisite.id, !requisite.isArchived);
      toast.success(requisite.isArchived ? "Реквизит запущен" : "Реквизит остановлен");
      onRequisiteUpdated?.();
    } catch (error: any) {
      console.error("Failed to toggle requisite status:", error);
      toast.error("Не удалось изменить статус реквизита");
    }
  };

  // Determine actual status based on device
  const isWorking = !requisite.isArchived && requisite.device?.isOnline;
  const displayStatus = isWorking ? "В работе" : requisite.isArchived ? "Архивирован" : "Не в работе";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="sr-only text-center justify-center items-center">
          <DialogTitle className="">Информация о реквизите</DialogTitle>
          <DialogDescription className="sr-only">
            Просмотр информации о реквизите
          </DialogDescription>
        </DialogHeader>
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b md:hidden flex-shrink-0">
          <button
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-1 text-[#006039] font-medium"
          >
            <ChevronLeft className="h-4 w-4" />
            Назад
          </button>
          <button className="flex items-center gap-1 text-[#006039] font-medium">
            Поделиться
            <Share2 className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Title */}
          <h3 className="text-xl font-semibold text-center justify-center items-center">
            Информация о реквизите
          </h3>

          {/* Card Info */}
          <div className="relative rounded-xl overflow-hidden">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-green-500/20 via-green-300/10 to-transparent" />

            {/* Card Content */}
            <div className="relative p-4 space-y-3 bg-white/10 backdrop-blur-sm">
              {/* Status Badge */}
              <div className="flex text-left items-start justify-between">
                <Badge
                  className={cn(
                    "font-medium",
                    isWorking
                      ? "bg-green-50 text-green-700 border-green-200"
                      : requisite.isArchived
                      ? "bg-gray-100 text-gray-600 border-gray-300"
                      : "bg-orange-50 text-orange-700 border-orange-200"
                  )}
                >
                  {displayStatus}
                </Badge>
                <PaymentSystemIcon cardNumber={requisite.cardNumber} />
              </div>

              {/* Card Details */}
              <div className="space-y-2">
                <p className="text-[16px] font-semibold text-gray-900">
                  {requisite.recipientName}
                </p>
                <p className="text-xl font-bold text-gray-800">
                  {formatCardNumber(requisite.cardNumber)}
                </p>
                <p className="text-sm text-gray-600">
                  Банк: {getBankName(requisite.bankType)} • {requisite.methodType === 'sbp' ? 'СБП' : 'C2C'}
                </p>
                {requisite.phoneNumber && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>{requisite.phoneNumber}</span>
                  </div>
                )}
                {requisite.accountNumber && (
                  <p className="text-sm text-gray-600">
                    Счёт: {requisite.accountNumber}
                  </p>
                )}
              </div>

              {/* Verifications */}
              <div className="pt-3 border-t border-gray-200/50 space-y-1">
                <p className="text-sm text-gray-600">
                  Прием по номеру карты:{" "}
                  <span
                    className={
                      requisite.verifications?.cardNumber
                        ? "text-green-600"
                        : "text-gray-500"
                    }
                  >
                    {requisite.verifications?.cardNumber
                      ? "Подтверждено"
                      : "Не подтверждено"}
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  Прием по номеру счета:{" "}
                  <span
                    className={
                      requisite.verifications?.accountNumber
                        ? "text-green-600"
                        : "text-gray-500"
                    }
                  >
                    {requisite.verifications?.accountNumber
                      ? "Подтверждено"
                      : "Не подтверждено"}
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  Прием по номеру телефона:{" "}
                  <span
                    className={
                      requisite.verifications?.phoneNumber
                        ? "text-green-600"
                        : "text-gray-500"
                    }
                  >
                    {requisite.verifications?.phoneNumber
                      ? "Подтверждено"
                      : "Не подтверждено"}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Main Card Selection */}
          <div className="flex justify-center items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <Star className="h-5 w-5 text-gray-400 font-semibold" />
            <span className="text-[16px] font-semibold text-gray-400">
              Карта выбрана как основная
            </span>
          </div>

          {/* Statistics */}
          <div className="space-y-3">
            <h4 className="font-medium text-center text-gray-900">
              Статистика
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Успешные сделки</p>
                <p className="font-semibold">
                  {requisite.successfulDeals || 0}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Всего сделок</p>
                <p className="font-semibold">
                  {requisite.totalDeals || 0}
                </p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Процент успешных</p>
              <p className="font-semibold">
                {requisite.totalDeals && requisite.totalDeals > 0
                  ? ((requisite.successfulDeals || 0) / requisite.totalDeals * 100).toFixed(1)
                  : 0}%
              </p>
            </div>

            {requisite.stats && (
              <>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Оборот за 24 часа</p>
                  <p className="font-semibold">
                    {requisite.stats.turnover24h || 0} USDT ≈{" "}
                    {(requisite.stats.turnover24h || 0) * 100} RUB
                    <span className="text-sm text-gray-500 ml-2">
                      ({requisite.stats.deals24h || 0} сделок)
                    </span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Прибыль 24ч</p>
                    <p className="font-semibold">
                      {requisite.stats.profit24h || 0} USDT
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Конверсия 24ч</p>
                    <p className="font-semibold">
                      {requisite.stats.conversion24h || 0}%
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Device Link */}
          {requisite.device && (
            <div className="space-y-3">
              <h4 className="font-medium text-center text-gray-900">
                Привязка к устройству
              </h4>
              <a
                href={`/trader/devices/${requisite.device.id}`}
                className="block"
              >
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#006039]/10 rounded-lg flex items-center justify-center">
                      <Smartphone className="h-5 w-5 text-[#006039]" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {requisite.device.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {requisite.device.id}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </a>
            </div>
          )}

          {/* Management Actions */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Управление реквизитом</h4>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start h-12 text-[#006039] hover:text-[#006039] hover:bg-green-50"
                onClick={() => setShowEditDialog(true)}
              >
                <Edit className="h-4 w-4 mr-2 text-[#006039]" />
                Редактировать
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start h-12 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                {isDeleting ? "Удаление..." : "Удалить"}
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-12"
                onClick={() =>
                  (window.location.href = `/deals?material_id=${requisite.id}`)
                }
              >
                <Clock className="h-4 w-4 mr-2 text-green-700" />
                Просмотр сделок по реквизиту
              </Button>

              <div className="my-3 border-t" />

              <Button 
                variant="outline" 
                className="w-full justify-start h-12"
                onClick={handleToggleStatus}
              >
                {requisite.isArchived ? (
                  <>
                    <AlertCircle className="h-4 w-4 mr-2 text-green-700" />
                    Запустить реквизит
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 mr-2 text-orange-600" />
                    Остановить реквизит
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Close Button */}
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full h-12 bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    
    {showEditDialog && (
      <EditRequisiteDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        requisite={requisite}
        onRequisiteUpdated={() => {
          onRequisiteUpdated?.();
          setShowEditDialog(false);
        }}
      />
    )}
  </>
  );
}
