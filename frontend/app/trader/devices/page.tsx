"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AuthLayout } from "@/components/layouts/auth-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/simple-popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/simple-select";
import { Checkbox } from "@/components/ui/checkbox";
import { traderApi } from "@/services/api";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Smartphone,
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
  Activity,
  Copy,
  Loader2,
  ChevronDown,
  X,
  Filter,
  ArrowUpDown,
  SlidersHorizontal,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import QRCode from "qrcode";
import { StickySearchFilters } from "@/components/ui/sticky-search-filters";
import { getDeviceStatusWebSocket, DeviceStatusUpdate } from "@/services/device-status-ws";

interface Device {
  id: string;
  name: string;
  token: string;
  isOnline: boolean;
  isWorking: boolean;
  isRegistered: boolean;
  energy?: number;
  ethernetSpeed?: number;
  lastSeen?: string;
  stoppedAt?: string;
  createdAt: string;
  firstConnectionAt?: string | null;
  linkedBankDetails: number;
  status?: "working" | "stopped" | "unregistered";
  simNumber?: string;
}

// Mock devices with more realistic data
const mockDevices: Device[] = [
  {
    id: "195088",
    name: "9090",
    token: "9d309ffc-2b7d-412d-ace7-d0f21841ba4d",
    isOnline: true,
    isRegistered: true,
    linkedBankDetails: 0,
    status: "stopped",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "193893",
    name: "ВТБ счет",
    token: "6884a2e4-aa34-4057-9ba8-48c11ce19893",
    isOnline: true,
    isRegistered: true,
    linkedBankDetails: 1,
    status: "stopped",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "193235",
    name: "Тинь июль",
    token: "0f440ced-4040-422d-8e39-49a012cc651c",
    isOnline: false,
    isRegistered: true,
    linkedBankDetails: 1,
    status: "stopped",
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "192175",
    name: "34к35",
    token: "00aa2a8e-c694-40fa-96e8-0b12bf0a4a1b",
    isOnline: false,
    isRegistered: false,
    linkedBankDetails: 0,
    status: "unregistered",
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "192127",
    name: "45",
    token: "53f8c0bd-5f4f-4ba2-be83-71d833c68f2e",
    isOnline: false,
    isRegistered: false,
    linkedBankDetails: 0,
    status: "unregistered",
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "191473",
    name: "123",
    token: "c2d63d55-434b-45a5-b43c-c98b7d2ab87f",
    isOnline: false,
    isRegistered: false,
    linkedBankDetails: 0,
    status: "unregistered",
    createdAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "185726",
    name: "Тинь эльд 2",
    token: "5f779d3c-7163-424e-ac7e-97f5924af501",
    isOnline: false,
    isRegistered: true,
    linkedBankDetails: 1,
    status: "stopped",
    stoppedAt: "26.06.25, 12:45",
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function DevicesPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);
  const [deviceTokenDialogOpen, setDeviceTokenDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [deviceForm, setDeviceForm] = useState({ name: "" });
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterOnline, setFilterOnline] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const deviceStatusWs = useRef<ReturnType<typeof getDeviceStatusWebSocket> | null>(null);

  useEffect(() => {
    fetchDevices();
    
    // WebSocket connection is now handled by WebSocketProvider
    deviceStatusWs.current = getDeviceStatusWebSocket();
    
    // Listen for device status updates
    deviceStatusWs.current.on('device-status-update', (update: DeviceStatusUpdate) => {
      console.log('[DevicesPage] Device status update:', update);
      
      setDevices(prevDevices => {
        const device = prevDevices.find(d => d.id === update.deviceId);
        
        // If device is coming online and doesn't have firstConnectionAt, mark it as connected
        if (device && update.isOnline && device.firstConnectionAt == null) {
          console.log('[DevicesPage] Device came online without firstConnectionAt, marking as connected...');
          traderApi.markDeviceConnected(update.deviceId).then(() => {
            console.log('[DevicesPage] Device marked as connected, refreshing list...');
            fetchDevices().then(() => {
              console.log('[DevicesPage] Devices list refreshed after marking as connected');
            });
          }).catch(error => {
            console.error('[DevicesPage] Error marking device as connected:', error);
          });
        }
        
        return prevDevices.map(device => 
          device.id === update.deviceId 
            ? {
                ...device,
                isOnline: update.isOnline,
                energy: update.batteryLevel ?? device.energy,
                ethernetSpeed: update.networkSpeed ?? device.ethernetSpeed,
                isWorking: device.isWorking // Keep the working state, don't change it based on online status
              }
            : device
        );
      });
    });
    
    // Listen for device going offline
    deviceStatusWs.current.on('device-offline', (deviceId: string) => {
      console.log('[DevicesPage] Device went offline:', deviceId);
      toast.warning(`Устройство отключено от сети`);
    });
    
    // Listen for bank details disabled
    deviceStatusWs.current.on('bank-details-disabled', (data: { deviceId: string, count: number }) => {
      console.log('[DevicesPage] Bank details disabled:', data);
      if (data.count > 0) {
        toast.error(`Отключено ${data.count} реквизитов из-за потери связи с устройством`);
      }
    });
    
    return () => {
      // WebSocket cleanup is now handled by WebSocketProvider
      // Just remove event listeners if needed
    };
  }, []);

  // Polling для проверки статуса нового устройства
  useEffect(() => {
    if (deviceTokenDialogOpen && selectedDevice) {
      // Запускаем polling каждые 2 секунды
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const deviceData = await traderApi.getDevice(selectedDevice.id);
          
          // Update selected device with latest data
          setSelectedDevice(deviceData);
          
          // Check if device just connected for the first time
          if (selectedDevice.firstConnectionAt == null && deviceData.firstConnectionAt != null) {
            // Устройство подключилось впервые!
            setDeviceTokenDialogOpen(false);
            toast.success("Устройство успешно подключено!");
            
            // Останавливаем polling
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            
            // Обновляем список устройств
            await fetchDevices();
          }
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
  }, [deviceTokenDialogOpen, selectedDevice]);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      console.log("Fetching devices from API...");
      const response = await traderApi.getDevices();
      console.log("Raw API response:", response);
      console.log("Response type:", typeof response);
      console.log("Is array?", Array.isArray(response));

      // Ensure response is an array before mapping
      let devicesList = [];
      if (Array.isArray(response)) {
        devicesList = response;
      } else if (response && Array.isArray(response.data)) {
        devicesList = response.data;
      } else if (response && typeof response === 'object') {
        // If response is an object but not an array, try to find the devices array
        console.log("Response keys:", Object.keys(response));
        devicesList = [];
      } else {
        devicesList = [];
      }
      
      console.log("Devices list to process:", devicesList);
      
      // Map the API response to our Device interface
      const mappedDevices: Device[] = devicesList.map((device: any) => ({
        id: device.id,
        name: device.name,
        token: device.token,
        isOnline: device.isOnline || false,
        isWorking: device.isWorking || false,
        isRegistered: true, // Assume all devices from API are registered
        energy: device.energy,
        ethernetSpeed: device.ethernetSpeed,
        lastSeen: device.lastSeen || device.createdAt,
        createdAt: device.createdAt,
        firstConnectionAt: device.firstConnectionAt,
        linkedBankDetails: device.linkedBankDetails || 0,
        status: device.isWorking ? "working" : "stopped",
      }));

      console.log("Mapped devices:", mappedDevices);
      setDevices(mappedDevices);
    } catch (error) {
      console.error("Failed to fetch devices:", error);
      toast.error("Не удалось загрузить устройства");
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  const createDevice = async () => {
    try {
      console.log("Creating device:", deviceForm.name);
      
      // Call the real API
      const createdDevice = await traderApi.createDevice({ name: deviceForm.name });
      console.log("Device created:", createdDevice);

      // Map the response to our interface
      const newDevice: Device = {
        id: createdDevice.id,
        name: createdDevice.name,
        token: createdDevice.token,
        isOnline: false,
        isRegistered: true,
        linkedBankDetails: 0,
        status: "stopped",
        createdAt: createdDevice.createdAt,
        firstConnectionAt: createdDevice.firstConnectionAt,
      };

      // Add to devices list
      setDevices([newDevice, ...devices]);
      setDeviceDialogOpen(false);
      setDeviceForm({ name: "" });
      setSelectedDevice(newDevice);

      // Generate QR code for the token
      try {
        const qrCodeUrl = await QRCode.toDataURL(newDevice.token, {
          errorCorrectionLevel: "M",
          type: "image/png",
          quality: 0.92,
          margin: 1,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
        setQrCodeDataUrl(qrCodeUrl);
      } catch (qrError) {
        console.error("Error generating QR code:", qrError);
      }

      setDeviceTokenDialogOpen(true);
      toast.success("Устройство создано");
      
      // Refresh the devices list
      await fetchDevices();
    } catch (error) {
      console.error("Error creating device:", error);
      toast.error("Не удалось создать устройство");
    }
  };

  const filteredDevices = devices.filter((device) => {
    const matchesSearch = 
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.token.includes(searchQuery) ||
      device.id.includes(searchQuery);
      
    const matchesStatus = 
      filterStatus === "all" ||
      (filterStatus === "working" && (device.isOnline || device.status === "working")) ||
      (filterStatus === "not_working" && !device.isOnline && device.status !== "working" && device.isRegistered) ||
      (filterStatus === "unregistered" && !device.isRegistered);
      
    const matchesOnline = !filterOnline || device.isOnline;
    
    return matchesSearch && matchesStatus && matchesOnline;
  });

  const sortedDevices = [...filteredDevices].sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
  });

  const getDeviceStatusInfo = (device: Device) => {
    if (!device.isRegistered) {
      return {
        title: "Не зарегистрировано в системе",
        description: "Пройдите регистрацию в мобильном приложении",
        badge: {
          text: "Без регистрации",
          className: "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
        },
        iconColor: "text-red-500 dark:text-red-400",
      };
    }

    if (device.firstConnectionAt == null) {
      return {
        title: "Ожидает первого подключения",
        description: "Отсканируйте QR код в приложении",
        badge: {
          text: "Не подключено",
          className: "bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
        },
        iconColor: "text-yellow-500 dark:text-yellow-400",
      };
    }

    if (device.isWorking) {
      return {
        title: `Реквизиты: ${device.linkedBankDetails}`,
        description: device.isOnline ? "Активно" : "Нет связи, но работает",
        badge: {
          text: "В работе",
          className: "bg-green-100 text-green-700 border-green-300 dark:bg-green-800/30 dark:text-green-300 dark:border-green-600",
        },
        iconColor: "text-green-600 dark:text-green-400",
      };
    }

    return {
      title: `Реквизиты: ${device.linkedBankDetails}`,
      description: device.stoppedAt
        ? `Остановлено: ${device.stoppedAt}`
        : "Остановлено",
      badge: {
        text: "Не в работе",
        className: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/50 dark:text-gray-400 dark:border-gray-700",
      },
      iconColor: "text-gray-500 dark:text-gray-500",
    };
  };

  if (loading) {
    return (
      <ProtectedRoute variant="trader">
        <AuthLayout variant="trader">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-[#006039]" />
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
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl md:text-3xl font-bold">Устройства ({devices.length})</h1>
            <Button
              onClick={() => setDeviceDialogOpen(true)}
              style={{ backgroundColor: "#006039", color: "white" }}
              className="hover:opacity-90 transition-opacity text-sm md:text-base"
            >
              <Wifi className="mr-1 md:mr-2 h-4 w-4 md:h-5 md:w-5" />
              <span className="hidden sm:inline">Добавить устройство</span>
              <span className="sm:hidden">Добавить</span>
            </Button>
          </div>

          {/* Search and Filters Section */}
          <StickySearchFilters
            searchPlaceholder="Искать устройства"
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            activeFiltersCount={[
              filterStatus !== "all",
              filterOnline
            ].filter(Boolean).length}
            onResetFilters={() => {
              setFilterStatus("all");
              setFilterOnline(false);
            }}
            additionalButtons={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-1 md:gap-2 h-10 md:h-12 px-3 md:px-6 text-sm md:text-base">
                    <ArrowUpDown className="h-4 w-4 text-[#006039]" />
                    <span className="hidden sm:inline">{sortBy === "newest" ? "Сначала новые" : "Сначала старые"}</span>
                    <span className="sm:hidden">{sortBy === "newest" ? "Новые" : "Старые"}</span>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortBy("newest")}>
                    Сначала новые
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("oldest")}>
                    Сначала старые
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }
          >

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Wifi className="h-4 w-4 text-[#006039]" />
                <Label>Статус устройств:</Label>
              </div>
              <Select
                value={filterStatus}
                onValueChange={setFilterStatus}
              >
                <SelectTrigger className="w-full h-12">
                  <SelectValue placeholder="Все устройства" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все устройства</SelectItem>
                  <SelectItem value="not_working">
                    Не в работе
                  </SelectItem>
                  <SelectItem value="working">В работе</SelectItem>
                  <SelectItem value="unregistered">Без регистрации</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox 
                checked={filterOnline}
                onCheckedChange={(checked) => setFilterOnline(checked as boolean)}
              />
              <span className="text-sm">
                Только активные устройства (online)
              </span>
            </label>

          </StickySearchFilters>

          {/* Devices List */}
          <div className="space-y-3">
            {console.log("Rendering devices:", sortedDevices)}
            {sortedDevices.map((device) => {
              const statusInfo = getDeviceStatusInfo(device);

              return (
                <Card
                  key={device.id}
                  className={cn(
                    "p-4 md:p-6 hover:shadow-md transition-all cursor-pointer",
                    !device.isRegistered && "bg-red-50/30",
                  )}
                  onClick={() => router.push(`/trader/devices/${device.id}`)}
                >
                  {/* Mobile Layout */}
                  <div className="md:hidden">
                    <div className="flex items-start gap-3">
                      {/* Device Icon */}
                      <div
                        className={cn(
                          "p-2 rounded-lg flex-shrink-0",
                          device.isRegistered 
                            ? (device.isWorking 
                              ? "bg-green-100 dark:bg-green-800/30" 
                              : "bg-gray-50 dark:bg-gray-900/50")
                            : "bg-red-100 dark:bg-red-900/20",
                        )}
                      >
                        <Smartphone
                          className={cn("h-5 w-5", statusInfo.iconColor)}
                        />
                      </div>

                      {/* Device Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-base truncate">{device.name}</h3>
                              {device.linkedBankDetails > 0 && (
                                <Badge className="bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 text-xs px-1.5 py-0.5 flex-shrink-0">
                                  {device.linkedBankDetails}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <p className="text-xs text-gray-500 font-mono truncate">
                                {device.token.substring(0, 8)}...
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(device.token);
                                  toast.success("Токен скопирован");
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          {/* Status Badge */}
                          <Badge
                            className={cn(
                              "border px-2 py-1 text-xs flex-shrink-0",
                              statusInfo.badge.className,
                            )}
                          >
                            {statusInfo.badge.text}
                          </Badge>
                        </div>

                        {/* Status Info */}
                        <div className="mt-2">
                          <p className="text-sm font-medium">{statusInfo.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {statusInfo.description}
                          </p>
                        </div>

                        {/* Online Status */}
                        <div className="mt-2 flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "w-2 h-2 rounded-full",
                                device.isOnline ? "bg-green-500" : "bg-gray-400"
                              )}
                            />
                            <p className="text-xs text-gray-600">
                              {device.isOnline ? "Онлайн" : "Не в сети"}
                            </p>
                          </div>
                          
                          {device.isOnline && (
                            <>
                              {device.energy !== undefined && (
                                <div className="flex items-center gap-1">
                                  <Battery className="h-3 w-3 text-gray-500" />
                                  <span className="text-xs text-gray-600">{device.energy}%</span>
                                </div>
                              )}
                              {device.ethernetSpeed !== undefined && (
                                <div className="flex items-center gap-1">
                                  <Wifi className="h-3 w-3 text-gray-500" />
                                  <span className="text-xs text-gray-600">{device.ethernetSpeed} Mbps</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden md:flex items-center justify-between">
                    {/* Left Section - Icon and Device Info */}
                    <div className="flex items-center gap-4">
                      {/* Device Icon */}
                      <div
                        className={cn(
                          "p-3 rounded-lg",
                          device.isRegistered 
                            ? (device.isWorking 
                              ? "bg-green-100 dark:bg-green-800/30" 
                              : "bg-gray-50 dark:bg-gray-900/50")
                            : "bg-red-100 dark:bg-red-900/20",
                        )}
                      >
                        <Smartphone
                          className={cn("h-6 w-6", statusInfo.iconColor)}
                        />
                      </div>

                      {/* Device Name and Token */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{device.name}</h3>
                          {device.linkedBankDetails > 0 && (
                            <Badge className="bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 text-xs">
                              {device.linkedBankDetails} реквизит{device.linkedBankDetails === 1 ? '' : device.linkedBankDetails < 5 ? 'а' : 'ов'}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-500 font-mono">
                            {device.token.substring(0, 10)}...
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(device.token);
                              toast.success("Токен скопирован");
                            }}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Middle Section - Status */}
                    <div className="flex-1 px-8">
                      <div className="max-w-sm">
                        <p className="font-medium">{statusInfo.title}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {statusInfo.description}
                        </p>
                      </div>
                    </div>

                    {/* Right Section - Online Status and Badge */}
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        {device.isOnline ? (
                          <div className="space-y-1">
                            {device.energy !== undefined && (
                              <div className="flex items-center gap-2 justify-end">
                                <Battery className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-600">{device.energy}%</span>
                              </div>
                            )}
                            {device.ethernetSpeed !== undefined && (
                              <div className="flex items-center gap-2 justify-end">
                                <Wifi className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-600">{device.ethernetSpeed} Mbps</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Нет данных</p>
                        )}
                        <p
                          className={cn(
                            "text-sm font-medium mt-1",
                            device.isOnline
                              ? "text-[#006039]"
                              : "text-gray-600",
                          )}
                        >
                          {device.isOnline ? "Онлайн" : "Не в сети"}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <div className="w-32">
                        <Badge
                          className={cn(
                            "border px-3 py-1.5 rounded-md w-full text-center justify-center",
                            statusInfo.badge.className,
                          )}
                        >
                          {statusInfo.badge.text}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {sortedDevices.length === 0 && (
            <Card className="p-8 md:p-12 text-center">
              <Smartphone className="h-10 w-10 md:h-12 md:w-12 mx-auto text-gray-300 mb-3 md:mb-4" />
              <p className="text-sm md:text-base text-gray-500">Устройства не найдены</p>
            </Card>
          )}
        </div>

        {/* Create Device Dialog */}
        <Dialog open={deviceDialogOpen} onOpenChange={setDeviceDialogOpen}>
          <DialogContent className="sm:max-w-[425px] max-w-[calc(100vw-2rem)]">
            <DialogHeader>
              <DialogTitle className="text-base md:text-lg">Добавить устройство</DialogTitle>
              <DialogDescription className="text-sm">
                Введите название для нового устройства
              </DialogDescription>
            </DialogHeader>

            <div>
              <Label htmlFor="deviceName" className="text-sm">Название устройства</Label>
              <Input
                id="deviceName"
                placeholder="Например: Samsung Galaxy S23"
                value={deviceForm.name}
                onChange={(e) => setDeviceForm({ name: e.target.value })}
                className="mt-2 text-sm md:text-base"
              />
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDeviceDialogOpen(false);
                  setDeviceForm({ name: "" });
                }}
                className="w-full sm:w-auto"
              >
                Отмена
              </Button>
              <Button
                onClick={createDevice}
                style={{ backgroundColor: "#006039", color: "white" }}
                className="hover:opacity-90 transition-opacity w-full sm:w-auto"
                disabled={!deviceForm.name}
              >
                Создать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Device Token Dialog */}
        <Dialog
          open={deviceTokenDialogOpen}
          onOpenChange={setDeviceTokenDialogOpen}
        >
          <DialogContent className="max-w-lg max-w-[calc(100vw-2rem)]">
            <DialogHeader>
              <DialogTitle className="text-base md:text-lg">Токен устройства</DialogTitle>
              <DialogDescription className="text-sm">
                Сохраните этот токен в безопасном месте. Он понадобится для
                подключения устройства.
              </DialogDescription>
            </DialogHeader>

            {selectedDevice && (
              <div className="space-y-4 md:space-y-6">
                {/* QR Code */}
                {qrCodeDataUrl && (
                  <div className="flex flex-col items-center space-y-2 md:space-y-3">
                    <div className="p-3 md:p-4 bg-white border-2 border-gray-200 rounded-lg">
                      <img
                        src={qrCodeDataUrl}
                        alt="QR код токена устройства"
                        className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48"
                      />
                    </div>
                    <p className="text-xs md:text-sm text-gray-600 text-center">
                      Отсканируйте QR код с мобильного устройства
                    </p>
                  </div>
                )}

                {/* Token Text */}
                <div className="p-3 md:p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-2">
                    Токен устройства:
                  </p>
                  <p className="font-mono text-xs md:text-sm break-all">
                    {selectedDevice.token}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedDevice.token);
                      toast.success("Токен скопирован в буфер обмена");
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Скопировать
                  </Button>
                  <Button
                    className="flex-1 bg-[#0052FF] hover:bg-[#0052FF]/90 text-white"
                    onClick={() =>
                      router.push(`/trader/devices/${selectedDevice.id}`)
                    }
                  >
                    Перейти к устройству
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeviceTokenDialogOpen(false)}
                className="w-full sm:w-auto"
              >
                Закрыть
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AuthLayout>
    </ProtectedRoute>
  );
}
