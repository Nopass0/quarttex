"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { useAdminAuth } from "@/stores/auth";
import { adminApiInstance } from "@/services/api";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AuthLayout } from "@/components/layouts/auth-layout";

interface DeletionStats {
  totals: {
    transactions: number;
    payouts: number;
    deals: number;
  };
  merchants: Array<{ id: string; name: string; transactionCount?: number }>;
  statuses: {
    transactions: Array<{ status: string; count: number }>;
    payouts: Array<{ status: string; count: number }>;
    deals: Array<{ status: string; count: number }>;
  };
}

export default function BulkDeletePage() {
  const { hasHydrated } = useAdminAuth();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DeletionStats | null>({
    totals: {
      transactions: 0,
      payouts: 0,
      deals: 0,
    },
    merchants: [],
    statuses: {
      transactions: [],
      payouts: [],
      deals: [],
    },
  });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: "transactions" | "payouts" | "deals" | "all" | null;
    filters: any;
    count?: number;
  }>({ open: false, type: null, filters: {} });

  // Filters
  const [transactionStatus, setTransactionStatus] = useState<string>("all");
  const [transactionMerchant, setTransactionMerchant] = useState<string>("all");
  const [deleteAllTransactions, setDeleteAllTransactions] = useState(false);

  const [payoutStatus, setPayoutStatus] = useState<string>("all");
  const [deleteAllPayouts, setDeleteAllPayouts] = useState(false);

  const [dealStatus, setDealStatus] = useState<string>("all");
  const [deleteAllDeals, setDeleteAllDeals] = useState(false);

  useEffect(() => {
    if (hasHydrated) {
      loadStats();
    }
  }, [hasHydrated]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await adminApiInstance.get("/admin/bulk-delete/stats");
      setStats(response.data);
    } catch (error) {
      console.error("Error loading stats:", error);
      toast.error("Не удалось загрузить статистику");
    } finally {
      setLoading(false);
    }
  };

  const getFilteredCount = (type: "transactions" | "payouts" | "deals") => {
    if (!stats) return 0;

    switch (type) {
      case "transactions":
        if (deleteAllTransactions) return stats.totals.transactions;
        let count = 0;
        if (transactionStatus && transactionStatus !== "all") {
          const statusData = stats.statuses.transactions.find(s => s.status === transactionStatus);
          count = statusData?.count || 0;
        } else {
          count = stats.totals.transactions;
        }
        // If merchant is selected, we can't accurately calculate without backend query
        return count;

      case "payouts":
        if (deleteAllPayouts) return stats.totals.payouts;
        if (payoutStatus && payoutStatus !== "all") {
          const statusData = stats.statuses.payouts.find(s => s.status === payoutStatus);
          return statusData?.count || 0;
        }
        return stats.totals.payouts;

      case "deals":
        if (deleteAllDeals) return stats.totals.deals;
        if (dealStatus && dealStatus !== "all") {
          const statusData = stats.statuses.deals.find(s => s.status === dealStatus);
          return statusData?.count || 0;
        }
        return stats.totals.deals;

      default:
        return 0;
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.type) return;

    try {
      const url = `/admin/bulk-delete/${deleteDialog.type === "all" ? "all" : deleteDialog.type}`;
      const response = await adminApiInstance.delete(url, {
        data: deleteDialog.type === "all" ? {} : deleteDialog.filters,
      });
      
      toast.success(response.data.message || `Удалено ${response.data.deleted} записей`);

      // Reload stats
      await loadStats();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Не удалось выполнить удаление");
    } finally {
      setDeleteDialog({ open: false, type: null, filters: {} });
    }
  };

  if (!hasHydrated || loading) {
    return (
      <ProtectedRoute variant="admin">
        <AuthLayout variant="admin">
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </AuthLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Массовое удаление</h1>
            <p className="text-muted-foreground">Техническая страница для удаления данных</p>
          </div>

      <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
        <div className="flex gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-destructive">Внимание!</h3>
            <p className="text-sm text-destructive/90">
              Эта страница предназначена только для технических целей. 
              Удаление данных необратимо. Будьте осторожны!
            </p>
          </div>
        </div>
      </div>


      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Транзакции</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totals.transactions || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Выплаты</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totals.payouts || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Сделки</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totals.deals || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Удалить транзакции</CardTitle>
          <CardDescription>Выберите фильтры для удаления транзакций</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="delete-all-transactions"
              checked={deleteAllTransactions}
              onCheckedChange={(checked) => setDeleteAllTransactions(checked as boolean)}
            />
            <Label htmlFor="delete-all-transactions">Удалить все транзакции</Label>
          </div>

          {!deleteAllTransactions && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Статус</Label>
                <Select value={transactionStatus} onValueChange={setTransactionStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Все статусы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    {stats?.statuses.transactions.map((s) => (
                      <SelectItem key={s.status} value={s.status}>
                        {s.status} ({s.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Мерчант</Label>
                <Select value={transactionMerchant} onValueChange={setTransactionMerchant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Все мерчанты" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все мерчанты</SelectItem>
                    {stats?.merchants.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({m.transactionCount || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <Button
            variant="destructive"
            onClick={() => setDeleteDialog({
              open: true,
              type: "transactions",
              filters: {
                status: transactionStatus && transactionStatus !== "all" ? transactionStatus : undefined,
                merchantId: transactionMerchant && transactionMerchant !== "all" ? transactionMerchant : undefined,
                deleteAll: deleteAllTransactions,
              },
              count: getFilteredCount("transactions"),
            })}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Удалить транзакции
          </Button>
        </CardContent>
      </Card>

      {/* Delete Payouts */}
      <Card>
        <CardHeader>
          <CardTitle>Удалить выплаты</CardTitle>
          <CardDescription>Выберите фильтры для удаления выплат</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="delete-all-payouts"
              checked={deleteAllPayouts}
              onCheckedChange={(checked) => setDeleteAllPayouts(checked as boolean)}
            />
            <Label htmlFor="delete-all-payouts">Удалить все выплаты</Label>
          </div>

          {!deleteAllPayouts && (
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select value={payoutStatus} onValueChange={setPayoutStatus}>
                <SelectTrigger className="w-full md:w-1/2">
                  <SelectValue placeholder="Все статусы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  {stats?.statuses.payouts.map((s) => (
                    <SelectItem key={s.status} value={s.status}>
                      {s.status} ({s.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            variant="destructive"
            onClick={() => setDeleteDialog({
              open: true,
              type: "payouts",
              filters: {
                status: payoutStatus && payoutStatus !== "all" ? payoutStatus : undefined,
                deleteAll: deleteAllPayouts,
              },
              count: getFilteredCount("payouts"),
            })}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Удалить выплаты
          </Button>
        </CardContent>
      </Card>

      {/* Delete Deals */}
      <Card>
        <CardHeader>
          <CardTitle>Удалить сделки</CardTitle>
          <CardDescription>Выберите фильтры для удаления сделок</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="delete-all-deals"
              checked={deleteAllDeals}
              onCheckedChange={(checked) => setDeleteAllDeals(checked as boolean)}
            />
            <Label htmlFor="delete-all-deals">Удалить все сделки</Label>
          </div>

          {!deleteAllDeals && (
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select value={dealStatus} onValueChange={setDealStatus}>
                <SelectTrigger className="w-full md:w-1/2">
                  <SelectValue placeholder="Все статусы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  {stats?.statuses.deals.map((s) => (
                    <SelectItem key={s.status} value={s.status}>
                      {s.status} ({s.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            variant="destructive"
            onClick={() => setDeleteDialog({
              open: true,
              type: "deals",
              filters: {
                status: dealStatus && dealStatus !== "all" ? dealStatus : undefined,
                deleteAll: deleteAllDeals,
              },
              count: getFilteredCount("deals"),
            })}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Удалить сделки
          </Button>
        </CardContent>
      </Card>

      {/* Delete Everything */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Удалить все данные</CardTitle>
          <CardDescription>Удалить все транзакции, выплаты и сделки</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialog({
              open: true,
              type: "all",
              filters: {},
              count: (stats?.totals.transactions || 0) + (stats?.totals.payouts || 0) + (stats?.totals.deals || 0),
            })}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Удалить все
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, type: null, filters: {} })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.type === "all" ? (
                <>Вы собираетесь удалить ВСЕ данные. Это действие необратимо!</>
              ) : (
                <>
                  Вы собираетесь удалить {deleteDialog.count || "?"}{" "}
                  {deleteDialog.type === "transactions" ? "транзакций" : 
                   deleteDialog.type === "payouts" ? "выплат" : "сделок"}.
                  Это действие необратимо!
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>
        </div>
      </AuthLayout>
    </ProtectedRoute>
  );
}