import * as XLSX from "xlsx";

import { formatDateTime } from "@/lib/utils";

export interface ExportTransaction {
  id: string;
  numericId: number;
  type: "IN" | "OUT";
  status: string;
  amount: number;
  commission: number;
  merchantRate: number | null;
  effectiveRate: number | null;
  isRecalculated: boolean;
  rate: number | null;
  method: {
    id: string;
    code: string;
    name: string;
    type: string;
    currency: string;
    commissionPayin: number;
    commissionPayout: number;
  };
  createdAt: string;
  updatedAt: string;
  orderId: string;
  trader?: {
    id: string;
    name: string;
  };
}

const statusLabels: Record<string, string> = {
  CREATED: "Создана",
  IN_PROGRESS: "В процессе",
  READY: "Завершена",
  EXPIRED: "Истекла",
  CANCELED: "Отменена",
  DISPUTE: "Спор",
};

const toTwoDecimals = (value: number) => Math.trunc(value * 100) / 100;

export function exportTransactionsToExcel(
  transactions: ExportTransaction[],
  filename: string = "transactions",
  countInRubEquivalent: boolean = false
) {
  // Prepare data for Excel
  const excelData = transactions.map((transaction) => {
    // Calculate USDT amount
    let usdtAmount = null;
    if (transaction.effectiveRate) {
      const usdtBeforeCommission =
        transaction.amount / transaction.effectiveRate;
      const commissionPercent =
        transaction.type === "IN"
          ? transaction.method.commissionPayin
          : transaction.method.commissionPayout;
      usdtAmount =
        transaction.type === "IN"
          ? usdtBeforeCommission * (1 - commissionPercent / 100)
          : usdtBeforeCommission * (1 + commissionPercent / 100);
    }

    const baseData: any = {
      "Внутренний / Внешний ID": `${transaction.id} / ${
        transaction.orderId || "-"
      }`,
      Тип: transaction.type === "IN" ? "Входящая" : "Исходящая",
      Статус: statusLabels[transaction.status] || transaction.status,
      Метод: transaction.method.name,
      "Код метода": transaction.method.code,
      "Сумма (RUB)": transaction.amount,
      "Комиссия (%)":
        transaction.type === "IN"
          ? transaction.method.commissionPayin
          : transaction.method.commissionPayout,
    };

    // Добавляем поля курса и USDT только если countInRubEquivalent = false
    if (!countInRubEquivalent) {
      baseData["Курс"] =
        transaction.effectiveRate != null
          ? toTwoDecimals(transaction.effectiveRate)
          : null;
      baseData["Курс пересчитан"] = transaction.isRecalculated ? "Да" : "Нет";
      baseData["Сумма (USDT)"] =
        usdtAmount != null ? toTwoDecimals(usdtAmount) : null;
    }

    baseData["Дата создания"] = formatDateTime(transaction.createdAt);
    baseData["Дата обновления"] = formatDateTime(transaction.updatedAt);
    baseData["Трейдер"] = transaction.trader?.name || "";

    return baseData;
  });

  // Create workbook and worksheet
  const ws = XLSX.utils.json_to_sheet(excelData);

  // Set column widths based on whether USDT columns are included
  const columnWidths = [
    { wch: 30 }, // Внутренний / Внешний ID
    { wch: 12 }, // Тип
    { wch: 15 }, // Статус
    { wch: 20 }, // Метод
    { wch: 15 }, // Код метода
    { wch: 15 }, // Сумма (RUB)
    { wch: 12 }, // Комиссия (%)
  ];

  if (!countInRubEquivalent) {
    columnWidths.push(
      { wch: 10 }, // Курс
      { wch: 15 }, // Курс пересчитан
      { wch: 15 } // Сумма (USDT)
    );
  }

  columnWidths.push(
    { wch: 20 }, // Дата создания
    { wch: 20 }, // Дата обновления
    { wch: 20 } // Трейдер
  );

  ws["!cols"] = columnWidths;

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Транзакции");

  // Generate filename with current date
  const date = new Date();
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
  const timeStr = `${String(date.getHours()).padStart(2, "0")}-${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
  const fullFilename = `${filename}_${dateStr}_${timeStr}.xlsx`;

  // Save file
  XLSX.writeFile(wb, fullFilename);
}

export interface ExportPayout {
  id: string;
  numericId: number;
  status: string;
  amount: number;
  amountUsdt: number | null;
  rate: number | null;
  feePercent: number | null;
  payoutsCommission?: number | null;
  externalReference?: string | null;
  method?: {
    id: string;
    code: string;
    name: string;
    type: string;
    currency: string;
  } | null;
  wallet: string | null;
  bank: string | null;
  isCard: boolean;
  createdAt: string;
  acceptedAt?: string | null;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
  trader?: {
    numericId: number;
    email: string;
  } | null;
}

const payoutStatusLabels: Record<string, string> = {
  CREATED: "Создано",
  ACTIVE: "Активно",
  CHECKING: "Проверка",
  COMPLETED: "Завершено",
  CANCELLED: "Отменено",
  EXPIRED: "Истекло",
  DISPUTED: "Спор",
};

export function exportPayoutsToExcel(
  payouts: ExportPayout[],
  filename: string = "payouts"
) {
  const excelData = payouts.map((payout) => {
    const computedPercent =
      payout.payoutsCommission != null && payout.amount
        ? (payout.payoutsCommission / payout.amount) * 100
        : payout.feePercent ?? null;
    const effectiveFeePercent =
      computedPercent != null ? toTwoDecimals(computedPercent) : null;

    const feeAmountRub =
      payout.payoutsCommission != null
        ? toTwoDecimals(payout.payoutsCommission)
        : effectiveFeePercent != null
        ? toTwoDecimals(payout.amount * (effectiveFeePercent / 100))
        : null;

    return {
      ID: `#${payout.numericId}`,
      "Transaction ID": payout.id,
      "Order ID": payout.externalReference || "",
      Статус: payoutStatusLabels[payout.status] || payout.status,
      "Сумма (RUB)": payout.amount,
      "Сумма (USDT)":
        payout.amountUsdt != null ? toTwoDecimals(payout.amountUsdt) : null,
      "Комиссия (%)": effectiveFeePercent,
      "Комиссия (RUB)": feeAmountRub,
      Курс: payout.rate != null ? toTwoDecimals(payout.rate) : null,
      Метод: payout.method?.name || "",
      "Код метода": payout.method?.code || "",
      "Банк/Кошелек": payout.isCard ? payout.bank : payout.wallet,
      "Тип счета": payout.isCard ? "Карта" : "Кошелек",
      Трейдер: payout.trader
        ? `#${payout.trader.numericId} ${payout.trader.email}`
        : "",
      "Дата создания": formatDateTime(payout.createdAt),
      "Дата принятия": payout.acceptedAt
        ? formatDateTime(payout.acceptedAt)
        : "",
      "Дата подтверждения": payout.confirmedAt
        ? formatDateTime(payout.confirmedAt)
        : "",
      "Дата отмены": payout.cancelledAt
        ? formatDateTime(payout.cancelledAt)
        : "",
    };
  });

  const ws = XLSX.utils.json_to_sheet(excelData);

  ws["!cols"] = [
    { wch: 10 }, // ID
    { wch: 36 }, // Transaction ID
    { wch: 20 }, // Order ID
    { wch: 15 }, // Статус
    { wch: 15 }, // Сумма (RUB)
    { wch: 15 }, // Сумма (USDT)
    { wch: 15 }, // Комиссия (%)
    { wch: 18 }, // Комиссия (RUB)
    { wch: 10 }, // Курс
    { wch: 20 }, // Метод
    { wch: 15 }, // Код метода
    { wch: 20 }, // Банк/Кошелек
    { wch: 12 }, // Тип счета
    { wch: 25 }, // Трейдер
    { wch: 20 }, // Дата создания
    { wch: 20 }, // Дата принятия
    { wch: 22 }, // Дата подтверждения
    { wch: 20 }, // Дата отмены
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Выплаты");

  const date = new Date();
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
  const timeStr = `${String(date.getHours()).padStart(2, "0")}-${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
  const fullFilename = `${filename}_${dateStr}_${timeStr}.xlsx`;
  XLSX.writeFile(wb, fullFilename);
}

export interface ExportAdminTransaction {
  id: string;
  numericId: number;
  type: "IN" | "OUT";
  status: string;
  amount: number;
  rate: number | null;
  commission: number;
  orderId: string;
  merchant: { id: string; name: string };
  method: { id: string; code: string; name: string };
  createdAt: string;
  updatedAt: string;
  trader?: { id: string; numericId: number; email: string | null };
}

export function exportAdminTransactionsToExcel(
  transactions: ExportAdminTransaction[],
  filename: string = "admin_transactions"
) {
  const excelData = transactions.map((t) => {
    const usdt = t.rate ? t.amount / t.rate : null;
    return {
      ID: `#${t.numericId}`,
      "Внешний ID": t.orderId || "",
      Мерчант: t.merchant.name,
      Трейдер: t.trader ? `#${t.trader.numericId} ${t.trader.email ?? ""}` : "",
      Тип: t.type === "IN" ? "Входящая" : "Исходящая",
      Статус: statusLabels[t.status] || t.status,
      Метод: t.method.name,
      "Сумма (RUB)": t.amount,
      "Сумма (USDT)": usdt != null ? toTwoDecimals(usdt) : null,
      Курс: t.rate != null ? toTwoDecimals(t.rate) : null,
      "Комиссия (%)": t.commission,
      "Дата создания": formatDateTime(t.createdAt),
      "Дата обновления": formatDateTime(t.updatedAt),
    };
  });

  const ws = XLSX.utils.json_to_sheet(excelData);
  ws["!cols"] = [
    { wch: 10 }, // ID
    { wch: 20 }, // Внешний ID
    { wch: 20 }, // Мерчант
    { wch: 25 }, // Трейдер
    { wch: 12 }, // Тип
    { wch: 15 }, // Статус
    { wch: 20 }, // Метод
    { wch: 15 }, // Сумма (RUB)
    { wch: 15 }, // Сумма (USDT)
    { wch: 10 }, // Курс
    { wch: 15 }, // Комиссия (%)
    { wch: 20 }, // Дата создания
    { wch: 20 }, // Дата обновления
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Транзакции");

  const date = new Date();
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
  const timeStr = `${String(date.getHours()).padStart(2, "0")}-${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
  const fullFilename = `${filename}_${dateStr}_${timeStr}.xlsx`;

  XLSX.writeFile(wb, fullFilename);
}
