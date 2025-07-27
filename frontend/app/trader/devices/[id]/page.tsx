"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AuthLayout } from "@/components/layouts/auth-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { traderApi } from "@/services/api";
import {
  ArrowLeft,
  Copy,
  Smartphone,
  WifiOff,
  Wifi,
  Battery,
  Activity,
  Loader2,
  MessageSquare,
  Hash,
  Calendar,
  Power,
  Send,
  Shield,
  Globe,
  CreditCard,
  Play,
  QrCode,
  Signal,
  Pause,
  RefreshCw,
  Trash2,
  ChevronRight,
  CheckCircle,
  Clock,
  ChevronDown,
  Settings,
  Star,
  MessageCircle,
  Users,
  MoreVertical,
  Globe2,
  GlobeLock,
  Scale,
  Building2,
  Search,
  Filter,
  SlidersHorizontal,
  X,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn, formatAmount } from "@/lib/utils";
import QRCode from "qrcode";
import { Logo } from "@/components/ui/logo";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddRequisiteDialog } from "@/components/trader/add-requisite-dialog";
import { getDeviceStatusWebSocket, DeviceStatusUpdate } from "@/services/device-status-ws";
import { deviceWSManager } from "@/services/device-ws-manager";
import { DeviceEmulator } from "@/services/device-emulator";

interface DeviceData {
  id: string;
  name: string;
  token: string;
  isOnline: boolean;
  isWorking: boolean;
  energy?: number;
  ethernetSpeed?: number;
  lastSeen?: string;
  createdAt: string;
  firstConnectionAt?: string | null;
  browser?: string;
  os?: string;
  ip?: string;
  location?: string;
  isTrusted?: boolean;
  notifications: number;
  model?: string;
  fingerprint?: string;
  simNumber?: string;
  lastHealthCheck?: string;
  linkedBankDetails?: any[];
  batteryLevel?: number;
  networkInfo?: string;
  androidVersion?: string;
}

interface Transaction {
  id: string;
  numericId: number;
  amount: number;
  status: string;
  createdAt: string;
  deviceId?: string;
  requisites?: {
    id: string;
    cardNumber: string;
    bankType: string;
  };
  merchant?: {
    name: string;
  };
  method?: {
    name: string;
  };
  dealDispute?: {
    id: string;
    status: string;
  };
}

interface Dispute {
  id: string;
  status: string;
  createdAt: string;
  deal?: {
    numericId: number;
    amount: number;
  };
  payout?: {
    numericId: number;
    amount: number;
  };
  merchant?: {
    name: string;
  };
}

interface Message {
  id: string;
  type: "sms" | "push" | "call";
  sender: string;
  content: string;
  timestamp: string;
  status: "delivered" | "read" | "pending";
}

export default function DeviceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [device, setDevice] = useState<DeviceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("messages");
  const [messages, setMessages] = useState<Message[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingDisputes, setLoadingDisputes] = useState(false);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [showAddRequisiteDialog, setShowAddRequisiteDialog] = useState(false);
  const [serverError, setServerError] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [messageSearch, setMessageSearch] = useState("");
  const [messageFilter, setMessageFilter] = useState("all");
  const deviceEmulatorRef = useRef<DeviceEmulator | null>(null);

  useEffect(() => {
    fetchDevice();
    
    // WebSocket connection is now handled by WebSocketProvider
    
    // Auto-refresh device data on page focus
    const handleFocus = () => {
      console.log('[DeviceDetailsPage] Page focused, refreshing device data');
      fetchDevice();
    };
    
    window.addEventListener('focus', handleFocus);
    
    // Ping device every 5 seconds to check status
    const pingInterval = setInterval(async () => {
      if (device?.id) {
        try {
          const pingResult = await traderApi.pingDevice(device.id);
          if (pingResult.success) {
            // Update device status from ping response
            setDevice(prevDevice => {
              if (!prevDevice) return null;
              return {
                ...prevDevice,
                isOnline: pingResult.device.isOnline,
                isWorking: pingResult.device.isWorking,
                lastActiveAt: pingResult.device.lastActiveAt
              };
            });
          }
        } catch (error) {
          console.error('[DeviceDetailsPage] Ping error:', error);
        }
      }
    }, 5000);
    
    // Subscribe to this specific device
    if (params.id) {
      setTimeout(() => {
        deviceWSManager.subscribeToDevice(params.id as string);
      }, 1000);
    }
    
    // Listen for device status updates
    const unsubscribeStatusUpdate = deviceWSManager.on('device-status-update', (update: DeviceStatusUpdate) => {
      if (update.deviceId === params.id) {
        console.log('[DeviceDetailsPage] Device status update:', update);
        
        setDevice(prevDevice => {
          if (!prevDevice) return null;
          
          // If device is coming online and doesn't have firstConnectionAt, mark it as connected
          if (update.isOnline && prevDevice.firstConnectionAt == null) {
            console.log('[DeviceDetailsPage] Device came online without firstConnectionAt, marking as connected...');
            
            // Call API to mark device as connected
            traderApi.markDeviceConnected(update.deviceId).then(() => {
              console.log('[DeviceDetailsPage] Device marked as connected, refreshing data...');
              // Refresh device data to get updated firstConnectionAt
              fetchDevice().then(() => {
                console.log('[DeviceDetailsPage] Device data refreshed after marking as connected');
              });
            }).catch(error => {
              console.error('[DeviceDetailsPage] Error marking device as connected:', error);
            });
          }
          
          // If device went offline and was working, it will be auto-stopped by backend
          if (!update.isOnline && prevDevice.isWorking) {
            console.log('[DeviceDetailsPage] Device went offline while working, will be auto-stopped');
            // Refresh device data after a short delay to get the updated isWorking status
            setTimeout(() => {
              fetchDevice();
            }, 1000);
          }
          
          return {
            ...prevDevice,
            isOnline: update.isOnline,
            isWorking: !update.isOnline && prevDevice.isWorking ? false : prevDevice.isWorking,
            energy: update.batteryLevel ?? prevDevice.energy,
            batteryLevel: update.batteryLevel ?? prevDevice.batteryLevel,
            ethernetSpeed: update.networkSpeed ?? prevDevice.ethernetSpeed
          };
        });
      }
    });
    
    // Listen for device going offline
    const unsubscribeOffline = deviceWSManager.on('device-offline', (deviceId: string) => {
      if (deviceId === params.id) {
        console.log('[DeviceDetailsPage] Device went offline:', deviceId);
        toast.warning(`Устройство отключено от сети`);
      }
    });
    
    // Listen for bank details disabled
    const unsubscribeBankDisabled = deviceWSManager.on('bank-details-disabled', (data: { deviceId: string, count: number }) => {
      if (data.deviceId === params.id) {
        console.log('[DeviceDetailsPage] Bank details disabled:', data);
        if (data.count > 0) {
          toast.error(`Отключено ${data.count} реквизитов из-за потери связи с устройством`);
        }
      }
    });
    
    return () => {
      // Cleanup listeners
      unsubscribeStatusUpdate();
      unsubscribeOffline();
      unsubscribeBankDisabled();
      window.removeEventListener('focus', handleFocus);
      clearInterval(pingInterval);
      
      // Don't disconnect the global WebSocket, just unsubscribe from this device
      if (params.id) {
        deviceWSManager.unsubscribeFromDevice(params.id as string);
      }
      
      // Cleanup device emulator if running
      if (deviceEmulatorRef.current) {
        deviceEmulatorRef.current.disconnect();
        deviceEmulatorRef.current = null;
      }
    };
  }, [params.id, device?.id]);

  useEffect(() => {
    if (activeTab === "deals" && device) {
      fetchTransactions();
    } else if (activeTab === "disputes" && device) {
      fetchDisputes();
    }
  }, [activeTab, device]);

  // Polling для проверки статуса устройства когда открыт QR код
  useEffect(() => {
    if (showQrDialog && device) {
      // Запускаем polling каждые 2 секунды
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const deviceData = await traderApi.getDevice(params.id as string);
          
          console.log('[DeviceDetailsPage] Polling device status:', {
            deviceId: deviceData.id,
            isOnline: deviceData.isOnline,
            firstConnectionAt: deviceData.firstConnectionAt,
            previousFirstConnectionAt: device.firstConnectionAt
          });
          
          // If device came online but doesn't have firstConnectionAt, mark it as connected
          if (deviceData.isOnline && device.firstConnectionAt == null && deviceData.firstConnectionAt == null) {
            console.log('[DeviceDetailsPage] Device is online but no firstConnectionAt, marking as connected...');
            try {
              await traderApi.markDeviceConnected(device.id);
              console.log('[DeviceDetailsPage] Device marked as connected');
              // Next polling cycle will get the updated data
            } catch (error) {
              console.error('[DeviceDetailsPage] Error marking device as connected:', error);
            }
          }
          
          // Check if device just got its first connection
          if (device.firstConnectionAt == null && deviceData.firstConnectionAt != null) {
            console.log('[DeviceDetailsPage] Device got first connection!');
            toast.success("Устройство успешно подключено!");
            setShowQrDialog(false);
            
            // Останавливаем polling
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            
            // Обновляем сообщения
            const messagesResponse = await traderApi.getMessages({
              deviceId: deviceData.id,
              limit: 20,
            });
            setMessages(messagesResponse.data || []);
            
            // Auto-start emulator in development mode to maintain connection
            if (process.env.NODE_ENV === 'development' && !deviceEmulatorRef.current) {
              console.log('[DeviceDetailsPage] Auto-starting device emulator for development');
              setTimeout(() => {
                if (deviceData.token) {
                  const emulator = new DeviceEmulator({
                    deviceToken: deviceData.token,
                    pingInterval: 5000, // Send ping every 5 seconds
                    reconnectDelay: 3000,
                    maxReconnectAttempts: 10
                  });
                  
                  emulator.on('connected', () => {
                    console.log('[DeviceEmulator] Auto-connected to maintain device online status');
                  });
                  
                  emulator.connect();
                  deviceEmulatorRef.current = emulator;
                }
              }, 2000); // Wait 2 seconds before starting emulator
            }
          }
          
          // Always update device data to get latest state
          setDevice(deviceData);
        } catch (error) {
          console.error("Error polling device status:", error);
        }
      }, 2000);
    }

    // Cleanup при закрытии диалога или размонтировании
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [showQrDialog, device, params.id]);

  useEffect(() => {
    if (device?.id) {
      // Auto-refresh messages every 5 seconds
      const interval = setInterval(async () => {
        try {
          const messagesResponse = await traderApi.getMessages({
            deviceId: device.id,
            limit: 20,
          });
          const formattedMessages =
            messagesResponse.data?.map((msg: any) => ({
              id: msg.id,
              type:
                msg.type === "AppNotification"
                  ? "push"
                  : msg.type === "SMS"
                    ? "sms"
                    : "call",
              sender: msg.appName || msg.sender || "Неизвестно",
              content: msg.message || msg.content,
              timestamp: msg.createdAt || msg.timestamp,
              status: msg.isProcessed ? "read" : "delivered",
            })) || [];
          setMessages(formattedMessages);
        } catch (error) {
          console.error("Error refreshing messages:", error);
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [device?.id]);

  // Load transactions when deals tab is selected
  useEffect(() => {
    if (activeTab === 'deals' && device?.id) {
      fetchTransactions();
    }
  }, [activeTab, device?.id]);

  const fetchDevice = async () => {
    try {
      setLoading(true);
      setServerError(false);
      const deviceData = await traderApi.getDevice(params.id as string);
      console.log('[DeviceDetailsPage] Fetched device data:', {
        id: deviceData.id,
        name: deviceData.name,
        isOnline: deviceData.isOnline,
        isWorking: deviceData.isWorking,
        firstConnectionAt: deviceData.firstConnectionAt
      });
      setDevice(deviceData);

      // Generate QR code with just the token for mobile app compatibility
      const qrUrl = await QRCode.toDataURL(deviceData.token, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      setQrCodeUrl(qrUrl);

      // Fetch real messages
      try {
        const messagesResponse = await traderApi.getMessages({
          deviceId: deviceData.id,
          limit: 20,
        });
        const formattedMessages =
          messagesResponse.data?.map((msg: any) => ({
            id: msg.id,
            type:
              msg.type === "AppNotification"
                ? "push"
                : msg.type === "SMS"
                  ? "sms"
                  : "call",
            sender: msg.appName || msg.sender || "Неизвестно",
            content: msg.message || msg.content,
            timestamp: msg.createdAt || msg.timestamp,
            status: msg.isProcessed ? "read" : "delivered",
          })) || [];
        setMessages(formattedMessages);
      } catch (msgError) {
        console.error("Error fetching messages:", msgError);
      }
    } catch (error: any) {
      // Only log unexpected errors (server errors), not client errors like 404
      if (!error.response || error.response.status >= 500) {
        console.error("Error fetching device:", error);
      }
      
      // Provide more specific error messages
      if (error.response?.status === 404) {
        toast.error("Устройство не найдено");
        router.push("/trader/devices");
        return;
      } else if (error.response?.status === 401) {
        toast.error("Ошибка авторизации. Войдите в систему снова");
      } else if (error.response?.status === 403) {
        toast.error("У вас нет доступа к этому устройству");
      } else if (error.response?.status === 500) {
        console.error("Server error details:", error.response?.data);
        
        // Handle specific 500 error cases
        if (error.response?.data === "Device not found" || 
            error.response?.data?.error === "Device not found" ||
            error.response?.data?.message === "Device not found") {
          toast.error("Устройство не найдено");
          router.push("/trader/devices");
          return;
        }
        
        toast.error("Ошибка сервера. Проверьте логи бэкенда для подробностей");
        // Don't redirect on other 500 errors, show error state instead
        setDevice(null);
        setServerError(true);
        return;
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else if (error.message) {
        toast.error(`Ошибка: ${error.message}`);
      } else {
        toast.error("Не удалось загрузить данные устройства");
      }
      
      // Only redirect for client errors (4xx)
      if (error.response?.status && error.response.status < 500) {
        router.push("/trader/devices");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!device) return;

    try {
      setLoadingTransactions(true);
      
      // Загружаем все транзакции трейдера
      const response = await traderApi.getTransactions({ limit: 1000 });
      const allTransactions = response.data || response.transactions || [];
      
      // Get all requisites (bank details) linked to this device
      const deviceRequisiteIds = device.linkedBankDetails?.map(bd => bd.id) || device.bankDetails?.map(bd => bd.id) || [];
      
      console.log('Device ID:', device.id);
      console.log('Device linkedBankDetails:', device.linkedBankDetails);
      console.log('Device bankDetails:', device.bankDetails);
      console.log('Device requisite IDs:', deviceRequisiteIds);
      console.log('All transactions:', allTransactions.length);
      if (allTransactions.length > 0) {
        console.log('Sample transaction:', allTransactions[0]);
      }
      
      // Filter transactions that used requisites from this device or have matching deviceId
      const deviceTransactions = allTransactions.filter((tx: any) => {
        // Check if transaction has requisites and if those requisites belong to this device
        if (!tx.requisites) return false;
        
        // Check by requisite ID
        const matchByRequisiteId = deviceRequisiteIds.includes(tx.requisites.id);
        
        // Also check by deviceId if available
        const matchByDeviceId = tx.deviceId === device.id;
        
        // Check by bankDetailId (legacy field)
        const matchByBankDetailId = tx.bankDetailId && deviceRequisiteIds.includes(tx.bankDetailId);
        
        const match = matchByRequisiteId || matchByDeviceId || matchByBankDetailId;
        
        if (match) {
          console.log(`Transaction ${tx.id} matches: requisiteId=${tx.requisites?.id}, deviceId=${tx.deviceId}, bankDetailId=${tx.bankDetailId}`);
        }
        
        return match;
      });
      
      console.log('Filtered transactions:', deviceTransactions.length);
      
      // Сортируем по дате создания (новые сначала)
      deviceTransactions.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setTransactions(deviceTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Не удалось загрузить сделки");
    } finally {
      setLoadingTransactions(false);
    }
  };

  const startDeviceEmulator = () => {
    if (!device?.token) {
      toast.error("Токен устройства не найден");
      return;
    }
    
    // Stop existing emulator if any
    if (deviceEmulatorRef.current) {
      deviceEmulatorRef.current.disconnect();
    }
    
    // Create new emulator
    const emulator = new DeviceEmulator({
      deviceToken: device.token,
      pingInterval: 2000, // Send ping every 2 seconds
      reconnectDelay: 3000,
      maxReconnectAttempts: 10
    });
    
    // Listen to emulator events
    emulator.on('connected', () => {
      console.log('[DeviceEmulator] Connected to server');
      toast.success("Эмулятор устройства подключен");
    });
    
    emulator.on('disconnected', () => {
      console.log('[DeviceEmulator] Disconnected from server');
      toast.warning("Эмулятор устройства отключен");
    });
    
    emulator.on('ping', (data: any) => {
      console.log('[DeviceEmulator] Sent ping:', data);
    });
    
    emulator.on('pong', (data: any) => {
      console.log('[DeviceEmulator] Received pong:', data);
    });
    
    emulator.on('error', (error: any) => {
      console.error('[DeviceEmulator] Error:', error);
      toast.error("Ошибка эмулятора устройства");
    });
    
    // Start emulator
    emulator.connect();
    deviceEmulatorRef.current = emulator;
    
    toast.info("Запущен эмулятор устройства для поддержания связи");
  };

  const fetchDisputes = async () => {
    if (!device?.linkedBankDetails || device.linkedBankDetails.length === 0) {
      setDisputes([]);
      return;
    }

    try {
      setLoadingDisputes(true);
      
      // Загружаем споры по сделкам
      const dealDisputesRes = await traderApi.getDealDisputes({ status: 'all' });
      const payoutDisputesRes = await traderApi.getPayoutDisputes({ status: 'all' });
      
      const dealDisputes = (dealDisputesRes.data || []).filter((dispute: any) => {
        // Фильтруем споры, связанные с транзакциями этого устройства
        return transactions.some(t => t.id === dispute.dealId);
      });
      
      const payoutDisputes = (payoutDisputesRes.data || []).filter((dispute: any) => {
        // Фильтруем споры по выплатам, связанные с реквизитами устройства
        return device.linkedBankDetails?.some(bd => 
          dispute.payout?.bankDetailId === bd.id
        );
      });
      
      const allDisputes = [...dealDisputes, ...payoutDisputes];
      
      // Сортируем по дате создания (новые сначала)
      allDisputes.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setDisputes(allDisputes);
    } catch (error) {
      console.error("Error fetching disputes:", error);
      toast.error("Не удалось загрузить споры");
    } finally {
      setLoadingDisputes(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute variant="trader">
        <AuthLayout variant="trader">
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-[#530FAD]" />
          </div>
        </AuthLayout>
      </ProtectedRoute>
    );
  }

  if (serverError || !device) {
    return (
      <ProtectedRoute variant="trader">
        <AuthLayout variant="trader">
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <div className="text-center space-y-4">
              <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/20 mx-auto w-fit">
                <WifiOff className="h-12 w-12 text-red-600 dark:text-[#c64444]" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-[#eeeeee]">
                Ошибка загрузки устройства
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                {serverError 
                  ? "Произошла ошибка на сервере. Проверьте подключение к базе данных и логи бэкенда."
                  : "Не удалось загрузить данные устройства. Попробуйте обновить страницу."}
              </p>
              <div className="flex gap-3 justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => router.push("/trader/devices")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  К списку устройств
                </Button>
                <Button
                  className="bg-[#530FAD] hover:bg-[#530FAD/90] dark:bg-[#530FAD] dark:hover:bg-[#530FAD/80]"
                  onClick={() => {
                    setServerError(false);
                    fetchDevice();
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Попробовать снова
                </Button>
              </div>
              {serverError && (
                <div className="mt-6 p-4 bg-gray-100 dark:bg-[#292133]/30 rounded-lg max-w-2xl text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-[#eeeeee] mb-2">
                    Возможные причины ошибки:
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                    <li>База данных недоступна или не запущена</li>
                    <li>Ошибка в схеме базы данных (проверьте миграции Prisma)</li>
                    <li>Проблема с моделью Device в Prisma schema</li>
                    <li>Ошибка в эндпоинте /api/trader/devices/:id</li>
                  </ul>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
                    Проверьте консоль браузера и логи сервера для подробной информации
                  </p>
                </div>
              )}
            </div>
          </div>
        </AuthLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute variant="trader">
      <AuthLayout variant="trader">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-10 sm:w-10"
                onClick={() => router.push("/trader/devices")}
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <h1 className="text-xl sm:text-2xl font-semibold">Устройство</h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 ml-10 sm:ml-0">
              <Button variant="outline" size="sm" className="h-8 px-2 sm:px-3" onClick={() => fetchDevice()}>
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Обновить</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 sm:px-3"
                onClick={() => setShowQrDialog(true)}
              >
                <QrCode className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">QR код</span>
              </Button>
              {/* Emulator button for development/testing */}
              {process.env.NODE_ENV === 'development' && device?.token && !device.isOnline && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 sm:px-3 border-purple-500 text-purple-600 hover:bg-purple-50"
                  onClick={startDeviceEmulator}
                >
                  <Smartphone className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Эмулятор</span>
                </Button>
              )}
              {/* Only show start/stop buttons if device has been connected at least once */}
              {console.log('[DeviceDetailsPage] Render button check:', {
                deviceId: device.id,
                firstConnectionAt: device.firstConnectionAt,
                shouldShowButtons: !!device.firstConnectionAt
              })}
              {device.firstConnectionAt != null && (
                <>
                  {device.isWorking ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 px-3"
                      onClick={async () => {
                        try {
                          await traderApi.stopDevice(device.id);
                          toast.success("Устройство остановлено");
                          await fetchDevice();
                        } catch (error) {
                          console.error("Error stopping device:", error);
                          toast.error("Не удалось остановить устройство");
                        }
                      }}
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Остановить
                    </Button>
                  ) : (
                    <Button
                      className="bg-[#530FAD] hover:bg-[#530FAD]/90"
                      size="sm"
                      className="h-8 px-3"
                      onClick={async () => {
                        try {
                          // First ping to get fresh status
                          const pingResult = await traderApi.pingDevice(device.id);
                          
                          // Check if device is online before starting
                          if (!pingResult.device.isOnline) {
                            toast.error("Нет связи с устройством. Убедитесь, что приложение запущено и подключено к интернету");
                            return;
                          }
                          
                          await traderApi.startDevice(device.id);
                          toast.success("Устройство запущено");
                          await fetchDevice();
                        } catch (error: any) {
                          console.error("Error starting device:", error);
                          // Check if error is about no connection
                          if (error.response?.data?.error) {
                            toast.error(error.response.data.error);
                          } else {
                            toast.error("Не удалось запустить устройство");
                          }
                        }
                      }}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Запустить
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Phone Mockup */}
            <div className="lg:col-span-1 order-2 lg:order-1">
              <Card className="p-1 border-none dark:bg-[#292133]/30 hidden sm:block">
                <div className="relative mx-auto w-[240px] sm:w-[280px] h-[480px] sm:h-[560px]">
                  {/* Phone Frame */}
                  <div className="absolute inset-0 bg-gray-900 dark:bg-black rounded-[40px] border-[6px] border-gray-800 dark:border-gray-900">
                    {/* Side Buttons */}
                    {/* Volume Buttons */}
                    <div className="absolute -right-[9px] top-[120px] w-[6px] h-[40px] bg-gray-700 dark:bg-gray-800 rounded-l-sm" />
                    <div className="absolute -right-[9px] top-[180px] w-[6px] h-[40px] bg-gray-700 dark:bg-gray-800 rounded-l-sm" />
                    {/* Power Button */}
                    <div className="absolute -right-[9px] top-[230px] w-[6px] h-[60px] bg-gray-700 dark:bg-gray-800 rounded-r-sm" />

                    {/* Screen */}
                    <div className="absolute inset-[3px] bg-white dark:bg-[#1a1a1a] rounded-[37px] overflow-hidden">
                      {/* Status Bar */}
                      <div className="bg-white dark:bg-[#0f0f0f] px-4 py-2 flex justify-between items-center text-xs">
                        <span className="font-medium dark:text-[#eeeeee]">
                          {new Date().toLocaleTimeString("ru-RU", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <div className="flex items-center gap-1">
                          <Signal className="w-3 h-3 dark:text-[#eeeeee]" />
                          {device.isOnline ? (
                            <Wifi className="w-3 h-3 dark:text-[#eeeeee]" />
                          ) : (
                            <WifiOff className="w-3 h-3 text-gray-400 dark:text-gray-600" />
                          )}
                          <Battery className="w-4 h-3 dark:text-[#eeeeee]" />
                          <span className="text-[10px] font-medium dark:text-[#eeeeee]">
                            {Math.round(device.energy || device.batteryLevel || 0)}%
                          </span>
                        </div>
                      </div>

                      {/* App Content */}
                      <div className="p-4 h-full bg-gray-50 dark:bg-[#0f0f0f] flex flex-col">
                        <div className="flex justify-center h-full flex-col items-center">
                          <Logo size="lg" />
                          {device.isOnline ? (
                            <>
                              <div className="mt-10 p-4 rounded-full bg-purple-100 dark:bg-purple-900/30">
                                <Globe className="w-10 h-10 text-purple-500 dark:text-[#530FAD]" />
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="mt-10 p-4 rounded-full bg-red-100 dark:bg-red-900/30">
                                <GlobeLock className="w-10 h-10 text-red-500 dark:text-[#c64444]" />
                              </div>
                              {device.isWorking && (
                                <p className="font-semibold text-[16px] mt-2 dark:text-[#eeeeee]">
                                  Ошибка подключения
                                </p>
                              )}
                            </>
                          )}
                        </div>
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center mt-24">
                            <h3 className="font-semibold dark:text-[#eeeeee]">{device.name}</h3>
                            <div className="text-sm font-bold  mt-2">
                              {console.log('[DeviceDetailsPage] Phone mockup status check:', {
                                firstConnectionAt: device.firstConnectionAt,
                                showAwaitingConnection: !device.firstConnectionAt
                              })}
                              {device.firstConnectionAt == null ? (
                                <>
                                  <p className="text-yellow-600 dark:text-yellow-400 bg-yellow-200 dark:bg-yellow-900/30 rounded-md px-4 py-2 uppercase">
                                    Ожидает первого подключения
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className={cn(
                                    "rounded-md px-4 py-2 uppercase",
                                    device.isOnline 
                                      ? "text-purple-500 dark:text-purple-300 bg-purple-200 dark:bg-purple-900/30"
                                      : "text-red-500 dark:text-red-300 bg-red-200 dark:bg-red-900/30"
                                  )}>
                                    {device.isOnline 
                                      ? "Подключено" 
                                      : device.lastActiveAt && new Date(device.lastActiveAt).getTime() > Date.now() - 30000
                                        ? "Переподключение..."
                                        : "Нет связи"}
                                  </p>
                                </>
                              )}
                            </div>
                            {device.isOnline && (
                              <div className="mt-4 space-y-2 text-xs text-gray-600 dark:text-gray-400">
                                <p>
                                  Батарея:{" "}
                                  {Math.round(device.energy || device.batteryLevel || 0)}%
                                </p>
                                <p>Сеть: {device.ethernetSpeed || 0} Mbps</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Device Info */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6 order-1 lg:order-2">
              {/* Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Device Info Card */}
                <Card className="p-4 sm:p-6 dark:bg-[#292133]/30">
                  <div className="flex items-center justify-between mb-4">
                    <Smartphone className="h-5 w-5 text-[#530FAD] dark:text-[#530FAD]" />
                    <Badge
                      className={
                        device.isOnline
                          ? "bg-purple-100 text-purple-700 border-0 dark:bg-purple-900/30 dark:text-purple-400"
                          : "bg-gray-100 text-gray-700 border-0 dark:bg-gray-800 dark:text-gray-400"
                      }
                    >
                      {device.isOnline ? "Онлайн" : "Офлайн"}
                    </Badge>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold mb-2 dark:text-[#eeeeee]">{device.name}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Серийный номер: {device.id}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    № SIM-карты: {device.simNumber || "Не указан"}
                  </p>
                </Card>

                {/* Status Card */}
                <Card className="p-4 sm:p-6 dark:bg-[#292133]/30">
                  <div className="flex items-center justify-between mb-4">
                    <Activity className="h-5 w-5 text-[#530FAD] dark:text-[#530FAD]" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Статус</span>
                  </div>
                  {console.log('[DeviceDetailsPage] Status card check:', {
                    firstConnectionAt: device.firstConnectionAt,
                    showAwaitingConnection: !device.firstConnectionAt
                  })}
                  {device.firstConnectionAt == null ? (
                    <>
                      <h3 className="text-base sm:text-lg font-bold mb-2 dark:text-[#eeeeee]">
                        Ожидает подключения
                      </h3>
                      <Badge 
                        className="w-full justify-center py-2 bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800"
                      >
                        Отсканируйте QR код
                      </Badge>
                    </>
                  ) : (
                    <>
                      <h3 className="text-base sm:text-lg font-bold mb-2 dark:text-[#eeeeee]">
                        {device.isWorking ? "В работе" : "Не в работе"}
                      </h3>
                      <Badge 
                        className={cn(
                          "w-full justify-center py-2",
                          device.isWorking 
                            ? "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-800/30 dark:text-purple-300 dark:border-purple-600" 
                            : "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/50 dark:text-gray-400 dark:border-gray-700"
                        )}
                      >
                        {device.isWorking ? "Активно" : "Остановлено"}
                      </Badge>
                    </>
                  )}
                </Card>

                {/* WiFi Status Card */}
                <Card className="p-4 sm:p-6 dark:bg-[#292133]/30">
                  <div className="flex items-center justify-between mb-4">
                    {device.isOnline ? (
                      <Wifi className="h-5 w-5 text-[#530FAD] dark:text-[#530FAD]" />
                    ) : (
                      <WifiOff className="h-5 w-5 text-gray-500 dark:text-gray-500" />
                    )}
                    <span className="text-sm text-gray-500 dark:text-gray-400">Wi-Fi</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold mb-2 dark:text-[#eeeeee]">
                    {device.isOnline ? "Подключено" : "Отключено"}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {device.isOnline && device.ethernetSpeed 
                      ? `Скорость: ${device.ethernetSpeed} Mbps` 
                      : device.isOnline 
                        ? "Стабильное соединение"
                        : "Нет соединения"}
                  </p>
                </Card>

                {/* SIM Card Info Card */}
                <Card className="p-4 sm:p-6 dark:bg-[#292133]/30">
                  <div className="flex items-center justify-between mb-4">
                    <Globe className="h-5 w-5 text-[#530FAD] dark:text-[#530FAD]" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Сеть</span>
                  </div>
                  <h3 className="font-semibold mb-1 dark:text-[#eeeeee]">
                    SIM-карта
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Номер: {device.simNumber || "+7 (XXX) XXX-XX-XX"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Оператор: {device.networkInfo || "МТС"}
                  </p>
                </Card>
              </div>

              {/* Requisites Section */}
              <Card className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <h3 className="font-semibold">Привязанные реквизиты</h3>
                  <Button
                    size="sm"
                    className="h-8 px-3 bg-[#530FAD] hover:bg-[#530FAD]/90 w-full sm:w-auto"
                    onClick={() => setShowAddRequisiteDialog(true)}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Добавить
                  </Button>
                </div>

                {device.linkedBankDetails &&
                device.linkedBankDetails.length > 0 ? (
                  <ScrollArea className="h-[150px]">
                    <div className="space-y-3">
                      {device.linkedBankDetails.map((req: any) => (
                        <div
                          key={req.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#292133]/30 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <CreditCard className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            <div>
                              <p className="font-medium dark:text-[#eeeeee]">
                                **** {req.cardNumber?.slice(-4) || "0000"}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {req.bankType} • {req.recipientName}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {req.isActive ? "Активен" : "Неактивен"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p className="text-sm">Нет привязанных реквизитов</p>
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Tabs Section */}
          <Card>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b overflow-x-auto">
                <TabsList className="h-12 p-0 bg-transparent rounded-none w-full sm:w-auto min-w-max justify-start">
                  <TabsTrigger
                    value="messages"
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#530FAD] rounded-none px-3 sm:px-6 text-xs sm:text-sm whitespace-nowrap"
                  >
                    <MessageSquare className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Сообщения</span>
                    <span className="sm:hidden">Сообщ.</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="deals"
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#530FAD] rounded-none px-3 sm:px-6 text-xs sm:text-sm whitespace-nowrap"
                  >
                    <CreditCard className="h-4 w-4 mr-1 sm:mr-2" />
                    Сделки
                  </TabsTrigger>
                  <TabsTrigger
                    value="disputes"
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#530FAD] rounded-none px-3 sm:px-6 text-xs sm:text-sm whitespace-nowrap"
                  >
                    <Scale className="h-4 w-4 mr-1 sm:mr-2" />
                    Споры
                  </TabsTrigger>
                  <TabsTrigger
                    value="events"
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#530FAD] rounded-none px-3 sm:px-6 text-xs sm:text-sm whitespace-nowrap"
                  >
                    <Clock className="h-4 w-4 mr-1 sm:mr-2" />
                    События
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="messages" className="p-0">
                {/* Messages Search and Filters */}
                <div className="p-4 sm:p-6 pb-3 sm:pb-4 border-b">
                  <div className="flex flex-col sm:flex-row gap-2 mb-3 sm:mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Поиск сообщений..."
                        value={messageSearch}
                        onChange={(e) => setMessageSearch(e.target.value)}
                        className="pl-10 h-10"
                      />
                    </div>
                    <select
                      value={messageFilter}
                      onChange={(e) => setMessageFilter(e.target.value)}
                      className="px-3 sm:px-4 py-2 border rounded-md bg-white dark:bg-gray-800 h-10 text-sm"
                    >
                      <option value="all">Все сообщения</option>
                      <option value="sms">SMS</option>
                      <option value="push">Push уведомления</option>
                      <option value="call">Звонки</option>
                    </select>
                  </div>
                </div>
                
                <div className="p-4 sm:p-6 pt-3 sm:pt-4 space-y-3">
                  {messages
                    .filter(message => {
                      const matchesSearch = message.content.toLowerCase().includes(messageSearch.toLowerCase()) ||
                                          message.sender.toLowerCase().includes(messageSearch.toLowerCase());
                      const matchesFilter = messageFilter === "all" || message.type === messageFilter;
                      return matchesSearch && matchesFilter;
                    })
                    .length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                      <p>Нет сообщений</p>
                    </div>
                  ) : (
                    messages
                      .filter(message => {
                        const matchesSearch = message.content.toLowerCase().includes(messageSearch.toLowerCase()) ||
                                            message.sender.toLowerCase().includes(messageSearch.toLowerCase());
                        const matchesFilter = messageFilter === "all" || message.type === messageFilter;
                        return matchesSearch && matchesFilter;
                      })
                      .map((message) => {
                    // Determine message styling based on content
                    const isBank = message.sender?.toLowerCase().includes('bank') || 
                                  message.sender?.toLowerCase().includes('сбер') ||
                                  message.sender?.toLowerCase().includes('тинькофф') ||
                                  message.sender?.toLowerCase().includes('альфа');
                    const isAmount = message.content.match(/\d+[\s,.]?\d*\s*(руб|RUB|₽)/i);
                    const iconColor = isBank ? "primary" : message.type === "push" ? "accent" : "warning";
                    
                    return (
                      <div
                        key={message.id}
                        className="block hover:bg-gray-50 dark:hover:bg-[#292133]/30 transition-colors rounded-lg"
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-4">
                            {/* Icon */}
                            <div className={cn(
                              "p-2.5 rounded-lg flex items-center justify-center flex-shrink-0",
                              iconColor === "primary" && "bg-blue-100 dark:bg-blue-900/30",
                              iconColor === "accent" && "bg-purple-100 dark:bg-purple-900/30",
                              iconColor === "warning" && "bg-yellow-100 dark:bg-yellow-900/30"
                            )}>
                              {message.type === "sms" && (
                                <MessageSquare className={cn(
                                  "h-5 w-5",
                                  iconColor === "primary" && "text-blue-600 dark:text-blue-400",
                                  iconColor === "accent" && "text-purple-600 dark:text-purple-400",
                                  iconColor === "warning" && "text-yellow-600 dark:text-yellow-400"
                                )} />
                              )}
                              {message.type === "push" && (
                                <MessageCircle className={cn(
                                  "h-5 w-5",
                                  iconColor === "primary" && "text-blue-600 dark:text-blue-400",
                                  iconColor === "accent" && "text-purple-600 dark:text-purple-400",
                                  iconColor === "warning" && "text-yellow-600 dark:text-yellow-400"
                                )} />
                              )}
                              {message.type === "call" && (
                                <Users className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                              )}
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={cn(
                                  "font-medium text-sm",
                                  iconColor === "primary" && "text-gray-900 dark:text-[#eeeeee]",
                                  iconColor === "accent" && "text-purple-600 dark:text-purple-400",
                                  iconColor === "warning" && "text-yellow-600 dark:text-yellow-400"
                                )}>
                                  {message.sender}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {format(new Date(message.timestamp), "HH:mm")}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                                {message.content}
                              </p>
                              
                              {/* Amount or device info */}
                              {isAmount && (
                                <div className="flex items-center gap-3 mt-3">
                                  <div className="p-1.5 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                    <DollarSign className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-[#eeeeee]">
                                      {isAmount[0]}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      Сумма операции
                                    </p>
                                  </div>
                                </div>
                              )}
                              
                              {!isAmount && (
                                <div className="flex items-center gap-3 mt-3">
                                  <div className="p-1.5 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                    <Smartphone className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-[#eeeeee]">
                                      {device.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {message.type === "sms" ? "SMS сообщение" : "Push уведомление"}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Status or amount on the right */}
                            {isAmount && (
                              <span className={cn(
                                "text-sm font-semibold ml-auto flex-shrink-0",
                                iconColor === "primary" && "text-gray-900 dark:text-[#eeeeee]"
                              )}>
                                {isAmount[0]}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                </div>
              </TabsContent>

              <TabsContent value="deals" className="p-6">
                {loadingTransactions ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[#530FAD]" />
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                    <p>Нет сделок</p>
                    <p className="text-sm mt-2">Сделки, связанные с реквизитами этого устройства, будут отображаться здесь</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((transaction) => (
                      <Card
                        key={transaction.id}
                        className="p-4 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => window.location.href = `/trader/deals`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "p-2 rounded-lg",
                              transaction.status === "READY" ? "bg-purple-100 dark:bg-purple-900/30" :
                              transaction.status === "IN_PROGRESS" ? "bg-yellow-100 dark:bg-yellow-900/30" :
                              transaction.status === "DISPUTE" ? "bg-orange-100 dark:bg-orange-900/30" :
                              transaction.status === "EXPIRED" ? "bg-gray-100 dark:bg-gray-700" :
                              "bg-red-100 dark:bg-red-900/30"
                            )}>
                              <CreditCard className={cn(
                                "h-5 w-5",
                                transaction.status === "READY" ? "text-purple-600 dark:text-purple-400" :
                                transaction.status === "IN_PROGRESS" ? "text-yellow-600 dark:text-yellow-400" :
                                transaction.status === "DISPUTE" ? "text-orange-600 dark:text-orange-400" :
                                transaction.status === "EXPIRED" ? "text-gray-600 dark:text-gray-400" :
                                "text-red-600 dark:text-red-400"
                              )} />
                            </div>
                            <div>
                              <h3 className="font-semibold">
                                Сделка #{transaction.numericId}
                              </h3>
                              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                <span>{transaction.merchant?.name || "Неизвестный мерчант"}</span>
                                <span>{new Date(transaction.createdAt).toLocaleString('ru-RU')}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatAmount(transaction.amount)} ₽</p>
                            <Badge className={cn(
                              "mt-1",
                              transaction.status === "READY" ? "bg-purple-100 text-purple-800" :
                              transaction.status === "IN_PROGRESS" ? "bg-yellow-100 text-yellow-800" :
                              transaction.status === "DISPUTE" ? "bg-orange-100 text-orange-800" :
                              transaction.status === "EXPIRED" ? "bg-gray-100 text-gray-800" :
                              "bg-red-100 text-red-800"
                            )}>
                              {transaction.status === "READY" ? "Завершена" :
                               transaction.status === "IN_PROGRESS" ? "В работе" :
                               transaction.status === "DISPUTE" ? "Спор" :
                               transaction.status === "EXPIRED" ? "Истекла" :
                               transaction.status === "CANCELED" ? "Отменена" :
                               transaction.status}
                            </Badge>
                            {transaction.dealDispute && (
                              <Badge className="ml-2 bg-orange-100 text-orange-800">
                                Спор
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="disputes" className="p-6">
                {loadingDisputes ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[#530FAD]" />
                  </div>
                ) : disputes.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <Scale className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                    <p>Нет споров</p>
                    <p className="text-sm mt-2">Споры, связанные со сделками этого устройства, будут отображаться здесь</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {disputes.map((dispute) => (
                      <Card
                        key={dispute.id}
                        className="p-4 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => window.location.href = `/trader/disputes`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "p-2 rounded-lg",
                              dispute.status === "OPEN" ? "bg-yellow-100 dark:bg-yellow-900/30" :
                              dispute.status === "IN_PROGRESS" ? "bg-blue-100 dark:bg-blue-900/30" :
                              dispute.status === "RESOLVED_SUCCESS" ? "bg-purple-100 dark:bg-purple-900/30" :
                              dispute.status === "RESOLVED_FAIL" ? "bg-red-100 dark:bg-red-900/30" :
                              "bg-gray-100 dark:bg-gray-700"
                            )}>
                              <Scale className={cn(
                                "h-5 w-5",
                                dispute.status === "OPEN" ? "text-yellow-600 dark:text-yellow-400" :
                                dispute.status === "IN_PROGRESS" ? "text-blue-600 dark:text-blue-400" :
                                dispute.status === "RESOLVED_SUCCESS" ? "text-purple-600 dark:text-purple-400" :
                                dispute.status === "RESOLVED_FAIL" ? "text-red-600 dark:text-red-400" :
                                "text-gray-600 dark:text-gray-400"
                              )} />
                            </div>
                            <div>
                              <h3 className="font-semibold">
                                {dispute.deal ? 
                                  `Спор по сделке #${dispute.deal.numericId}` : 
                                  `Спор по выплате #${dispute.payout?.numericId || "?"}`
                                }
                              </h3>
                              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                <span>{dispute.merchant?.name || "Неизвестный мерчант"}</span>
                                <span>{new Date(dispute.createdAt).toLocaleString('ru-RU')}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {dispute.deal ? 
                                formatAmount(dispute.deal.amount) : 
                                formatAmount(dispute.payout?.amount || 0)
                              } ₽
                            </p>
                            <Badge className={cn(
                              "mt-1",
                              dispute.status === "OPEN" ? "bg-yellow-100 text-yellow-800" :
                              dispute.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-800" :
                              dispute.status === "RESOLVED_SUCCESS" ? "bg-purple-100 text-purple-800" :
                              dispute.status === "RESOLVED_FAIL" ? "bg-red-100 text-red-800" :
                              "bg-gray-100 text-gray-800"
                            )}>
                              {dispute.status === "OPEN" ? "Открыт" :
                               dispute.status === "IN_PROGRESS" ? "На рассмотрении" :
                               dispute.status === "RESOLVED_SUCCESS" ? "В вашу пользу" :
                               dispute.status === "RESOLVED_FAIL" ? "Не в вашу пользу" :
                               dispute.status === "CANCELLED" ? "Отменен" :
                               dispute.status}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="events" className="p-6 space-y-4">
                <div className="space-y-4">
                  {/* Device Status Events */}
                  {device.isOnline && (
                    <div className="border rounded-lg p-4 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                          <CheckCircle className="h-5 w-5 text-purple-600 dark:text-[#530FAD]" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-purple-900 dark:text-purple-100">
                            Устройство в сети
                          </p>
                          <p className="text-sm text-purple-700 dark:text-purple-300">
                            Активно и готово к работе
                          </p>
                        </div>
                        <span className="text-xs text-purple-600 dark:text-purple-400">
                          {format(new Date(), "HH:mm")}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {!device.isOnline && device.lastSeen && (
                    <div className="border rounded-lg p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                          <WifiOff className="h-5 w-5 text-red-600 dark:text-[#c64444]" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-red-900 dark:text-red-100">
                            Устройство не в сети
                          </p>
                          <p className="text-sm text-red-700 dark:text-red-300">
                            Последний раз в сети: {format(new Date(device.lastSeen), "d MMMM yyyy 'в' HH:mm", { locale: ru })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Battery Status */}
                  {(device.energy || device.batteryLevel) && (device.energy || device.batteryLevel) < 20 && (
                    <div className="border rounded-lg p-4 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                          <Battery className="h-5 w-5 text-orange-600 dark:text-orange-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-orange-900 dark:text-orange-100">
                            Низкий заряд батареи
                          </p>
                          <p className="text-sm text-orange-700 dark:text-orange-300">
                            Текущий уровень: {Math.round(device.energy || device.batteryLevel || 0)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Last Health Check */}
                  {device.lastHealthCheck && (
                    <div className="border dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-[#292133]/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                          <Shield className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium dark:text-[#eeeeee]">
                            Проверка безопасности
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Последняя проверка выполнена
                          </p>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          {format(new Date(device.lastHealthCheck), "d MMMM yyyy 'в' HH:mm", { locale: ru })}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Device Creation */}
                  <div className="border dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-[#292133]/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                        <Smartphone className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium dark:text-[#eeeeee]">
                          Устройство добавлено
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Начало работы с системой
                        </p>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        {format(new Date(device.createdAt), "d MMMM yyyy 'в' HH:mm", { locale: ru })}
                      </span>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* QR Code Dialog */}
        <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
          <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>QR-код для подключения</DialogTitle>
              <DialogDescription>
                Отсканируйте этот код в приложении для подключения устройства
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center space-y-4 py-4">
              {qrCodeUrl && (
                <div className="relative">
                  <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 sm:w-64 sm:h-64" />
                </div>
              )}

              <div className="w-full space-y-2">
                <div className="text-sm text-gray-500">Код устройства</div>
                <div className="flex gap-2">
                  <Input
                    value={device.token}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(device.token);
                      toast.success("Код скопирован");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Статус подключения */}
              <div className="flex items-center gap-2 text-sm">
                {device.isOnline ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-purple-500" />
                    <span className="text-purple-600">Устройство подключено</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                    <span className="text-gray-500">Не подключено</span>
                  </>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowQrDialog(false)}>
                Закрыть
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Requisite Dialog */}
        <AddRequisiteDialog
          open={showAddRequisiteDialog}
          onOpenChange={setShowAddRequisiteDialog}
          deviceId={device?.id}
          onSuccess={fetchDevice}
        />
      </AuthLayout>
    </ProtectedRoute>
  );
}
