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
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { traderApi } from "@/services/api";
import { toast } from "sonner";
import { Loader2, CreditCard, Plus, Trash2 } from "lucide-react";
import { AddBTRequisiteDialog } from "@/components/bt-entry/add-bt-requisite-dialog";
import { cn } from "@/lib/utils";

interface RequisitesListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Requisite {
  id: string;
  recipientName: string;
  cardNumber: string;
  bankType: string;
  phoneNumber?: string;
  methodType: string;
  minAmount: number;
  maxAmount: number;
  sumLimit: number;
  currentTotalAmount: number;
  isActive: boolean;
  createdAt: string;
  activeDeals?: number;
}

export function RequisitesListDialog({
  open,
  onOpenChange,
}: RequisitesListDialogProps) {
  const [loading, setLoading] = useState(true);
  const [activeRequisites, setActiveRequisites] = useState<Requisite[]>([]);
  const [deletedRequisites, setDeletedRequisites] = useState<Requisite[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("active");

  const fetchRequisites = async () => {
    setLoading(true);
    try {
      const response = await traderApi.btEntrance.getRequisites();
      const allRequisites = response.data || [];
      
      // Separate active and archived requisites based on isActive field
      const active = allRequisites.filter((req: any) => req.isActive);
      const archived = allRequisites.filter((req: any) => !req.isActive);

      setActiveRequisites(active);
      setDeletedRequisites(archived);
    } catch (error) {
      console.error("Failed to fetch requisites:", error);
      toast.error("Не удалось загрузить реквизиты");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchRequisites();
    }
  }, [open]);

  const archiveRequisite = async (id: string) => {
    try {
      await traderApi.btEntrance.updateRequisite(id, { isArchived: true });
      toast.success("Реквизит архивирован");
      fetchRequisites();
    } catch (error: any) {
      const msg = error?.response?.data?.error || "Не удалось архивировать реквизит";
      toast.error(msg);
    }
  };

  const restoreRequisite = async (id: string) => {
    try {
      await traderApi.btEntrance.updateRequisite(id, { isArchived: false });
      toast.success("Реквизит активирован");
      fetchRequisites();
    } catch (error: any) {
      const msg = error?.response?.data?.error || "Не удалось активировать реквизит";
      toast.error(msg);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Реквизиты без устройств</DialogTitle>
            <DialogDescription>
              Управление реквизитами для БТ-входа
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active">Активные ({activeRequisites.length})</TabsTrigger>
              <TabsTrigger value="deleted">Удаленные ({deletedRequisites.length})</TabsTrigger>
            </TabsList>
            
            <div className="flex justify-end mt-4">
              <Button
                onClick={() => setAddDialogOpen(true)}
                className="bg-[#006039] hover:bg-[#006039]/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить реквизит
              </Button>
            </div>
            

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#006039]" />
              </div>
            ) : (
              <>
                <TabsContent value="active" className="mt-4">
                  {activeRequisites.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                      <p>Нет активных реквизитов</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setAddDialogOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Добавить первый реквизит
                      </Button>
                    </div>
                  ) : (
                    <ScrollArea className="h-[300px] sm:h-[400px] pr-2 sm:pr-4">
                      <div className="space-y-3">
                        {activeRequisites.map((req) => (
                    <Card
                      key={req.id}
                      className={cn(
                        "p-4 transition-all",
                        !req.isActive && "opacity-60"
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                            <CreditCard className="h-5 w-5 text-[#006039]" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{req.recipientName}</h4>
                              <Badge
                                variant={req.isActive ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {req.isActive ? "Активен" : "Архивирован"}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {req.methodType === "sbp" 
                                ? `${req.phoneNumber} • СБП`
                                : `${req.cardNumber?.replace(/(\d{4})/g, "$1 ").trim()} • ${req.bankType}`
                              }
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                              Метод: {req.methodType === "c2c" ? "Банковская карта" : "СБП"}
                            </p>
                            <div className="flex flex-wrap gap-2 sm:gap-4 mt-2 text-xs text-gray-500">
                              <span>Мин: {(req.minAmount || 0).toLocaleString()} ₽</span>
                              <span>Макс: {(req.maxAmount || 0).toLocaleString()} ₽</span>
                              {(req.sumLimit || 0) > 0 && (
                                <span className="hidden sm:inline">
                                  Лимит: {(req.currentTotalAmount || 0).toLocaleString()}/{(req.sumLimit || 0).toLocaleString()} ₽
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700 w-full sm:w-auto"
                            onClick={() => archiveRequisite(req.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
              
              <TabsContent value="deleted" className="mt-4">
                {deletedRequisites.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                    <p>Нет удаленных реквизитов</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px] sm:h-[400px] pr-2 sm:pr-4">
                    <div className="space-y-3">
                      {deletedRequisites.map((req) => (
                        <Card
                          key={req.id}
                          className={cn(
                            "p-4 transition-all",
                            req.isArchived && "opacity-60"
                          )}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                                <CreditCard className="h-5 w-5 text-[#006039]" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold">{req.recipientName}</h4>
                                  <Badge
                                    variant={req.isActive ? "default" : "secondary"}
                                    className="text-xs"
                                  >
                                    {req.isActive ? "Активен" : "Архивирован"}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {req.methodType === "sbp" 
                                    ? `${req.phoneNumber} • СБП`
                                    : `${req.cardNumber?.replace(/(\d{4})/g, "$1 ").trim()} • ${req.bankType}`
                                  }
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                                  Метод: {req.methodType === "c2c" ? "Банковская карта" : "СБП"}
                                </p>
                                <div className="flex flex-wrap gap-2 sm:gap-4 mt-2 text-xs text-gray-500">
                                  <span>Мин: {(req.minAmount || 0).toLocaleString()} ₽</span>
                                  <span>Макс: {(req.maxAmount || 0).toLocaleString()} ₽</span>
                                  {(req.sumLimit || 0) > 0 && (
                                    <span className="hidden sm:inline">
                                      Лимит: {(req.currentTotalAmount || 0).toLocaleString()}/{(req.sumLimit || 0).toLocaleString()} ₽
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full sm:w-auto"
                                onClick={() => restoreRequisite(req.id)}
                              >
                                Восстановить
                              </Button>
                          </div>
                        </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>

      <AddBTRequisiteDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={() => {
          fetchRequisites();
          setAddDialogOpen(false);
        }}
      />
    </>
  );
}