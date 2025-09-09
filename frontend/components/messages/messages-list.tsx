"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
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
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { traderApi } from "@/services/api";
import { toast } from "sonner";
import { useTraderAuth } from "@/stores/auth";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  LogOut,
  User,
  Search,
  Mail,
  MailOpen,
  AlertCircle,
  Info,
  CheckCircle,
  Clock,
  Calendar,
  X,
  ArrowUpDown,
  SlidersHorizontal,
  CreditCard,
  Smartphone,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  title: string;
  content: string;
  type: "info" | "warning" | "success" | "system";
  isRead: boolean;
  createdAt: string;
  from: string;
  category: string;
}

export function MessagesList() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [teamEnabled, setTeamEnabled] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [filterMessageType, setFilterMessageType] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterAmount, setFilterAmount] = useState({ exact: "", min: "", max: "" });
  const [filterAmountType, setFilterAmountType] = useState("range");
  const [filterDevice, setFilterDevice] = useState("all");
  const [filterRequisite, setFilterRequisite] = useState("all");

  const router = useRouter();
  const logout = useTraderAuth((state) => state.logout);

  useEffect(() => {
    fetchTraderProfile();
    // Mock messages
    setMessages([
      {
        id: "1",
        title: "Новые условия работы с мерчантами",
        content:
          "Уважаемые трейдеры! С 1 августа вступают в силу новые условия работы с мерчантами. Основные изменения: \n\n1. Комиссия за обработку платежей снижена до 1.5%\n2. Минимальная сумма транзакции - 500 рублей\n3. Максимальный лимит на одну транзакцию - 300 000 рублей\n\nПодробнее ознакомьтесь с условиями в разделе Документы.",
        type: "info",
        isRead: false,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        from: "Администрация",
        category: "Новости",
      },
      {
        id: "2",
        title: "Успешное подключение мерчанта Apple Store",
        content:
          "Мерчант Apple Store успешно подключен к вашему аккаунту. Теперь вы можете принимать платежи от этого мерчанта.",
        type: "success",
        isRead: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        from: "Система",
        category: "Мерчанты",
      },
      {
        id: "3",
        title: "Внимание! Плановые технические работы",
        content:
          "3 августа с 02:00 до 04:00 МСК будут проводиться плановые технические работы. В это время возможны перебои в работе сервиса. Приносим извинения за возможные неудобства.",
        type: "warning",
        isRead: false,
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        from: "Техническая поддержка",
        category: "Система",
      },
      {
        id: "4",
        title: "Отчет за июль 2024",
        content:
          "Доступен ежемесячный отчет за июль 2024. Общая сумма транзакций: 2 345 000 руб. Количество транзакций: 458. Комиссия: 35 175 руб.",
        type: "info",
        isRead: true,
        createdAt: new Date(Date.now() - 259200000).toISOString(),
        from: "Бухгалтерия",
        category: "Отчеты",
      },
      {
        id: "5",
        title: "Новый реквизит активирован",
        content:
          "Реквизит 'Основная карта' (Сбербанк) успешно активирован и готов к использованию.",
        type: "success",
        isRead: false,
        createdAt: new Date(Date.now() - 345600000).toISOString(),
        from: "Система",
        category: "Реквизиты",
      },
      {
        id: "6",
        title: "Обновление правил AML",
        content:
          "Обновлены правила AML-контроля. Теперь все транзакции свыше 100 000 рублей требуют дополнительной верификации. Подробнее в разделе Документы.",
        type: "warning",
        isRead: true,
        createdAt: new Date(Date.now() - 432000000).toISOString(),
        from: "Комплаенс",
        category: "Правила",
      },
      {
        id: "7",
        title: "Приглашение на вебинар",
        content:
          "Приглашаем вас на вебинар 'Оптимизация работы с мерчантами', который состоится 10 августа в 15:00 МСК. Ссылка на регистрацию: webinar.chase.io/optimization",
        type: "info",
        isRead: false,
        createdAt: new Date(Date.now() - 518400000).toISOString(),
        from: "Обучение",
        category: "Мероприятия",
      },
      {
        id: "8",
        title: "Лимит на вывод средств увеличен",
        content:
          "Поздравляем! Ваш ежедневный лимит на вывод средств увеличен до 1 000 000 рублей. Месячный лимит составляет 10 000 000 рублей.",
        type: "success",
        isRead: true,
        createdAt: new Date(Date.now() - 604800000).toISOString(),
        from: "Финансовый отдел",
        category: "Лимиты",
      },
    ]);
  }, []);

  const fetchTraderProfile = async () => {
    try {
      const response = await traderApi.getProfile();
      setUserEmail(response.email || "trader@example.com");
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      setUserEmail("trader@example.com");
    }
  };

  const handleLogout = () => {
    logout();
    if (typeof window !== "undefined") {
      localStorage.removeItem("trader-auth");
    }
    router.push("/trader/login");
  };

  const markAsRead = (id: string) => {
    setMessages(
      messages.map((msg) => (msg.id === id ? { ...msg, isRead: true } : msg)),
    );
  };

  const openMessage = (message: Message) => {
    markAsRead(message.id);
    setSelectedMessage(message);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "system":
        return <Info className="h-5 w-5 text-gray-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getFilteredMessages = () => {
    let filtered = [...messages];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (msg) =>
          msg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          msg.content.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Category filter
    if (filterCategory !== "all") {
      filtered = filtered.filter((msg) => msg.category === filterCategory);
    }

    // Message type filter
    if (filterMessageType !== "all") {
      // For demo purposes, we'll map some existing messages to these types
      // In a real app, you'd have a messageType field on the Message interface
      switch (filterMessageType) {
        case "deposit":
          filtered = filtered.filter(
            (msg) =>
              msg.title.includes("зачисление") || msg.title.includes("средств"),
          );
          break;
        case "card_block":
          filtered = filtered.filter(
            (msg) => msg.title.includes("карт") || msg.title.includes("блок"),
          );
          break;
        case "other":
          filtered = filtered.filter((msg) => msg.category === "Система");
          break;
        // Add more mappings as needed
      }
    }

    // Date filter
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom);
      filtered = filtered.filter((msg) => new Date(msg.createdAt) >= fromDate);
    }
    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((msg) => new Date(msg.createdAt) <= toDate);
    }

    // Amount filter (for demo, we'll extract numbers from message content)
    if (filterAmountType === "exact" && filterAmount.exact) {
      const exactAmount = parseFloat(filterAmount.exact);
      filtered = filtered.filter((msg) => {
        const amounts = msg.content.match(/(\d+(?:\s\d{3})*)/g);
        return amounts && amounts.some(amount => 
          parseFloat(amount.replace(/\s/g, '')) === exactAmount
        );
      });
    } else if (filterAmountType === "range") {
      if (filterAmount.min) {
        const minAmount = parseFloat(filterAmount.min);
        filtered = filtered.filter((msg) => {
          const amounts = msg.content.match(/(\d+(?:\s\d{3})*)/g);
          return amounts && amounts.some(amount => 
            parseFloat(amount.replace(/\s/g, '')) >= minAmount
          );
        });
      }
      if (filterAmount.max) {
        const maxAmount = parseFloat(filterAmount.max);
        filtered = filtered.filter((msg) => {
          const amounts = msg.content.match(/(\d+(?:\s\d{3})*)/g);
          return amounts && amounts.some(amount => 
            parseFloat(amount.replace(/\s/g, '')) <= maxAmount
          );
        });
      }
    }

    // Device filter (for demo, we'll use message source)
    if (filterDevice !== "all") {
      if (filterDevice === "1") {
        filtered = filtered.filter((msg) => msg.from === "Система" || msg.from === "Администрация");
      } else {
        filtered = filtered.filter((msg) => msg.from === "Техническая поддержка");
      }
    }

    // Requisite filter (for demo, we'll use category)
    if (filterRequisite !== "all") {
      if (filterRequisite === "1") {
        filtered = filtered.filter((msg) => msg.category === "Реквизиты" || msg.category === "Новости");
      } else {
        filtered = filtered.filter((msg) => msg.category === "Отчеты");
      }
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
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

    return filtered;
  };

  const filteredMessages = getFilteredMessages();

  const categories = Array.from(new Set(messages.map((m) => m.category)));
  const unreadCount = messages.filter((m) => !m.isRead).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Сообщения
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-red-50 text-red-600 border-0">
                {unreadCount} новых
              </Badge>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Team toggle */}
          <Button
            variant="ghost"
            className="text-sm font-normal text-gray-600 hover:text-gray-900 hover:bg-black/5 transition-colors"
          >
            Команда {teamEnabled ? "включена" : "выключена"}
            <ChevronDown className="ml-1 h-4 w-4 text-[#006039]" />
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 text-sm font-normal hover:bg-black/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-[#006039]" />
                  </div>
                  <span className="text-gray-700">{userEmail}</span>
                </div>
                <ChevronDown className="h-4 w-4 text-[#006039]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 focus:text-red-600 hover:bg-gray-50 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4 text-[#006039]" />
                Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#006039] h-4 w-4" />
          <Input
            placeholder="Поиск по тексту сообщения..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border border-gray-300 rounded-lg"
          />
        </div>

        {/* Sort */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="default" className="gap-2">
              <ArrowUpDown className="h-4 w-4 text-[#006039]" />
              Сортировка
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Сортировать</h4>
              <div className="space-y-1">
                <Button
                  variant={sortBy === "newest" ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setSortBy("newest")}
                >
                  Сначала новые
                </Button>
                <Button
                  variant={sortBy === "oldest" ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setSortBy("oldest")}
                >
                  Сначала старые
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Filters */}
        <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="default" className="gap-2">
              <SlidersHorizontal className="h-4 w-4 text-[#006039]" />
              Фильтры
              {(filterMessageType !== "all" || filterCategory !== "all" || filterDateFrom || filterDateTo || filterAmount.exact || filterAmount.min || filterAmount.max || filterDevice !== "all" || filterRequisite !== "all") && (
                <Badge className="ml-1 bg-[#006039] text-white">
                  {
                    [
                      filterMessageType !== "all",
                      filterCategory !== "all",
                      filterDateFrom || filterDateTo,
                      filterAmount.exact || filterAmount.min || filterAmount.max,
                      filterDevice !== "all",
                      filterRequisite !== "all"
                    ].filter(Boolean).length
                  }
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-96">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Фильтры</h4>

              {/* Message Type Filter */}
              <div className="space-y-2">
                <Label className="text-sm">Тип сообщения</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between"
                    >
                      {filterMessageType === "all"
                        ? "Все типы"
                        : filterMessageType === "deposit"
                          ? "Зачисление средств"
                          : filterMessageType === "deposit_no_deal"
                            ? "Депозит без сделки"
                            : filterMessageType === "unknown_requisite"
                              ? "Зачисление на неизвестный реквизит"
                              : filterMessageType === "other"
                                ? "Прочее"
                                : filterMessageType === "card_block"
                                  ? "Блок карты"
                                  : filterMessageType === "banking_block"
                                    ? "Блок банкинга"
                                    : filterMessageType === "push_transition"
                                      ? "Переход на пуши"
                                      : filterMessageType === "number_unlinked"
                                        ? "Номер отвязан"
                                        : "Компрометация"}
                      <ChevronDown className="h-4 w-4 opacity-50 text-[#006039]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="start">
                    <div className="max-h-64 overflow-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterMessageType("all")}
                      >
                        Все типы
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterMessageType("deposit")}
                      >
                        Зачисление средств
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterMessageType("deposit_no_deal")}
                      >
                        Депозит без сделки
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() =>
                          setFilterMessageType("unknown_requisite")
                        }
                      >
                        Зачисление на неизвестный реквизит
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterMessageType("other")}
                      >
                        Прочее
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterMessageType("card_block")}
                      >
                        Блок карты
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterMessageType("banking_block")}
                      >
                        Блок банкинга
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterMessageType("push_transition")}
                      >
                        Переход на пуши
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterMessageType("number_unlinked")}
                      >
                        Номер отвязан
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterMessageType("compromise")}
                      >
                        Компрометация
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label className="text-sm">Дата создания</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="date-from" className="text-xs text-gray-500">От</Label>
                    <Input
                      id="date-from"
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="date-to" className="text-xs text-gray-500">До</Label>
                    <Input
                      id="date-to"
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
              
              {/* Amount Filter */}
              <div className="space-y-2">
                <Label className="text-sm">Сумма</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="amount-exact"
                      checked={filterAmountType === "exact"}
                      onChange={() => setFilterAmountType("exact")}
                      className="h-4 w-4 text-[#006039]"
                    />
                    <Label htmlFor="amount-exact" className="text-sm font-normal">Точное значение</Label>
                  </div>
                  {filterAmountType === "exact" && (
                    <Input
                      type="number"
                      placeholder="Введите сумму"
                      value={filterAmount.exact}
                      onChange={(e) => setFilterAmount({ ...filterAmount, exact: e.target.value })}
                      className="ml-6"
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="amount-range"
                      checked={filterAmountType === "range"}
                      onChange={() => setFilterAmountType("range")}
                      className="h-4 w-4 text-[#006039]"
                    />
                    <Label htmlFor="amount-range" className="text-sm font-normal">Диапазон</Label>
                  </div>
                  {filterAmountType === "range" && (
                    <div className="flex gap-2 ml-6">
                      <Input
                        type="number"
                        placeholder="От"
                        value={filterAmount.min}
                        onChange={(e) => setFilterAmount({ ...filterAmount, min: e.target.value })}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="До"
                        value={filterAmount.max}
                        onChange={(e) => setFilterAmount({ ...filterAmount, max: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Device Filter */}
              <div className="space-y-2">
                <Label className="text-sm">Устройства</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-between">
                      {filterDevice === "all" ? "Все устройства" : 
                       filterDevice === "1" ? "Chrome на Windows" : "Safari на iPhone"}
                      <ChevronDown className="h-4 w-4 opacity-50 text-[#006039]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0" align="start">
                    <div className="max-h-64 overflow-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterDevice("all")}
                      >
                        Все устройства
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterDevice("1")}
                      >
                        <Smartphone className="mr-2 h-4 w-4 text-[#006039]" />
                        Chrome на Windows
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterDevice("2")}
                      >
                        <Smartphone className="mr-2 h-4 w-4 text-[#006039]" />
                        Safari на iPhone
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Requisite Filter */}
              <div className="space-y-2">
                <Label className="text-sm">Реквизиты</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-between">
                      {filterRequisite === "all" ? "Все реквизиты" : 
                       filterRequisite === "1" ? "Основная карта" : "Резервная карта"}
                      <ChevronDown className="h-4 w-4 opacity-50 text-[#006039]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0" align="start">
                    <div className="max-h-64 overflow-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterRequisite("all")}
                      >
                        Все реквизиты
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterRequisite("1")}
                      >
                        <CreditCard className="mr-2 h-4 w-4 text-[#006039]" />
                        Основная карта (Сбербанк)
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilterRequisite("2")}
                      >
                        <CreditCard className="mr-2 h-4 w-4 text-[#006039]" />
                        Резервная карта (Тинькофф)
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Category Filter */}
              <div className="space-y-2">
                <Label className="text-sm">Категория</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={filterCategory === "all" ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setFilterCategory("all")}
                  >
                    Все
                  </Button>
                  {categories.map((cat) => (
                    <Button
                      key={cat}
                      variant={filterCategory === cat ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setFilterCategory(cat)}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setFilterMessageType("all");
                    setFilterCategory("all");
                    setFilterDateFrom("");
                    setFilterDateTo("");
                    setFilterAmount({ exact: "", min: "", max: "" });
                    setFilterAmountType("range");
                    setFilterDevice("all");
                    setFilterRequisite("all");
                  }}
                >
                  Сбросить все
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-[#006039] hover:bg-[#006039]/90"
                  onClick={() => setFiltersOpen(false)}
                >
                  Применить фильтры
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Messages list */}
      <Card className="overflow-hidden flex-1">
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="divide-y divide-gray-100">
            {filteredMessages.length === 0 ? (
              <div className="p-12 text-center">
                <Mail className="h-12 w-12 mx-auto text-[#006039] mb-4" />
                <p className="text-gray-500">Нет сообщений</p>
              </div>
            ) : (
              filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "p-4 hover:bg-gray-50/50 cursor-pointer transition-colors",
                    !message.isRead && "bg-blue-50/30",
                  )}
                  onClick={() => openMessage(message)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {message.isRead ? (
                        <MailOpen className="h-5 w-5 text-[#006039]" />
                      ) : (
                        <Mail className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3
                              className={cn(
                                "text-sm font-medium",
                                !message.isRead
                                  ? "text-gray-900"
                                  : "text-gray-600",
                              )}
                            >
                              {message.title}
                            </h3>
                            {getIcon(message.type)}
                          </div>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {message.content}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span>{message.from}</span>
                            <span>•</span>
                            <span>{message.category}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-[#006039]" />
                              {format(
                                new Date(message.createdAt),
                                "dd.MM.yyyy HH:mm",
                                { locale: ru },
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Message dialog */}
      <Dialog
        open={!!selectedMessage}
        onOpenChange={() => setSelectedMessage(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="flex items-center gap-2">
                  {selectedMessage?.title}
                  {selectedMessage && getIcon(selectedMessage.type)}
                </DialogTitle>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span>{selectedMessage?.from}</span>
                  <span>•</span>
                  <span>{selectedMessage?.category}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-[#006039]" />
                    {selectedMessage &&
                      format(
                        new Date(selectedMessage.createdAt),
                        "dd MMMM yyyy, HH:mm",
                        { locale: ru },
                      )}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedMessage(null)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4 text-[#006039]" />
              </Button>
            </div>
          </DialogHeader>
          <div className="mt-4">
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-gray-700">
                {selectedMessage?.content}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
