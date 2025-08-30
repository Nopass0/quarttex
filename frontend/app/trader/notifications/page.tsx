"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/simple-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TraderHeader } from "@/components/trader/trader-header";
import { traderApi } from "@/services/api";
import { toast } from "sonner";
import { useTraderAuth } from "@/stores/auth";
import { Loader2, MessageSquare, Search, Filter, ChevronRight, Smartphone, CheckCircle, X } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  application: string | null;
  packageName: string | null;
  title: string | null;
  message: string;
  metadata: any;
  isRead: boolean;
  isProcessed: boolean;
  createdAt: string;
  deviceId: string | null;
  deviceName: string | null;
  matchedTransaction: {
    id: string;
    numericId: number;
    amount: number;
    status: string;
    merchantName: string;
  } | null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const notificationId = searchParams.get("notificationId");
  const { isAuthenticated } = useTraderAuth();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [processingFilter, setProcessingFilter] = useState<string>("all");
  const [deviceFilter, setDeviceFilter] = useState<string>("all");
  const [devices, setDevices] = useState<Array<{ id: string; name: string }>>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [loadingNotification, setLoadingNotification] = useState(false);
  
  // Fetch notifications
  const fetchNotifications = async (pageNum = 1, append = false) => {
    if (pageNum === 1) {
      setLoading(true);
    }
    
    try {
      const params: any = {
        page: pageNum,
        limit: 20,
      };
      
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      if (processingFilter !== "all") {
        params.isProcessed = processingFilter;
      }
      
      if (deviceFilter !== "all") {
        params.deviceId = deviceFilter;
      }
      
      const response = await traderApi.getNotifications(params);
      
      if (append) {
        setNotifications(prev => [...prev, ...response.data]);
      } else {
        setNotifications(response.data);
      }
      
      setHasMore(response.data.length === 20);
    } catch (error) {
      toast.error("Не удалось загрузить уведомления");
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch notification details
  const fetchNotificationDetails = async (id: string) => {
    setLoadingNotification(true);
    try {
      const response = await traderApi.getNotificationDetails(id);
      setSelectedNotification(response);
    } catch (error) {
      toast.error("Не удалось загрузить детали уведомления");
    } finally {
      setLoadingNotification(false);
    }
  };
  
  // Fetch devices
  const fetchDevices = async () => {
    try {
      const response = await traderApi.getDevices();
      setDevices(response.devices || response || []);
    } catch (error) {
      console.error("Failed to fetch devices:", error);
    }
  };
  
  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      await traderApi.markNotificationAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };
  
  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      fetchDevices();
      fetchNotifications();
    }
  }, [isAuthenticated]);
  
  // Handle notification ID from URL
  useEffect(() => {
    if (notificationId && isAuthenticated) {
      fetchNotificationDetails(notificationId);
    }
  }, [notificationId, isAuthenticated]);
  
  // Refetch when filters change
  useEffect(() => {
    if (!loading) {
      setPage(1);
      fetchNotifications(1, false);
    }
  }, [searchQuery, processingFilter, deviceFilter]);
  
  // Load more on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
          document.documentElement.offsetHeight - 100 &&
        !loading &&
        hasMore
      ) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchNotifications(nextPage, true);
      }
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, hasMore, page]);
  
  if (!isAuthenticated) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-background">
      <TraderHeader />
      
      <main className="mx-auto max-w-7xl">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold dark:text-white">Уведомления</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Уведомления от банковских приложений
            </p>
          </div>
          
          {/* Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Поиск по тексту уведомления..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={processingFilter} onValueChange={setProcessingFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Статус обработки" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все уведомления</SelectItem>
                  <SelectItem value="true">Обработанные</SelectItem>
                  <SelectItem value="false">Необработанные</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={deviceFilter} onValueChange={setDeviceFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Устройство" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все устройства</SelectItem>
                  {devices.map(device => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Notifications List */}
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : notifications.length === 0 ? (
            <Card className="p-8 text-center">
              <MessageSquare className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Уведомления не найдены
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${
                    !notification.isRead ? "border-blue-500 dark:border-blue-400" : ""
                  }`}
                  onClick={() => {
                    setSelectedNotification(null);
                    fetchNotificationDetails(notification.id);
                    markAsRead(notification.id);
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        notification.isProcessed 
                          ? "bg-green-100 dark:bg-green-900/30" 
                          : "bg-gray-100 dark:bg-gray-700"
                      }`}>
                        <MessageSquare className={`h-5 w-5 ${
                          notification.isProcessed 
                            ? "text-green-600 dark:text-green-400" 
                            : "text-gray-500 dark:text-gray-400"
                        }`} />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-sm dark:text-white">
                            {notification.application || "Банковское приложение"}
                          </h3>
                          {!notification.isRead && (
                            <Badge variant="secondary" className="text-xs">
                              Новое
                            </Badge>
                          )}
                          {notification.isProcessed && (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                              Обработано
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(notification.createdAt), "HH:mm", { locale: ru })}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Smartphone className="h-3 w-3" />
                          <span>{notification.deviceName || "Устройство"}</span>
                        </div>
                        {notification.matchedTransaction && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                            <span>Сделка #{notification.matchedTransaction.numericId}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  </div>
                </Card>
              ))}
              
              {loading && notifications.length > 0 && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      
      {/* Notification Details Modal */}
      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {loadingNotification ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : selectedNotification ? (
            <>
              <DialogHeader>
                <DialogTitle>Детали уведомления</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Header */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium dark:text-white">
                      {selectedNotification.application || "Банковское приложение"}
                    </h3>
                    <Badge className={selectedNotification.isProcessed 
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                      : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                    }>
                      {selectedNotification.isProcessed ? "Обработано" : "Не обработано"}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(selectedNotification.createdAt), "d MMMM yyyy 'г., в' HH:mm", { locale: ru })}
                  </p>
                </div>
                
                {/* Message */}
                <div className="border dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium mb-2 dark:text-white">Сообщение</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {selectedNotification.message}
                  </p>
                </div>
                
                {/* Device */}
                <div className="border dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium mb-2 dark:text-white">Устройство</h4>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {selectedNotification.deviceName || "Неизвестное устройство"}
                    </span>
                  </div>
                </div>
                
                {/* Matched Transactions */}
                {selectedNotification.matchedTransactions && selectedNotification.matchedTransactions.length > 0 && (
                  <div className="border dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-medium mb-3 dark:text-white">Связанные сделки</h4>
                    <div className="space-y-2">
                      {selectedNotification.matchedTransactions.map((tx: any) => (
                        <div
                          key={tx.id}
                          className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => {
                            setSelectedNotification(null);
                            router.push(`/trader/deals`);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm dark:text-white">
                                Сделка #{tx.numericId}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {tx.merchant.name} • {tx.amount.toLocaleString("ru-RU")} RUB
                              </p>
                            </div>
                            <Badge className={tx.status === "READY" || tx.status === "COMPLETED"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            }>
                              {tx.status === "READY" ? "Готово" : 
                               tx.status === "COMPLETED" ? "Завершено" :
                               tx.status === "IN_PROGRESS" ? "В работе" : tx.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Metadata */}
                {selectedNotification.metadata && Object.keys(selectedNotification.metadata).length > 0 && (
                  <div className="border dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-medium mb-2 dark:text-white">Дополнительная информация</h4>
                    <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                      {selectedNotification.packageName && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Пакет: </span>
                          {selectedNotification.packageName}
                        </div>
                      )}
                      {selectedNotification.title && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Заголовок: </span>
                          {selectedNotification.title}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setSelectedNotification(null)}
                >
                  Закрыть
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}