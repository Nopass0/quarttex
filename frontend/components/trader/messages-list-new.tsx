"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { traderApi } from "@/services/api";
import { BANKS } from "@/constants/banks";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { TraderHeader } from "@/components/trader/trader-header";
import {
  Loader2,
  ChevronDown,
  Search,
  ArrowUpDown,
  Calendar,
  Smartphone,
  MessageSquare,
  X,
  SlidersHorizontal,
  CheckCircle,
  Users,
  User,
  Package,
  MoreHorizontal,
  Building2,
  CreditCard,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  numericId: number;
  packageName: string;
  text: string;
  timestamp: string;
  deviceId?: string;
  deviceName?: string;
  deviceModel?: string;
  amount?: number;
  currency?: string;
  status: "processed" | "warning" | "danger" | "new";
  isNew?: boolean;
  type?: string;
  title?: string;
  application?: string;
  isRead?: boolean;
  metadata?: any;
}

const mockMessages: Message[] = [
  {
    id: "90330583",
    numericId: 90330583,
    packageName: "ru.vtb24.mobilebanking.android",
    text: "ВТБ Онлайн | Оплата 412р Карта*7650 YANDEX*4121*TAX Баланс 23636.53р 21:10",
    timestamp: "2025-07-09T20:55:00",
    deviceId: "9d309ffc-2b7d-412d-ace7-d0f21841ba4d",
    deviceName: "Samsung Galaxy S22",
    deviceModel: "SM-S901B",
    amount: 0,
    currency: "RUB",
    status: "processed",
  },
  {
    id: "90305917",
    numericId: 90305917,
    packageName: "ru.sberbankmobile",
    text: "Перевод 14000р от ИВАН И. Баланс: 45320р",
    timestamp: "2025-07-09T18:02:00",
    deviceId: "9d309ffc-2b7d-412d-ace7-d0f21841ba4d",
    deviceName: "iPhone 14 Pro",
    deviceModel: "A2890",
    amount: 14000,
    currency: "RUB",
    status: "processed",
  },
  {
    id: "90154099",
    numericId: 90154099,
    packageName: "ru.vtb24.mobilebanking.android",
    text: "ВТБ Онлайн | Поступление 30000р Счет*5715 от АНИ Н. Баланс 30053.47р 22:42",
    timestamp: "2025-07-07T22:42:00",
    deviceId: "9d309ffc-2b7d-412d-ace7-d0f21841ba4d",
    deviceName: "Xiaomi 12",
    deviceModel: "2201123G",
    amount: 30000,
    currency: "RUB",
    status: "danger",
  },
  {
    id: "90100966",
    numericId: 90100966,
    packageName: "com.idamob.tinkoff.android",
    text: "Пополнение, счет RUB. 4000 RUB. Анастасия В. Доступно 4142 RUB",
    timestamp: "2025-07-07T19:27:00",
    deviceId: "6884a2e4-aa34-4057-9ba8-48c11ce19893",
    deviceName: "OnePlus 10 Pro",
    deviceModel: "NE2213",
    amount: 4000,
    currency: "RUB",
    status: "danger",
  },
];

const AVAILABLE_BANKS = BANKS;

const getBankIcon = (bankType: string, size: "sm" | "md" = "md") => {
  const bankLogos: Record<string, string> = {
    SBERBANK: "/bank-logos/sberbank.svg",
    SBER: "/bank-logos/sberbank.svg",
    TBANK: "/bank-logos/tbank.svg",
    TINKOFF: "/bank-logos/tinkoff.svg",
    TINK: "/bank-logos/tinkoff.svg",
    VTB: "/bank-logos/vtb.svg",
    ALFABANK: "/bank-logos/alfabank.svg",
    ALFA: "/bank-logos/alfabank.svg",
    GAZPROMBANK: "/bank-logos/gazprombank.svg",
    GAZPROM: "/bank-logos/gazprombank.svg",
    OZONBANK: "/bank-logos/ozon.svg",
    OZON: "/bank-logos/ozon.svg",
    RAIFFEISENBANK: "/bank-logos/raiffeisen.svg",
    RAIFF: "/bank-logos/raiffeisen.svg",
    POCHTABANK: "/bank-logos/pochtabank.svg",
    POCHTA: "/bank-logos/pochtabank.svg",
    RSHB: "/bank-logos/rshb.svg",
    ROSSELKHOZBANK: "/bank-logos/rshb.svg",
    MTS: "/bank-logos/mts.svg",
    MTSBANK: "/bank-logos/mts.svg",
    PSB: "/bank-logos/psb.svg",
    SOVCOMBANK: "/bank-logos/sovcombank.svg",
    SOVCOM: "/bank-logos/sovcombank.svg",
    URALSIB: "/bank-logos/uralsib.svg",
    MKB: "/bank-logos/mkb.svg",
    ROSBANK: "/bank-logos/rosbank.svg",
    OTKRITIE: "/bank-logos/otkritie.svg",
    OPENBANK: "/bank-logos/otkritie.svg",
    AVANGARD: "/bank-logos/avangard.svg",
    ZENIT: "/bank-logos/zenit.svg",
    AKBARS: "/bank-logos/akbars.svg",
    SBP: "/bank-logos/sbp.svg",
  };

  const sizeClasses = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const logoPath = bankLogos[bankType?.toUpperCase()];

  if (!logoPath) {
    return (
      <div className={`${sizeClasses} rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center`}>
        <CreditCard className="w-5 h-5 text-gray-600" />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses} rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden`}>
      <img src={logoPath} alt={bankType} className="w-full h-full object-contain p-1" />
    </div>
  );
};

export function MessagesListNew() {
  const searchParams = useSearchParams();
  const notificationId = searchParams.get("notificationId");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDevice, setFilterDevice] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [viewMode, setViewMode] = useState<"team" | "user">("team");
  
  // New filter states
  const [devices, setDevices] = useState<any[]>([]);
  const [deviceSearch, setDeviceSearch] = useState("");
  const [filterBank, setFilterBank] = useState("all");
  const [bankSearch, setBankSearch] = useState("");
  const [filterAmountType, setFilterAmountType] = useState<"all" | "exact" | "range">("all");
  const [filterAmount, setFilterAmount] = useState({ exact: "", min: "", max: "" });
  
  // Pagination states for infinite scroll
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [allDevicesLoaded, setAllDevicesLoaded] = useState(false);

  const router = useRouter();

  const fetchMessages = async (append = false) => {
    try {
      if (!append) {
        setLoading(true);
        setCurrentDeviceIndex(0);
      } else {
        setLoadingMore(true);
      }
      
      // Fetch devices if not already loaded
      let devicesData = devices;
      if (devices.length === 0) {
        const devicesResponse = await traderApi.getDevices();
        console.log('Devices response:', devicesResponse);
        
        // Handle different response structures
        if (devicesResponse?.devices) {
          devicesData = devicesResponse.devices;
        } else if (devicesResponse?.data?.devices) {
          devicesData = devicesResponse.data.devices;
        } else if (Array.isArray(devicesResponse?.data)) {
          devicesData = devicesResponse.data;
        } else if (Array.isArray(devicesResponse)) {
          devicesData = devicesResponse;
        } else {
          devicesData = [];
        }
        
        setDevices(devicesData);
        
        if (!Array.isArray(devicesData) || devicesData.length === 0) {
          console.log('No devices found');
          setHasMore(false);
          setLoading(false);
          return;
        }
      }
      
      // Determine how many devices to load at once (batch size)
      const batchSize = 3;
      const startIndex = append ? currentDeviceIndex : 0;
      const endIndex = Math.min(startIndex + batchSize, devicesData.length);
      const devicesToLoad = devicesData.slice(startIndex, endIndex);
      
      let newMessages: Message[] = [];
      
      // Fetch notifications from the batch of devices
      if (devicesToLoad.length > 0) {
        const messagePromises = devicesToLoad.map(async (device: any) => {
          try {
            const deviceResponse = await traderApi.getDevice(device.id);
            console.log(`Device ${device.id} response:`, deviceResponse);
            
            // Handle different response structures
            let deviceData = deviceResponse?.data || deviceResponse || {};
            let notifications = deviceData.recentNotifications || 
                              deviceData.notifications || 
                              [];
            
            return Array.isArray(notifications) ? notifications.map((notification: any) => ({
              id: notification.id || `${device.id}-${Date.now()}`,
              numericId: parseInt(notification.id?.slice(-8) || '0', 16),
              packageName: notification.application || 'Unknown App',
              text: notification.message || notification.text || '',
              timestamp: notification.createdAt || new Date().toISOString(),
              deviceId: device.id,
              deviceName: device.name,
              deviceModel: device.model || 'Unknown Model',
              amount: notification.metadata?.extractedAmount || notification.metadata?.amount || 0,
              currency: 'RUB',
              status: notification.isRead ? 'processed' : 'new',
              isNew: !notification.isRead,
              type: notification.type,
              title: notification.title,
              application: notification.application,
              isRead: notification.isRead,
              metadata: notification.metadata
            })) : [];
          } catch (error) {
            console.error(`Failed to fetch notifications for device ${device.id}:`, error);
            return [];
          }
        });
        
        const results = await Promise.all(messagePromises);
        newMessages = results.flat();
      }
      
      if (append) {
        setMessages(prev => [...prev, ...newMessages]);
      } else {
        setMessages(newMessages);
      }
      
      // Update pagination state
      setCurrentDeviceIndex(endIndex);
      setHasMore(endIndex < devicesData.length);
      
      if (endIndex >= devicesData.length) {
        setAllDevicesLoaded(true);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast.error('Не удалось загрузить сообщения');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const response = await traderApi.getDevices();
      setDevices(response.devices || response || []);
    } catch (error) {
      console.error("Failed to fetch devices:", error);
    }
  };


  const fetchNotificationDetails = async (id: string) => {
    try {
      const response = await traderApi.getNotificationDetails(id);
      if (response) {
        // Convert notification to message format
        const message: Message = {
          id: response.id,
          numericId: parseInt(response.id.slice(-6), 36) || 0,
          packageName: response.packageName || "",
          text: response.message,
          timestamp: response.createdAt,
          deviceId: response.deviceId || undefined,
          deviceName: response.deviceName || undefined,
          deviceModel: "",
          amount: 0,
          currency: "RUB",
          status: response.isProcessed ? "processed" : "new",
          isNew: !response.isRead,
          type: response.type,
          title: response.title || response.application || "Уведомление",
          application: response.application || undefined,
          isRead: response.isRead,
          metadata: response.metadata
        };
        setSelectedMessage(message);
      }
    } catch (error) {
      console.error("Failed to fetch notification details:", error);
    }
  };

  // Fallback to load all messages at once (old method)
  const fetchAllMessages = async () => {
    try {
      setLoading(true);
      
      // Fetch devices and their notifications
      const devicesResponse = await traderApi.getDevices();
      const devicesData = devicesResponse.data || devicesResponse || [];
      
      let allMessages: Message[] = [];
      
      // Fetch notifications from all devices
      if (Array.isArray(devicesData)) {
        const messagePromises = devicesData.map(async (device: any) => {
          try {
            const deviceResponse = await traderApi.getDevice(device.id);
            const deviceData = deviceResponse.data || deviceResponse || {};
            const notifications = deviceData.recentNotifications || [];
            
            return Array.isArray(notifications) ? notifications.map((notification: any) => ({
              id: notification.id || `${device.id}-${Date.now()}`,
              numericId: parseInt(notification.id?.slice(-8) || '0', 16),
              packageName: notification.application || 'Unknown App',
              text: notification.message || notification.text || '',
              timestamp: notification.createdAt || new Date().toISOString(),
              deviceId: device.id,
              deviceName: device.name,
              deviceModel: device.model || 'Unknown Model',
              amount: notification.metadata?.extractedAmount || notification.metadata?.amount || 0,
              currency: 'RUB',
              status: notification.isRead ? 'processed' : 'new',
              isNew: !notification.isRead,
              type: notification.type,
              title: notification.title,
              application: notification.application,
              isRead: notification.isRead,
              metadata: notification.metadata
            })) : [];
          } catch (error) {
            console.error(`Failed to fetch notifications for device ${device.id}:`, error);
            return [];
          }
        });
        
        const results = await Promise.all(messagePromises);
        allMessages = results.flat();
      }
      
      setMessages(allMessages);
      setHasMore(false);
      setAllDevicesLoaded(true);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast.error('Не удалось загрузить сообщения');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Try new paginated loading first, fallback to old method if it fails
    fetchMessages().catch(() => {
      console.log('Falling back to loading all messages at once');
      fetchAllMessages();
    });
    fetchDevices();
  }, []);

  // Handle scroll for infinite loading
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || loadingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // Check if we've scrolled to the bottom
    if (scrollHeight - scrollTop - clientHeight < 100) {
      fetchMessages(true);
    }
  }, [loadingMore, hasMore]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Handle notification ID from URL
  useEffect(() => {
    if (notificationId && messages.length > 0) {
      // Find notification in messages
      const notification = messages.find(m => m.id === notificationId);
      if (notification) {
        setSelectedMessage(notification);
      } else {
        // Try to fetch notification details
        fetchNotificationDetails(notificationId);
      }
    }
  }, [notificationId, messages]);

  const getFilteredMessages = () => {
    let filtered = messages;

    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.numericId.toString().includes(searchQuery) ||
          (m.packageName || '').toLowerCase().includes(searchLower) ||
          (m.text || '').toLowerCase().includes(searchLower) ||
          (m.deviceName || '').toLowerCase().includes(searchLower) ||
          (m.amount && m.amount.toString().includes(searchQuery)),
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((m) => m.status === filterStatus);
    }

    // Device filter
    if (filterDevice !== "all") {
      filtered = filtered.filter((m) => m.deviceId === filterDevice);
    }

    // Bank filter
    if (filterBank !== "all") {
      // Filter by bank - extract from package name or metadata
      filtered = filtered.filter((m) => {
        const packageLower = (m.packageName || '').toLowerCase();
        const bankLower = filterBank.toLowerCase();
        return packageLower.includes(bankLower) || m.metadata?.bankType === filterBank;
      });
    }

    // Amount filter
    if (filterAmountType !== "all") {
      if (filterAmountType === "exact" && filterAmount.exact) {
        const exactAmount = parseFloat(filterAmount.exact);
        filtered = filtered.filter((m) => m.amount === exactAmount);
      } else if (filterAmountType === "range") {
        const minAmount = filterAmount.min ? parseFloat(filterAmount.min) : 0;
        const maxAmount = filterAmount.max ? parseFloat(filterAmount.max) : Infinity;
        filtered = filtered.filter((m) => (m.amount || 0) >= minAmount && (m.amount || 0) <= maxAmount);
      }
    }

    // Date filter
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom);
      filtered = filtered.filter((m) => new Date(m.timestamp) >= fromDate);
    }
    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((m) => new Date(m.timestamp) <= toDate);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        case "oldest":
          return (
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        case "amount_desc":
          return (b.amount || 0) - (a.amount || 0);
        case "amount_asc":
          return (a.amount || 0) - (b.amount || 0);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredMessages = getFilteredMessages();

  const formatDateTime = (timestamp: string) => {
    return format(new Date(timestamp), "d MMMM yyyy 'г., в' HH:mm", {
      locale: ru,
    });
  };

  const getMessageIcon = () => (
    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
      <MessageSquare className="h-6 w-6 text-gray-600" />
    </div>
  );

  const getDeviceIcon = () => (
    <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
      <Smartphone className="h-5 w-5 text-gray-500" />
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#006039]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with user info */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg md:text-xl font-semibold text-gray-900">Сообщения</h1>

        <div className="hidden md:flex items-center gap-4">
          <TraderHeader />
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#006039] h-4 w-4" />
          <Input
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border h-10 md:h-12 text-sm md:text-base border-gray-300 rounded-lg"
          />
        </div>

        <div className="flex gap-2">
        {/* Filters */}
        <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="default"
              className="gap-1 md:gap-2 h-10 md:h-12 px-3 md:px-6 text-sm md:text-base flex-1 sm:flex-initial"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 md:h-4 md:w-4 text-[#006039]" />
              <span className="hidden sm:inline">Не выбраны</span>
              {(filterStatus !== "all" ||
                filterDevice !== "all" ||
                filterBank !== "all" ||
                filterAmountType !== "all" ||
                filterDateFrom ||
                filterDateTo) && (
                <Badge className="ml-1 bg-[#006039] text-white">
                  {
                    [
                      filterStatus !== "all",
                      filterDevice !== "all",
                      filterBank !== "all",
                      filterAmountType !== "all",
                      filterDateFrom || filterDateTo,
                    ].filter(Boolean).length
                  }
                </Badge>
              )}
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-colors",
                  filtersOpen ? "text-[#006039]" : "text-gray-400",
                )}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[calc(100vw-2rem)] sm:w-[500px] max-h-[80vh] overflow-y-auto" sideOffset={5}>
            <div className="space-y-4">
              <h4 className="font-medium">Параметры поиска</h4>

              {/* Status Filter */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-[#006039]" />
                  <Label className="text-sm">Статус сообщения</Label>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="default"
                      className="w-full justify-between h-12"
                    >
                      <span className="text-[#006039]">
                        {filterStatus === "all"
                          ? "Все сообщения"
                          : filterStatus === "processed"
                            ? "Обработанные"
                            : filterStatus === "danger"
                              ? "Без реквизита"
                              : filterStatus === "warning"
                                ? "Без сделки"
                                : "Новые"}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50 text-[#006039]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[465px] p-0"
                    align="start"
                    sideOffset={5}
                  >
                    <div className="max-h-64 overflow-auto">
                      <Button
                        variant="ghost"
                        size="default"
                        className={cn(
                          "w-full justify-start h-12 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-[#006039] dark:hover:text-green-400",
                          filterStatus === "all" &&
                            "text-[#006039] dark:text-green-400 bg-green-50 dark:bg-green-900/20",
                        )}
                        onClick={() => setFilterStatus("all")}
                      >
                        Все сообщения
                      </Button>
                      <Button
                        variant="ghost"
                        size="default"
                        className={cn(
                          "w-full justify-start h-12 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-[#006039] dark:hover:text-green-400",
                          filterStatus === "processed" &&
                            "text-[#006039] dark:text-green-400 bg-green-50 dark:bg-green-900/20",
                        )}
                        onClick={() => setFilterStatus("processed")}
                      >
                        Обработанные
                      </Button>
                      <Button
                        variant="ghost"
                        size="default"
                        className={cn(
                          "w-full justify-start h-12 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-[#006039] dark:hover:text-green-400",
                          filterStatus === "danger" &&
                            "text-[#006039] dark:text-green-400 bg-green-50 dark:bg-green-900/20",
                        )}
                        onClick={() => setFilterStatus("danger")}
                      >
                        Без реквизита
                      </Button>
                      <Button
                        variant="ghost"
                        size="default"
                        className={cn(
                          "w-full justify-start h-12 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-[#006039] dark:hover:text-green-400",
                          filterStatus === "warning" &&
                            "text-[#006039] dark:text-green-400 bg-green-50 dark:bg-green-900/20",
                        )}
                        onClick={() => setFilterStatus("warning")}
                      >
                        Без сделки
                      </Button>
                      <Button
                        variant="ghost"
                        size="default"
                        className={cn(
                          "w-full justify-start h-12 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-[#006039] dark:hover:text-green-400",
                          filterStatus === "new" &&
                            "text-[#006039] dark:text-green-400 bg-green-50 dark:bg-green-900/20",
                        )}
                        onClick={() => setFilterStatus("new")}
                      >
                        Новые
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Device Filter */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-[#006039]" />
                  <Label className="text-sm">Устройства</Label>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="default"
                      className="w-full justify-between h-12"
                    >
                      <span className="text-[#006039]">Все устройства</span>
                      <ChevronDown className="h-4 w-4 opacity-50 text-[#006039]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[465px] p-0"
                    align="start"
                    sideOffset={5}
                  >
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input 
                          placeholder="Поиск устройств" 
                          className="pl-9" 
                          value={deviceSearch}
                          onChange={(e) => setDeviceSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-auto">
                      <Button
                        variant="ghost"
                        size="default"
                        className={cn(
                          "w-full justify-start h-12 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-[#006039] dark:hover:text-green-400",
                          filterDevice === "all" &&
                            "text-[#006039] dark:text-green-400 bg-green-50 dark:bg-green-900/20",
                        )}
                        onClick={() => setFilterDevice("all")}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Smartphone className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="text-left">
                            <div className="font-medium">Все устройства</div>
                            <div className="text-sm text-gray-500">
                              Не фильтровать по устройству
                            </div>
                          </div>
                        </div>
                      </Button>
                      {devices
                        .filter((device) => 
                          !deviceSearch || 
                          device.name?.toLowerCase().includes(deviceSearch.toLowerCase()) ||
                          device.id?.toLowerCase().includes(deviceSearch.toLowerCase())
                        )
                        .map((device) => (
                          <Button
                            key={device.id}
                            variant="ghost"
                            size="default"
                            className={cn(
                              "w-full justify-start h-12 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-[#006039] dark:hover:text-green-400",
                              filterDevice === device.id && "text-[#006039] dark:text-green-400 bg-green-50 dark:bg-green-900/20",
                            )}
                            onClick={() => setFilterDevice(device.id)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Smartphone className="h-4 w-4 text-gray-600" />
                              </div>
                              <div className="text-left">
                                <div className="font-medium">{device.name}</div>
                                <div className="text-sm text-gray-500">
                                  {device.isOnline ? "Онлайн" : "Оффлайн"} • ID: {device.id.slice(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </Button>
                        ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#006039]" />
                  <Label className="text-sm">Дата получения</Label>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="flex-1 h-12"
                    placeholder="От"
                  />
                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="flex-1 h-12"
                    placeholder="До"
                  />
                </div>
              </div>


              {/* Bank Filter */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-[#006039]" />
                  <Label className="text-sm">Банк</Label>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="default"
                      className="w-full justify-between h-12"
                    >
                      <span className="text-[#006039]">
                        {filterBank === "all" ? "Все банки" : AVAILABLE_BANKS.find(b => b.code === filterBank)?.name || filterBank}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50 text-[#006039]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[465px] p-0"
                    align="start"
                    sideOffset={5}
                  >
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Поиск банков"
                          className="pl-9"
                          value={bankSearch}
                          onChange={(e) => setBankSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-auto">
                      <Button
                        variant="ghost"
                        size="default"
                        className={cn(
                          "w-full justify-start h-12 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-[#006039] dark:hover:text-green-400",
                          filterBank === "all" &&
                            "text-[#006039] dark:text-green-400 bg-green-50 dark:bg-green-900/20",
                        )}
                        onClick={() => setFilterBank("all")}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <CreditCard className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="text-left">
                            <div className="font-medium">Все банки</div>
                            <div className="text-sm text-gray-500">
                              Не фильтровать по банку
                            </div>
                          </div>
                        </div>
                      </Button>
                      {AVAILABLE_BANKS
                        .filter((bank) => 
                          !bankSearch || 
                          bank.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
                          bank.code.toLowerCase().includes(bankSearch.toLowerCase())
                        )
                        .map((bank) => (
                          <Button
                            key={bank.code}
                            variant="ghost"
                            size="default"
                            className={cn(
                              "w-full justify-start h-12 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-[#006039] dark:hover:text-green-400",
                              filterBank === bank.code && "text-[#006039] dark:text-green-400 bg-green-50 dark:bg-green-900/20",
                            )}
                            onClick={() => setFilterBank(bank.code)}
                          >
                            <div className="flex items-center gap-3">
                              {getBankIcon(bank.code, "sm")}
                              <div className="text-left">
                                <div className="font-medium">{bank.name}</div>
                              </div>
                            </div>
                          </Button>
                        ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Amount Filter */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-[#006039]" />
                  <Label className="text-sm">Сумма</Label>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="default"
                      className="w-full justify-between h-12"
                    >
                      <span className="text-[#006039]">
                        {filterAmountType === "all"
                          ? "Любая сумма"
                          : filterAmountType === "exact"
                            ? `Точно ${filterAmount.exact || "..."} ₽`
                            : `От ${filterAmount.min || "..."} до ${filterAmount.max || "..."} ₽`}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50 text-[#006039]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[465px] p-3"
                    align="start"
                    sideOffset={5}
                  >
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Button
                          variant={filterAmountType === "all" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFilterAmountType("all")}
                          className={cn(
                            filterAmountType === "all" && "bg-[#006039] hover:bg-[#005030]"
                          )}
                        >
                          Любая
                        </Button>
                        <Button
                          variant={filterAmountType === "exact" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFilterAmountType("exact")}
                          className={cn(
                            filterAmountType === "exact" && "bg-[#006039] hover:bg-[#005030]"
                          )}
                        >
                          Точная
                        </Button>
                        <Button
                          variant={filterAmountType === "range" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFilterAmountType("range")}
                          className={cn(
                            filterAmountType === "range" && "bg-[#006039] hover:bg-[#005030]"
                          )}
                        >
                          Диапазон
                        </Button>
                      </div>

                      {filterAmountType === "exact" && (
                        <div>
                          <Label>Точная сумма</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={filterAmount.exact}
                            onChange={(e) =>
                              setFilterAmount({ ...filterAmount, exact: e.target.value })
                            }
                            className="mt-1"
                          />
                        </div>
                      )}

                      {filterAmountType === "range" && (
                        <div className="space-y-3">
                          <div>
                            <Label>От</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={filterAmount.min}
                              onChange={(e) =>
                                setFilterAmount({ ...filterAmount, min: e.target.value })
                              }
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label>До</Label>
                            <Input
                              type="number"
                              placeholder="100000"
                              value={filterAmount.max}
                              onChange={(e) =>
                                setFilterAmount({ ...filterAmount, max: e.target.value })
                              }
                              className="mt-1"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-12"
                  onClick={() => {
                    setFilterStatus("all");
                    setFilterDevice("all");
                    setFilterBank("all");
                    setFilterAmountType("all");
                    setFilterAmount({ exact: "", min: "", max: "" });
                    setFilterDateFrom("");
                    setFilterDateTo("");
                  }}
                >
                  Сбросить фильтры
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-12 bg-green-100 hover:bg-green-200 transition-colors duration-150 text-green-500"
                  onClick={() => setFiltersOpen(false)}
                >
                  Применить фильтры
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Sort */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="default"
              className="gap-1 md:gap-2 h-10 md:h-12 px-3 md:px-6 text-sm md:text-base flex-1 sm:flex-initial"
            >
              <ArrowUpDown className="h-3.5 w-3.5 md:h-4 md:w-4 text-[#006039]" />
              <span className="hidden sm:inline">Сортировка</span>
              <span className="sm:hidden">Сорт.</span>
              <ChevronDown className="h-3.5 w-3.5 md:h-4 md:w-4 text-gray-400" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto" sideOffset={5}>
            <div className="space-y-2">
              <h4 className="font-medium text-base">Сортировать</h4>
              <div className="space-y-1">
                <Button
                  variant={sortBy === "newest" ? "secondary" : "ghost"}
                  size="default"
                  className="w-full justify-start h-12"
                  onClick={() => setSortBy("newest")}
                >
                  Сначала новые
                </Button>
                <Button
                  variant={sortBy === "oldest" ? "secondary" : "ghost"}
                  size="default"
                  className="w-full justify-start h-12"
                  onClick={() => setSortBy("oldest")}
                >
                  Сначала старые
                </Button>
                <Button
                  variant={sortBy === "amount_desc" ? "secondary" : "ghost"}
                  size="default"
                  className="w-full justify-start h-12"
                  onClick={() => setSortBy("amount_desc")}
                >
                  По убыванию суммы
                </Button>
                <Button
                  variant={sortBy === "amount_asc" ? "secondary" : "ghost"}
                  size="default"
                  className="w-full justify-start h-12"
                  onClick={() => setSortBy("amount_asc")}
                >
                  По возрастанию суммы
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        </div>
      </div>

      {/* Messages List with progress indicator */}
      <div className="relative">
        {/* Progress indicator */}
        {messages.length > 0 && (
          <div className="sticky top-0 z-10 bg-white border-b px-4 py-2 flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              Показано {messages.length} сообщений
            </span>
            {hasMore && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchMessages(true)}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Загрузка...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-2" />
                      Загрузить еще
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAllMessages}
                  disabled={loadingMore || loading}
                >
                  Загрузить все
                </Button>
              </div>
            )}
          </div>
        )}
        
        {/* Messages List in ScrollArea */}
        <div ref={scrollContainerRef} className="h-[calc(100vh-250px)] md:h-[calc(100vh-300px)] overflow-y-auto pr-2 md:pr-4">
          <div className="space-y-2 md:space-y-3">
            {filteredMessages.length === 0 ? (
              <Card className="p-8 md:p-12 text-center text-gray-500 text-sm md:text-base">
                Сообщения не найдены
              </Card>
            ) : (
              <>
                {filteredMessages.map((message) => (
                <Card
                  key={message.id}
                  className={cn(
                    "p-3 md:p-4 hover:shadow-md transition-all duration-300 cursor-pointer",
                    message.isNew && "flash-once",
                  )}
                  onClick={() => setSelectedMessage(message)}
                >
                  {/* Mobile Layout */}
                  <div className="md:hidden">
                    <div className="space-y-2">
                      {/* Top row: Package name, amount */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <MessageSquare className="h-5 w-5 text-gray-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {message.packageName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDateTime(message.timestamp)}
                            </div>
                          </div>
                        </div>
                        {/* Amount badge */}
                        <div className="flex-shrink-0">
                          {message.amount && message.amount > 0 ? (
                            <Badge
                              variant="outline"
                              className="px-2 py-1 text-xs font-bold border rounded-lg bg-green-50 text-green-600 border-green-200"
                            >
                              {message.amount.toLocaleString("ru-RU")} ₽
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="px-2 py-1 text-xs font-medium border rounded-lg bg-gray-100 text-gray-600 border-gray-200"
                            >
                              0 ₽
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Device info */}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Smartphone className="h-3 w-3" />
                        <span className="truncate">{message.deviceName}</span>
                        <span>•</span>
                        <span>{message.deviceId?.slice(0, 6)}...</span>
                      </div>

                      {/* Message text */}
                      <div className="text-xs text-gray-600 line-clamp-2">
                        {message.text}
                      </div>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden md:flex items-center gap-4">
                    {/* Message Icon */}
                    <div className="flex-shrink-0">{getMessageIcon()}</div>

                    {/* Package name and date */}
                    <div className="w-48 flex-shrink-0">
                      <div className="text-sm font-medium text-gray-900">
                        {message.packageName}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDateTime(message.timestamp)}
                      </div>
                    </div>

                    {/* Device info */}
                    <div className="w-64 flex-shrink-0">
                      <div className="flex items-center gap-3">
                        {getDeviceIcon()}
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {message.deviceName}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {message.deviceId?.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Message text */}
                    <div className="flex-1">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-gray-600 line-clamp-2">
                          {message.text}
                          {message.text.length > 100 && "..."}
                        </div>
                      </div>
                    </div>

                    {/* Amount badge */}
                    <div className="flex-shrink-0 w-32">
                      {message.amount && message.amount > 0 ? (
                        <Badge
                          variant="outline"
                          className="px-4 py-2 text-sm font-bold border rounded-xl bg-green-50 text-green-600 border-green-200 w-full text-center justify-center"
                        >
                          {message.amount.toLocaleString("ru-RU")} RUB
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="px-4 py-2 text-sm font-medium border rounded-xl bg-gray-100 text-gray-600 border-gray-200 w-full text-center justify-center"
                        >
                          0 RUB
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              
              {/* Loading indicator at bottom */}
              {loadingMore && (
                <div className="flex items-center justify-center py-4">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="text-sm text-gray-500">Загрузка сообщений...</span>
                  </div>
                </div>
              )}
              
              {/* All loaded indicator */}
              {!hasMore && messages.length > 0 && (
                <div className="text-center py-4 text-sm text-gray-500">
                  Все сообщения загружены ({messages.length} шт.)
                </div>
              )}
            </>
          )}
          </div>
        </div>
      </div>

      {/* Count */}
      <div className="text-sm text-gray-600">
        Найдено {filteredMessages.length} сообщений
      </div>

      {/* Message Details Dialog */}
      <Dialog
        open={!!selectedMessage}
        onOpenChange={() => setSelectedMessage(null)}
      >
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] sm:w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-0 border bg-background p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] overflow-hidden rounded-2xl sm:rounded-3xl">
            <DialogTitle className="sr-only">Детали сообщения</DialogTitle>
            <div className="bg-white">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {selectedMessage && formatDateTime(selectedMessage.timestamp)}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMessage(null)}
                  className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-4 w-4 text-[#006039]" />
                </Button>
              </div>

              {selectedMessage && (
                <>
                  {/* Message Icon and Info */}
                  <div className="px-6 py-6 text-center">
                    <div className="mb-4 flex justify-center">
                      <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center">
                        <MessageSquare className="h-10 w-10 text-gray-600" />
                      </div>
                    </div>

                    <h2 className="text-lg font-semibold mb-1">
                      Сообщение ${selectedMessage.numericId}
                    </h2>
                    <p className="text-sm text-gray-500 mb-4">
                      {selectedMessage.packageName}
                    </p>
                  </div>

                  {/* Message Content */}
                  <div className="px-6 pb-4 space-y-4">
                    {/* Full message text */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-medium text-gray-500">
                          Текст сообщения
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedMessage.text);
                            toast.success("Текст скопирован");
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          Копировать
                        </Button>
                      </div>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                        {selectedMessage.text}
                      </p>
                    </div>

                    {/* Device info */}
                    <Button
                      variant="outline"
                      className="w-full p-4 h-auto justify-between hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        if (selectedMessage.deviceId) {
                          router.push(`/trader/devices/${selectedMessage.deviceId}`);
                        } else {
                          toast.error("ID устройства не найден");
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                          <Smartphone className="h-5 w-5 text-[#006039]" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium">
                            {selectedMessage.deviceName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {selectedMessage.deviceModel} •{" "}
                            {selectedMessage.deviceId?.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                      <ChevronDown className="h-5 w-5 text-[#006039] -rotate-90" />
                    </Button>

                    {/* Amount */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          Обнаруженная сумма
                        </span>
                        {selectedMessage.amount && selectedMessage.amount > 0 ? (
                          <span className="text-lg font-semibold text-green-600">
                            {selectedMessage.amount.toLocaleString("ru-RU")} RUB
                          </span>
                        ) : (
                          <span className="text-lg font-semibold text-gray-600">
                            0 RUB
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="px-6 pb-6">
                    <Button
                      className="w-full bg-[#006039] hover:bg-[#006039]/90"
                      onClick={() => setSelectedMessage(null)}
                    >
                      Закрыть
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
