"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AuthLayout } from "@/components/layouts/auth-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BankCard } from "@/components/ui/bank-card";
import Image from "next/image";
import { traderApi } from "@/services/api";
import { toast } from "sonner";
import {
  Search,
  Filter,
  PlayCircle,
  PauseCircle,
  Archive,
  CreditCard,
  Smartphone,
  Loader2,
  CheckCircle,
  AlertCircle,
  Plus,
  ChevronDown,
  ArrowUpDown,
  SlidersHorizontal,
  MoreVertical,
  Edit,
  Trash2,
} from "lucide-react";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/simple-popover";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { TraderHeader } from "@/components/trader/trader-header";
import { ClassicEntryTabs } from "@/components/trader/classic-entry-tabs";
import { StickySearchFilters } from "@/components/ui/sticky-search-filters";
import { useDebounce } from "@/hooks/use-debounce";
import { RequisitesSheet } from "@/components/trader/requisites-sheet";

interface Requisite {
  id: string;
  methodType: string;
  bankType: string;
  cardNumber: string;
  recipientName: string;
  phoneNumber?: string;
  minAmount: number;
  maxAmount: number;
  currentTotalAmount: number;
  operationLimit: number;
  sumLimit: number;
  activeDeals: number;
  intervalMinutes: number;
  turnoverDay: number;
  turnoverTotal: number;
  successfulDeals: number;
  totalDeals: number;
  isArchived: boolean;
  isActive: boolean;
  hasDevice: boolean;
  trafficPreference?: 'ANY' | 'PRIMARY' | 'SECONDARY' | 'VIP';
  device?: {
    id: string;
    name: string;
    isOnline: boolean;
    isWorking?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export default function TraderRequisitesPage() {
  const [requisites, setRequisites] = useState<Requisite[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequisites, setSelectedRequisites] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRequisitesSheet, setShowRequisitesSheet] = useState(false);
  const [methods, setMethods] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [addingRequisite, setAddingRequisite] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "stopped" | "archived">("all");
  const [filterDevice, setFilterDevice] = useState<string>("all");
  const [deviceSearch, setDeviceSearch] = useState("");
  const [deviceSearchInternal, setDeviceSearchInternal] = useState("");
  const [selectedRequisiteForInfo, setSelectedRequisiteForInfo] =
    useState<Requisite | null>(null);
  const [editingRequisite, setEditingRequisite] = useState<Requisite | null>(null);
  const [currentTab, setCurrentTab] = useState<"working" | "archived">("working");

  // Form state (числовые поля как строки, чтобы позволять полную очистку)
  const [requisiteForm, setRequisiteForm] = useState({
    methodType: "",
    bankType: "",
    cardNumber: "",
    recipientName: "",
    phoneNumber: "",
    minAmount: "100",
    maxAmount: "50000",
    operationLimit: "0",
    sumLimit: "0",
    trafficPreference: "ANY" as 'ANY' | 'PRIMARY' | 'SECONDARY' | 'VIP',
  });

  useEffect(() => {
    fetchRequisites();
    fetchMethods();
    fetchDevices();
  }, []);

  const fetchRequisites = async () => {
    try {
      setLoading(true);
      const data = await traderApi.getRequisites();
      console.log('[Requisites] Raw data from API:', data);
      // Ensure data is an array
      const dataArray = Array.isArray(data) ? data : [];
      const requisitesWithDeals = dataArray.map((req: any) => {
        console.log('[Requisites] Processing requisite:', req?.id, {
          currentTotalAmount: req?.currentTotalAmount,
          successfulDeals: req?.successfulDeals,
          totalDeals: req?.totalDeals,
          activeDeals: req?.activeDeals,
          sumLimit: req?.sumLimit,
          methodType: req?.methodType,
          fullObject: req
        });
        // Ensure all required fields exist
        return {
          ...req,
          id: req?.id || '',
          methodType: req?.methodType || '',
          bankType: req?.bankType || '',
          cardNumber: req?.cardNumber || '',
          recipientName: req?.recipientName || '',
          phoneNumber: req?.phoneNumber || '',
          minAmount: Number(req?.minAmount ?? 0),
          maxAmount: Number(req?.maxAmount ?? 0),
          currentTotalAmount: Number(req?.currentTotalAmount ?? 0),
          operationLimit: Number(req?.operationLimit ?? 0),
          sumLimit: Number(req?.sumLimit ?? 0),
          activeDeals: Number(req?.activeDeals ?? 0),
          intervalMinutes: req?.intervalMinutes || 0,
          turnoverDay: req?.turnoverDay || 0,
          turnoverTotal: req?.turnoverTotal || 0,
          successfulDeals: Number(req?.successfulDeals ?? 0),
          totalDeals: Number(req?.totalDeals ?? 0),
          isArchived: req?.isArchived || false,
          isActive: req?.isActive !== undefined ? req?.isActive : true,
          hasDevice: req?.hasDevice || false,
          trafficPreference: (req?.trafficPreference || 'ANY') as 'ANY' | 'PRIMARY' | 'SECONDARY' | 'VIP',
          device: req?.device || null,
          createdAt: req?.createdAt || new Date().toISOString(),
          updatedAt: req?.updatedAt || new Date().toISOString(),
        };
      });
      setRequisites(requisitesWithDeals);
    } catch (error) {
      console.error("Error fetching requisites:", error);
      toast.error("Не удалось загрузить реквизиты");
    } finally {
      setLoading(false);
    }
  };

  const fetchMethods = async () => {
    try {
      const data = await traderApi.getMethods();
      setMethods(data);
    } catch (error) {
      console.error("Error fetching methods:", error);
    }
  };

  const fetchDevices = async () => {
    try {
      const data = await traderApi.getDevices();
      setDevices(data);
    } catch (error) {
      console.error("Error fetching devices:", error);
    }
  };

  const handleCreateRequisite = async () => {
    try {
      setAddingRequisite(true);

      // Validation
      if (!requisiteForm.methodType) {
        toast.error("Выберите метод");
        return;
      }
      if (!requisiteForm.bankType) {
        toast.error("Выберите банк");
        return;
      }
      if (!requisiteForm.cardNumber && !requisiteForm.phoneNumber) {
        toast.error("Введите номер карты или телефона");
        return;
      }
      if (!requisiteForm.recipientName) {
        toast.error("Введите имя получателя");
        return;
      }

      // Prepare data
      const requisiteData = {
        ...requisiteForm,
        minAmount: Number(requisiteForm.minAmount),
        maxAmount: Number(requisiteForm.maxAmount),
        operationLimit: Number(requisiteForm.operationLimit),
        sumLimit: Number(requisiteForm.sumLimit),
        deviceId: null, // Always null since we removed device selection
        intervalMinutes: 5 // Default value
      };
      
      console.log('[Requisites] Creating requisite with data:', requisiteData);
      
      await traderApi.createRequisite(requisiteData);
      toast.success("Реквизит успешно добавлен");
      setShowAddDialog(false);
      await fetchRequisites();

      // Reset form
      setRequisiteForm({
        methodType: "",
        bankType: "",
        cardNumber: "",
        recipientName: "",
        phoneNumber: "",
        minAmount: "100",
        maxAmount: "50000",
        operationLimit: "0",
        sumLimit: "0",
        trafficPreference: "ANY",
      });
    } catch (error: any) {
      console.error("Error creating requisite:", error);
      toast.error(error.response?.data?.error || "Не удалось создать реквизит");
    } finally {
      setAddingRequisite(false);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedRequisites.length === 0) {
      toast.error("Выберите действие и реквизиты");
      return;
    }

    try {
      switch (bulkAction) {
        case "stop":
          for (const id of selectedRequisites) {
            await traderApi.stopRequisite(id);
          }
          toast.success(`Деактивировано реквизитов: ${selectedRequisites.length}`);
          break;
        case "start":
          for (const id of selectedRequisites) {
            await traderApi.startRequisite(id);
          }
          toast.success(`Активировано реквизитов: ${selectedRequisites.length}`);
          break;
      }

      setSelectedRequisites([]);
      setBulkAction("");
      await fetchRequisites();
    } catch (error) {
      toast.error("Не удалось выполнить действие");
    }
  };

  const handleToggleStatus = async (requisite: Requisite) => {
    try {
      if (requisite.isActive) {
        await traderApi.stopRequisite(requisite.id);
        toast.success("Реквизит деактивирован");
      } else {
        await traderApi.startRequisite(requisite.id);
        toast.success("Реквизит активирован");
      }
      await fetchRequisites();
    } catch (error) {
      console.error("Failed to toggle requisite status:", error);
      toast.error("Не удалось изменить статус реквизита");
    }
  };

  const handleDelete = async (requisiteId: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот реквизит?")) return;

    try {
      await traderApi.deleteRequisite(requisiteId);
      toast.success("Реквизит удален");
      await fetchRequisites();
    } catch (error) {
      console.error("Failed to delete requisite:", error);
      toast.error("Не удалось удалить реквизит");
    }
  };

  const handleArchive = async (requisite: Requisite) => {
    try {
      await traderApi.updateRequisite(requisite.id, { isArchived: !requisite.isArchived });
      toast.success(requisite.isArchived ? "Реквизит разархивирован" : "Реквизит архивирован");
      await fetchRequisites();
    } catch (error) {
      console.error("Failed to archive/unarchive requisite:", error);
      toast.error("Не удалось изменить статус архивации");
    }
  };

  const toggleSelectAll = () => {
    if (selectedRequisites.length === filteredRequisites.length) {
      setSelectedRequisites([]);
    } else {
      setSelectedRequisites(filteredRequisites.map((r) => r.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedRequisites((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const filteredRequisites = requisites
    .filter((requisite) => (currentTab === "archived" ? requisite.isArchived : !requisite.isArchived))
    .filter((requisite) => {
      const matchesSearch =
        requisite.cardNumber.includes(searchQuery) ||
        requisite.recipientName
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (requisite.phoneNumber && requisite.phoneNumber.includes(searchQuery));

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && requisite.isActive && !requisite.isArchived) ||
        (filterStatus === "stopped" && !requisite.isActive && !requisite.isArchived) ||
        (filterStatus === "archived" && requisite.isArchived);

      const matchesDevice =
        filterDevice === "all" ||
        (filterDevice === "none" && !requisite.hasDevice) ||
        (requisite.device && requisite.device.id === filterDevice);

      return matchesSearch && matchesStatus && matchesDevice;
    })
    .sort((a, b) => {
      switch (sortOrder) {
        case "newest":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "oldest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        default:
          return 0;
      }
    });

  const getTrafficPercentage = (current: number, limit: number) => {
    return limit > 0 ? (current / limit) * 100 : 0;
  };

  const getTrafficColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-500";
    if (percentage >= 70) return "text-orange-500";
    if (percentage >= 50) return "text-yellow-500";
    return "text-primary";
  };

  const getBankLogo = (bankType: string): string => {
    const bankMap: { [key: string]: string } = {
      SBERBANK: "sberbank.svg",
      TBANK: "tbank.svg",
      VTB: "vtb.svg",
      ALFABANK: "alfabank.svg",
      RAIFFEISEN: "raiffeisen.svg",
      GAZPROMBANK: "gazprombank.svg",
      TINKOFF: "tinkoff.svg",
      OTKRITIE: "otkritie.svg",
      ROSBANK: "rosbank.svg",
      PSB: "psb.svg",
      SOVCOMBANK: "sovcombank.svg",
      POCHTABANK: "pochtabank.svg",
      RSHB: "rshb.svg",
      AVANGARD: "avangard.svg",
      ZENIT: "zenit.svg",
      URALSIB: "uralsib.svg",
      MKB: "mkb.svg",
      AKBARS: "akbars.svg",
      "RUSSIAN-STANDARD": "russian-standard.svg",
      BSPB: "bspb.svg",
      RNKB: "rnkb.svg",
    };
    return bankMap[bankType] || "sberbank.svg";
  };

  const detectPaymentSystem = (
    cardNumber: string,
  ): "mir" | "mastercard" | "visa" | "unknown" => {
    const cleanNumber = cardNumber.replace(/\s/g, "");
    if (cleanNumber.startsWith("2")) return "mir";
    if (cleanNumber.startsWith("4")) return "visa";
    if (cleanNumber.startsWith("5")) return "mastercard";
    return "unknown";
  };

  const PaymentSystemIcon = ({
    system,
  }: {
    system: "mir" | "mastercard" | "visa" | "unknown";
  }) => {
    return null;
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
          {/* Classic Entry Tabs */}
          <ClassicEntryTabs />
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold">Реквизиты</h1>
              <p className="text-sm md:text-base text-gray-500">Управление платежными реквизитами</p>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <div className="hidden md:block">
                <TraderHeader />
              </div>
            </div>
          </div>

          {/* Top Tabs: Working vs Archived */}
          <div className="flex items-center gap-2">
            <Button
              variant={currentTab === "working" ? "default" : "outline"}
              className={currentTab === "working" ? "bg-[#006039] hover:bg-[#006039]/90 text-white" : ""}
              onClick={() => setCurrentTab("working")}
            >
              Рабочие реквизиты
            </Button>
            <Button
              variant={currentTab === "archived" ? "default" : "outline"}
              className={currentTab === "archived" ? "bg-[#006039] hover:bg-[#006039]/90 text-white" : ""}
              onClick={() => setCurrentTab("archived")}
            >
              Архив
            </Button>
          </div>

          {/* Search and Filters - Sticky */}
          <StickySearchFilters
            searchPlaceholder="Поиск..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            activeFiltersCount={[filterStatus !== "all", filterDevice !== "all"].filter(Boolean).length}
            onResetFilters={() => {
              setFilterStatus("all");
              setFilterDevice("all");
              setDeviceSearch("");
              setDeviceSearchInternal("");
            }}
            additionalButtons={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-1 md:gap-2 h-10 md:h-12 px-3 md:px-6 text-sm md:text-base">
                    <ArrowUpDown className="h-4 w-4 text-[#006039]" />
                    <span className="hidden sm:inline">{sortOrder === "newest" ? "Сначала новые" : "Сначала старые"}</span>
                    <span className="sm:hidden">{sortOrder === "newest" ? "Новые" : "Старые"}</span>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortOrder("newest")}>
                    Сначала новые
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOrder("oldest")}>
                    Сначала старые
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }
          >

                    {/* Status Filter */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-[#006039]" />
                        <Label className="text-sm">Статус реквизитов</Label>
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
                                ? "Все реквизиты"
                                : filterStatus === "active"
                                  ? "Активные"
                                  : filterStatus === "stopped"
                                    ? "Выключенные"
                                    : "Архивированные"}
                            </span>
                            <ChevronDown className="h-4 w-4 opacity-50 text-[#006039]" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[465px] p-0" align="start" sideOffset={5}>
                          <div className="max-h-64 overflow-auto">
                            <Button
                              variant="ghost"
                              size="default"
                              className={cn(
                                "w-full justify-start h-12 hover:bg-primary/10 hover:text-primary",
                                filterStatus === "all" &&
                                  "text-primary bg-primary/10"
                              )}
                              onClick={() => setFilterStatus("all")}
                            >
                              Все реквизиты
                            </Button>
                            <Button
                              variant="ghost"
                              size="default"
                              className={cn(
                                "w-full justify-start h-12 hover:bg-primary/10 hover:text-primary",
                                filterStatus === "active" &&
                                  "text-primary bg-primary/10"
                              )}
                              onClick={() => setFilterStatus("active")}
                            >
                              Активные
                            </Button>
                            <Button
                              variant="ghost"
                              size="default"
                              className={cn(
                                "w-full justify-start h-12 hover:bg-primary/10 hover:text-primary",
                                filterStatus === "stopped" &&
                                  "text-primary bg-primary/10"
                              )}
                              onClick={() => setFilterStatus("stopped")}
                            >
                              Выключенные
                            </Button>
                            <Button
                              variant="ghost"
                              size="default"
                              className={cn(
                                "w-full justify-start h-12 hover:bg-primary/10 hover:text-primary",
                                filterStatus === "archived" &&
                                  "text-primary bg-primary/10"
                              )}
                              onClick={() => setFilterStatus("archived")}
                            >
                              Архивированные
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Device Filter */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-[#006039]" />
                        <Label className="text-sm">Устройство</Label>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="default"
                            className="w-full justify-between h-12"
                          >
                            <span className="text-[#006039]">
                              {filterDevice === "all"
                                ? "Все устройства"
                                : filterDevice === "none"
                                  ? "Без устройства"
                                  : devices.find(d => d.id === filterDevice)?.name || "Выберите устройство"}
                            </span>
                            <ChevronDown className="h-4 w-4 opacity-50 text-[#006039]" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[465px] p-0" align="start" sideOffset={5}>
                          <div className="p-2 border-b">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                              <Input
                                id="device-search-input"
                                placeholder="Поиск устройства"
                                value={deviceSearchInternal}
                                onChange={(e) => {
                                  setDeviceSearchInternal(e.target.value);
                                  const debouncedValue = e.target.value;
                                  setTimeout(() => setDeviceSearch(debouncedValue), 300);
                                }}
                                className="pl-9"
                              />
                            </div>
                          </div>
                          <div className="max-h-64 overflow-auto">
                            <Button
                              variant="ghost"
                              size="default"
                              className={cn(
                                "w-full justify-start h-12 hover:bg-primary/10 hover:text-primary",
                                filterDevice === "all" &&
                                  "text-primary bg-primary/10"
                              )}
                              onClick={() => setFilterDevice("all")}
                            >
                              Все устройства
                            </Button>
                            <Button
                              variant="ghost"
                              size="default"
                              className={cn(
                                "w-full justify-start h-12 hover:bg-primary/10 hover:text-primary",
                                filterDevice === "none" &&
                                  "text-primary bg-primary/10"
                              )}
                              onClick={() => setFilterDevice("none")}
                            >
                              Без устройства
                            </Button>
                            {devices
                              .filter(device => 
                                device.name.toLowerCase().includes(deviceSearch.toLowerCase())
                              )
                              .map((device) => (
                                <Button
                                  key={device.id}
                                  variant="ghost"
                                  size="default"
                                  className={cn(
                                    "w-full justify-start h-12 hover:bg-primary/10 hover:text-primary",
                                    filterDevice === device.id &&
                                      "text-primary bg-primary/10"
                                  )}
                                  onClick={() => setFilterDevice(device.id)}
                                >
                                  <div className="flex items-center gap-2">
                                    <Smartphone className="h-4 w-4" />
                                    <span>{device.name}</span>
                                    {device.isOnline && (
                                      <div className="w-2 h-2 bg-primary rounded-full" />
                                    )}
                                  </div>
                                </Button>
                              ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

          </StickySearchFilters>

          {/* Bulk Actions */}
          {selectedRequisites.length > 0 && (
            <Card className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Select value={bulkAction} onValueChange={setBulkAction}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Выберите действие" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stop">
                        <div className="flex items-center">
                          <PauseCircle className="mr-2 h-4 w-4 text-[#006039]" />
                          Остановить
                        </div>
                      </SelectItem>
                      <SelectItem value="start">
                        <div className="flex items-center">
                          <PlayCircle className="mr-2 h-4 w-4 text-[#006039]" />
                          Запустить
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={handleBulkAction}
                    disabled={!bulkAction}
                    className="bg-[#006039] hover:bg-[#006039]/90"
                  >
                    Применить
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Requisites List */}
          <div className="space-y-3">
            {filteredRequisites.map((requisite) => {
              console.log('[Requisites] Rendering requisite:', requisite.id, {
                activeDeals: requisite.activeDeals,
                sumLimit: requisite.sumLimit,
                currentTotalAmount: requisite.currentTotalAmount,
                methodType: requisite.methodType
              });
              const paymentSystem = detectPaymentSystem(requisite.cardNumber);

              // Determine if requisite is actually working
              const isWorking = requisite.isActive && (!requisite.hasDevice || (requisite.device?.isOnline === true));
              
              return (
                <div key={requisite.id} className="relative">
                  {/* Checkbox - positioned outside card */}
                  <Checkbox
                    checked={selectedRequisites.includes(requisite.id)}
                    onCheckedChange={() => toggleSelect(requisite.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 flex-shrink-0"
                  />

                  <Card
                    className="pl-10 md:pl-12 pr-3 md:pr-4 py-3 md:py-4 hover:shadow-md transition-all duration-300 border-gray-100"
                  >
                    {/* Mobile Layout */}
                    <div className="md:hidden">
                      <div className="space-y-3">
                        {/* Top Row: Bank Logo, Name with Device, Status */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {/* Bank Logo */}
                            <div className="flex-shrink-0">
                              <Image
                                src={`/bank-logos/${getBankLogo(requisite.bankType)}`}
                                alt={requisite.bankType}
                                width={28}
                                height={28}
                                className="object-contain"
                              />
                            </div>

                            {/* Name and Device */}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 text-sm truncate">
                                {requisite.recipientName}
                              </div>
                              {requisite.device && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Smartphone className="h-3 w-3 text-green-600" />
                                  <span className="text-xs text-green-600 truncate">
                                    {requisite.device.name}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Status Badge and Actions */}
                          <div className="flex items-center gap-2">
                            <div className="flex-shrink-0 flex items-center gap-1 flex-wrap">
                              {requisite.device && (
                                <Badge className={cn(
                                  "text-xs px-2 py-1",
                                  (requisite.device.isWorking ?? requisite.device.isOnline)
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : "bg-gray-100 text-gray-600 border-gray-300"
                                )}>
                                  {(requisite.device.isWorking ?? requisite.device.isOnline)
                                    ? "Устройство: в работе"
                                    : "Устройство: не в работе"}
                                </Badge>
                              )}
                              <Badge className={cn(
                                "text-xs px-2 py-1",
                                requisite.isActive && !requisite.isArchived
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-gray-100 text-gray-600 border-gray-300"
                              )}>
                                {requisite.isActive ? "Реквизит: активен" : "Реквизит: неактивен"}
                              </Badge>
                              {/* Archive badge removed per new UX */}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setEditingRequisite(requisite);
                                  setShowRequisitesSheet(true);
                                }}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Редактировать
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleArchive(requisite)}>
                                  {requisite.isArchived ? (
                                    <>
                                      <Archive className="mr-2 h-4 w-4" />
                                      Разархивировать
                                    </>
                                  ) : (
                                    <>
                                      <Archive className="mr-2 h-4 w-4" />
                                      Архивировать
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(requisite.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Удалить
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Card Number and Method */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {paymentSystem !== "unknown" && (
                              <PaymentSystemIcon system={paymentSystem} />
                            )}
                            <span className="font-medium text-gray-900 text-sm">
                              {requisite.cardNumber.replace(/(\d{4})/g, "$1 ").trim()}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600">
                            <span>Метод: {requisite.methodType === 'sbp' ? 'СБП' : requisite.methodType === 'c2c' ? 'C2C' : requisite.methodType || ''}</span>
                          </div>
                        </div>

                        {/* Success Rate and Limits */}
                        <div className="space-y-2">
                          <div className="text-xs text-gray-600">
                            Успешные сделки: {requisite.successfulDeals || 0}
                          </div>

                          {/* Limits Info */}
                          <div className="flex flex-wrap gap-3 text-xs">
                            <div>
                              <span className="text-gray-600">Лимиты суммы: </span>
                              <span className="font-medium">
                                {(requisite.minAmount || 0).toLocaleString()} - {(requisite.maxAmount || 0).toLocaleString()} ₽
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Активные сделки: </span>
                              <span className="font-medium">
                                {requisite.activeDeals || 0}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Общий лимит: </span>
                              <span className="font-medium">
                                {(requisite.currentTotalAmount || 0).toLocaleString()} / {requisite.sumLimit === 0 ? '∞' : (requisite.sumLimit || 0).toLocaleString()} ₽
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Лимит операций: </span>
                              <span className="font-medium">
                                {requisite.operationLimit === 0 ? '∞' : (requisite.operationLimit || 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:flex items-center gap-4">
                      {/* Bank Logo */}
                      <div className="flex-shrink-0">
                        <Image
                          src={`/bank-logos/${getBankLogo(requisite.bankType)}`}
                          alt={requisite.bankType}
                          width={32}
                          height={32}
                          className="object-contain"
                        />
                      </div>

                      {/* Requisite Info */}
                      <div className="flex-1 min-w-0">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <div className="font-medium text-gray-900">
                              {requisite.recipientName}
                            </div>
                            {requisite.device && (
                              <div className="flex items-center gap-1.5">
                                <Smartphone className="h-3.5 w-3.5 text-green-600" />
                                <span className="text-sm text-green-600">
                                  {requisite.device.name}
                                </span>
                              </div>
                            )}
                          </div>
                          {/* Card Number and Method */}
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              {paymentSystem !== "unknown" && (
                                <PaymentSystemIcon system={paymentSystem} />
                              )}
                              <span className="font-semibold text-gray-900">
                                {requisite.cardNumber.replace(/(\d{4})/g, "$1 ").trim()}
                              </span>
                            </div>
                            <span className="text-sm text-gray-600">
                              Метод: {requisite.methodType === 'sbp' ? 'СБП' : requisite.methodType === 'c2c' ? 'C2C' : requisite.methodType || ''}
                            </span>
                          </div>
                        </div>
                      </div>

                    {/* Success Rate */}
                    <div className="flex-shrink-0 text-sm text-gray-600">
                      Успешные сделки: {requisite.successfulDeals || 0}
                    </div>
                    
                    {/* Limits Info - in one column */}
                    <div className="flex-shrink-0 space-y-1 text-sm">
                      <div>
                        <span className="text-gray-600">Лимиты суммы: </span>
                        <span className="font-medium">
                          {(requisite.minAmount || 0).toLocaleString()} - {(requisite.maxAmount || 0).toLocaleString()} ₽
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Активные сделки: </span>
                        <span className="font-medium">
                          {requisite.activeDeals || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Общий лимит: </span>
                        <span className="font-medium">
                          {(requisite.currentTotalAmount || 0).toLocaleString()} / {requisite.sumLimit === 0 ? '∞' : (requisite.sumLimit || 0).toLocaleString()} ₽
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Лимит операций: </span>
                        <span className="font-medium">
                          {requisite.operationLimit === 0 ? '∞' : (requisite.operationLimit || 0)}
                        </span>
                      </div>
                    </div>

                      {/* Status and Actions */}
                      <div className="flex items-center gap-2">
                        <div className="flex-shrink-0 flex items-center gap-2">
                          {requisite.device && (
                            <Badge className={cn(
                              "px-3 py-2",
                              (requisite.device.isWorking ?? requisite.device.isOnline)
                                ? "bg-green-50 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            )}>
                              {(requisite.device.isWorking ?? requisite.device.isOnline)
                                ? "Устройство: в работе"
                                : "Устройство: не в работе"}
                            </Badge>
                          )}
                          <Badge className={cn(
                            "px-3 py-2",
                            requisite.isActive && !requisite.isArchived
                              ? "bg-blue-50 text-blue-700"
                              : "bg-gray-100 text-gray-600"
                          )}>
                            {requisite.isActive ? "Реквизит: активен" : "Реквизит: неактивен"}
                          </Badge>
                          {/* Archive badge removed per new UX */}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setEditingRequisite(requisite);
                              setShowRequisitesSheet(true);
                            }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Редактировать
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleArchive(requisite)}>
                              {requisite.isArchived ? (
                                <>
                                  <Archive className="mr-2 h-4 w-4" />
                                  Разархивировать
                                </>
                              ) : (
                                <>
                                  <Archive className="mr-2 h-4 w-4" />
                                  Архивировать
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(requisite.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Удалить
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>

          {filteredRequisites.length === 0 && (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 mx-auto text-[#006039] mb-4" />
              <p className="text-gray-500">Реквизиты не найдены</p>
            </div>
          )}
        </div>

        {/* Requisites Sheet */}
        <RequisitesSheet
          open={showRequisitesSheet}
          onOpenChange={(open) => {
            setShowRequisitesSheet(open);
            if (!open) {
              setEditingRequisite(null);
            }
          }}
          onSuccess={fetchRequisites}
          existingRequisite={editingRequisite}
          devices={devices}
        />

        {/* Add Requisite Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-2xl max-w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base md:text-lg">Добавить реквизит</DialogTitle>
              <DialogDescription className="text-sm">
                Заполните данные для добавления нового платежного реквизита
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 md:gap-4 py-3 md:py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <Label htmlFor="method">Метод</Label>
                  <Select
                    value={requisiteForm.methodType}
                    onValueChange={(value) =>
                      setRequisiteForm({ ...requisiteForm, methodType: value })
                    }
                  >
                    <SelectTrigger id="method">
                      <SelectValue placeholder="Выберите метод" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="c2c">Карта → Карта</SelectItem>
                      <SelectItem value="sbp">СБП</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="bank">Банк</Label>
                  <Select
                    value={requisiteForm.bankType}
                    onValueChange={(value) =>
                      setRequisiteForm({ ...requisiteForm, bankType: value })
                    }
                  >
                    <SelectTrigger id="bank">
                      <SelectValue placeholder="Выберите банк" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SBERBANK">Сбербанк</SelectItem>
                      <SelectItem value="TBANK">Т-Банк</SelectItem>
                      <SelectItem value="VTB">ВТБ</SelectItem>
                      <SelectItem value="ALFABANK">Альфа-Банк</SelectItem>
                      <SelectItem value="RAIFFEISEN">Райффайзен</SelectItem>
                      <SelectItem value="GAZPROMBANK">Газпромбанк</SelectItem>
                      <SelectItem value="OTPBANK">ОТП Банк</SelectItem>
                      <SelectItem value="OTKRITIE">Открытие</SelectItem>
                      <SelectItem value="ROSBANK">Росбанк</SelectItem>
                      <SelectItem value="PROMSVYAZBANK">Промсвязьбанк</SelectItem>
                      <SelectItem value="SOVCOMBANK">Совкомбанк</SelectItem>
                      <SelectItem value="POCHTABANK">Почта Банк</SelectItem>
                      <SelectItem value="ROSSELKHOZBANK">Россельхозбанк</SelectItem>
                      <SelectItem value="MKB">МКБ</SelectItem>
                      <SelectItem value="URALSIB">Уралсиб</SelectItem>
                      <SelectItem value="AKBARS">Ак Барс</SelectItem>
                      <SelectItem value="SPBBANK">Банк Санкт-Петербург</SelectItem>
                      <SelectItem value="MTSBANK">МТС Банк</SelectItem>
                      <SelectItem value="OZONBANK">Озон Банк</SelectItem>
                      <SelectItem value="RENAISSANCE">Ренессанс</SelectItem>
                      <SelectItem value="AVANGARD">Авангард</SelectItem>
                      <SelectItem value="RNKB">РНКБ</SelectItem>
                      <SelectItem value="LOKOBANK">Локо-Банк</SelectItem>
                      <SelectItem value="RUSSIANSTANDARD">Русский Стандарт</SelectItem>
                      <SelectItem value="HOMECREDIT">Хоум Кредит</SelectItem>
                      <SelectItem value="UNICREDIT">ЮниКредит</SelectItem>
                      <SelectItem value="CITIBANK">Ситибанк</SelectItem>
                      <SelectItem value="BCSBANK">БКС Банк</SelectItem>
                      <SelectItem value="ABSOLUTBANK">Абсолют Банк</SelectItem>
                      <SelectItem value="SVOYBANK">Свой Банк</SelectItem>
                      <SelectItem value="TRANSKAPITALBANK">Транскапиталбанк</SelectItem>
                      <SelectItem value="MTSMONEY">МТС Деньги</SelectItem>
                      <SelectItem value="FORABANK">Фора-Банк</SelectItem>
                      <SelectItem value="CREDITEUROPE">Кредит Европа</SelectItem>
                      <SelectItem value="BBRBANK">ББР Банк</SelectItem>
                      <SelectItem value="UBRIR">УБРиР</SelectItem>
                      <SelectItem value="GENBANK">Генбанк</SelectItem>
                      <SelectItem value="SINARA">Синара</SelectItem>
                      <SelectItem value="VLADBUSINESSBANK">Владбизнесбанк</SelectItem>
                      <SelectItem value="TAVRICHESKIY">Таврический</SelectItem>
                      <SelectItem value="DOLINSK">Долинск</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <Label htmlFor="cardNumber" className="text-sm">Номер карты</Label>
                  <Input
                    id="cardNumber"
                    placeholder="0000 0000 0000 0000"
                    value={requisiteForm.cardNumber}
                    onChange={(e) =>
                      setRequisiteForm({
                        ...requisiteForm,
                        cardNumber: e.target.value,
                      })
                    }
                    className="text-sm md:text-base"
                  />
                </div>

                <div>
                  <Label htmlFor="phoneNumber" className="text-sm">Номер телефона</Label>
                  <Input
                    id="phoneNumber"
                    placeholder="+7 900 000 00 00"
                    value={requisiteForm.phoneNumber}
                    onChange={(e) =>
                      setRequisiteForm({
                        ...requisiteForm,
                        phoneNumber: e.target.value,
                      })
                    }
                    className="text-sm md:text-base"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="recipientName" className="text-sm">Имя получателя</Label>
                <Input
                  id="recipientName"
                  placeholder="Иван Иванович И."
                  value={requisiteForm.recipientName}
                  onChange={(e) =>
                    setRequisiteForm({
                      ...requisiteForm,
                      recipientName: e.target.value,
                    })
                  }
                  className="text-sm md:text-base"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <Label htmlFor="minAmount" className="text-sm">Мин. сумма транзакции</Label>
                  <Input
                    id="minAmount"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={requisiteForm.minAmount}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "");
                      setRequisiteForm({
                        ...requisiteForm,
                        minAmount: digitsOnly,
                      });
                    }}
                    className="text-sm md:text-base"
                  />
                </div>

                <div>
                  <Label htmlFor="maxAmount" className="text-sm">Макс. сумма транзакции</Label>
                  <Input
                    id="maxAmount"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={requisiteForm.maxAmount}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "");
                      setRequisiteForm({
                        ...requisiteForm,
                        maxAmount: digitsOnly,
                      });
                    }}
                    className="text-sm md:text-base"
                  />
                </div>
                <div>
                  <Label htmlFor="trafficPreference" className="text-sm">Тип трафика</Label>
                  <Select
                    value={requisiteForm.trafficPreference}
                    onValueChange={(value) =>
                      setRequisiteForm({ ...requisiteForm, trafficPreference: value as any })
                    }
                  >
                    <SelectTrigger id="trafficPreference">
                      <SelectValue placeholder="Выберите тип" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ANY">Любой</SelectItem>
                      <SelectItem value="PRIMARY">Первичный</SelectItem>
                      <SelectItem value="SECONDARY">Вторичный</SelectItem>
                      <SelectItem value="VIP">VIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>



              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <Label htmlFor="operationLimit" className="text-sm">Лимит операций (всего)</Label>
                  <Input
                    id="operationLimit"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={requisiteForm.operationLimit}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "");
                      setRequisiteForm({
                        ...requisiteForm,
                        operationLimit: digitsOnly,
                      });
                    }}
                    placeholder="0 = без ограничений"
                    className="text-sm md:text-base"
                  />
                </div>

                <div>
                  <Label htmlFor="sumLimit" className="text-sm">Лимит общей суммы (₽)</Label>
                  <Input
                    id="sumLimit"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={requisiteForm.sumLimit}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "");
                      setRequisiteForm({
                        ...requisiteForm,
                        sumLimit: digitsOnly,
                      });
                    }}
                    placeholder="0 = без ограничений"
                    className="text-sm md:text-base"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowAddDialog(false)}
                className="w-full sm:w-auto"
              >
                Отмена
              </Button>
              <Button
                className="bg-[#006039] hover:bg-[#006039]/90 w-full sm:w-auto"
                onClick={handleCreateRequisite}
                disabled={addingRequisite}
              >
                {addingRequisite && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Добавить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </AuthLayout>
    </ProtectedRoute>
  );
}
