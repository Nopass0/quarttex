"use client";

import { useState, useEffect } from "react";
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { traderApi } from "@/services/api";
import { toast } from "sonner";
import { useTraderAuth } from "@/stores/auth";
import { useRouter } from "next/navigation";
import { TraderHeader } from "@/components/trader/trader-header";
import {
  Loader2,
  MoreVertical,
  ChevronDown,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  Smartphone,
  MessageSquare,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  numericId: number;
  sender: string;
  text: string;
  timestamp: string;
  deviceId?: string;
  deviceName?: string;
  amount?: number;
  currency?: string;
  status: "processed" | "warning" | "danger" | "new";
  isNew?: boolean;
}

const statusConfig = {
  processed: {
    label: "Обработано",
    icon: "✓",
    iconColor: "text-[#006039]",
    borderColor: "border-[#006039]/20",
    bgColor: "bg-[#006039]/5",
  },
  warning: {
    label: "Без сделки",
    icon: "?",
    iconColor: "text-orange-500",
    borderColor: "border-orange-200",
    bgColor: "bg-orange-50",
  },
  danger: {
    label: "Без реквизита",
    icon: "!",
    iconColor: "text-red-500",
    borderColor: "border-red-200",
    bgColor: "bg-red-50",
  },
  new: {
    label: "Новое",
    icon: "●",
    iconColor: "text-blue-500",
    borderColor: "border-blue-200",
    bgColor: "bg-blue-50",
  },
};

const mockMessages: Message[] = [
  {
    id: "90330583",
    numericId: 90330583,
    sender: "ru.vtb24.mobilebanking.android",
    text: "ВТБ Онлайн | Оплата 412р Карта*7650 YANDEX*4121*TAX Баланс 23636.53р 21:10",
    timestamp: "2025-07-08T21:10:00",
    deviceId: "9d309ffc-2b7d-412d-ace7-d0f21841ba4d",
    deviceName: "9090",
    amount: 0,
    currency: "RUB",
    status: "processed",
  },
  {
    id: "90305917",
    numericId: 90305917,
    sender: "ru.vtb24.mobilebanking.android",
    text: "ВТБ Онлайн | Оплата 519р Карта*7650 YANDEX*4121*TAX Баланс 24048.53р 18:02",
    timestamp: "2025-07-08T18:02:00",
    deviceId: "9d309ffc-2b7d-412d-ace7-d0f21841ba4d",
    deviceName: "9090",
    amount: 0,
    currency: "RUB",
    status: "processed",
  },
  {
    id: "90305526",
    numericId: 90305526,
    sender: "ru.vtb24.mobilebanking.android",
    text: "Вы приглашаете — мы платим | Советуйте близким получать пенсию в ВТБ! Для них — 1 000 ₽ и особые условия от банка за перевод пенсии, для вас — вознаграждение до 10 000 ₽ в месяц. Узнать ваш уникальный промокод можно в ВТБ Онлайн. Делитесь промокодом с близкими и знакомыми, а они укажут его в заявлении на перевод пенсии.",
    timestamp: "2025-07-08T17:58:00",
    deviceId: "9d309ffc-2b7d-412d-ace7-d0f21841ba4d",
    deviceName: "9090",
    amount: 0,
    currency: "RUB",
    status: "processed",
  },
  {
    id: "90154099",
    numericId: 90154099,
    sender: "ru.vtb24.mobilebanking.android",
    text: "ВТБ Онлайн | Поступление 30000р Счет*5715 от АНИ Н. Баланс 30053.47р 22:42",
    timestamp: "2025-07-07T22:42:00",
    deviceId: "9d309ffc-2b7d-412d-ace7-d0f21841ba4d",
    deviceName: "9090",
    amount: 30000,
    currency: "RUB",
    status: "danger",
  },
  {
    id: "90100966",
    numericId: 90100966,
    sender: "T-Bank",
    text: "Пополнение, счет RUB. 4000 RUB. Анастасия В. Доступно 4142 RUB",
    timestamp: "2025-07-07T19:27:00",
    deviceId: "6884a2e4-aa34-4057-9ba8-48c11ce19893",
    deviceName: "ВТБ счет",
    amount: 4000,
    currency: "RUB",
    status: "danger",
  },
  {
    id: "89822333",
    numericId: 89822333,
    sender: "ru.vtb24.mobilebanking.android",
    text: "ВТБ Онлайн | Поступление 55р Счет*0347 от Михаил Р. Баланс 143р 18:33",
    timestamp: "2025-07-06T18:33:00",
    deviceId: "6884a2e4-aa34-4057-9ba8-48c11ce19893",
    deviceName: "ВТБ счет",
    amount: 55,
    currency: "RUB",
    status: "warning",
  },
];

export function MessagesList() {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>(mockMessages);
  const [loading, setLoading] = useState(false);
  const [searchId, setSearchId] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const router = useRouter();

  useEffect(() => {
    let filtered = messages;

    if (searchId) {
      filtered = filtered.filter(msg => 
        msg.id.includes(searchId) || 
        msg.numericId.toString().includes(searchId)
      );
    }

    // Sort by timestamp
    filtered.sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return sortOrder === "newest" 
        ? dateB.getTime() - dateA.getTime()
        : dateA.getTime() - dateB.getTime();
    });

    setFilteredMessages(filtered);
  }, [messages, searchId, sortOrder]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === now.toDateString()) {
      return `Сегодня в ${format(date, "HH:mm")}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Вчера в ${format(date, "HH:mm")}`;
    } else {
      return format(date, "d MMMM yyyy г., в HH:mm", { locale: ru });
    }
  };

  const handleMessageClick = (message: Message) => {
    setSelectedMessage(message);
    setShowDialog(true);
  };

  const clearSearch = () => {
    setSearchId("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TraderHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Сообщения</h1>
        </div>

        {/* Filters Section */}
        <Card className="p-6 mb-6">
          {/* Search by ID */}
          <div className="mb-6">
            <div className="text-sm font-medium text-gray-700 mb-3">
              Поиск по id сообщений
            </div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                placeholder="Id сообщения"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="pl-10 pr-20"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                >
                  <Search className="h-4 w-4 text-gray-400" />
                </Button>
                {searchId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={clearSearch}
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Filters */}
          <div className="hidden md:block">
            <div className="flex items-center justify-between">
              {/* Parameters */}
              <div className="flex items-center gap-4">
                <div className="text-sm font-medium text-gray-700">
                  Параметры поиска
                </div>
                <Button variant="outline" className="h-9">
                  <SlidersHorizontal className="h-4 w-4 mr-2 text-[#006039]" />
                  <span className="text-gray-500">Не выбраны</span>
                  <ChevronDown className="h-4 w-4 ml-2 text-gray-400" />
                </Button>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-700">
                  Сортировка результатов
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9">
                      <ArrowUpDown className="h-4 w-4 mr-2 text-[#006039]" />
                      <span>
                        {sortOrder === "newest" ? "Сначала новые" : "Сначала старые"}
                      </span>
                      <ChevronDown className="h-4 w-4 ml-2 text-gray-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => setSortOrder("newest")}
                      className={sortOrder === "newest" ? "bg-gray-100" : ""}
                    >
                      Сначала новые
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setSortOrder("oldest")}
                      className={sortOrder === "oldest" ? "bg-gray-100" : ""}
                    >
                      Сначала старые
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Mobile Sort */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full h-9">
                  <ArrowUpDown className="h-4 w-4 mr-2 text-[#006039]" />
                  <span>
                    {sortOrder === "newest" ? "Сначала новые" : "Сначала старые"}
                  </span>
                  <ChevronDown className="h-4 w-4 ml-2 text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-full">
                <DropdownMenuItem 
                  onClick={() => setSortOrder("newest")}
                  className={sortOrder === "newest" ? "bg-gray-100" : ""}
                >
                  Сначала новые
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setSortOrder("oldest")}
                  className={sortOrder === "oldest" ? "bg-gray-100" : ""}
                >
                  Сначала старые
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Filters Toggle */}
          <div className="md:hidden mt-4">
            <Button
              variant="ghost"
              onClick={() => setShowFilters(!showFilters)}
              className="w-full justify-between"
            >
              <span>Расширенный поиск</span>
              <ChevronDown 
                className={cn(
                  "h-4 w-4 transition-transform text-gray-400",
                  showFilters && "rotate-180"
                )}
              />
            </Button>
          </div>
        </Card>

        {/* Messages List */}
        <div className="space-y-3">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#006039]" />
            </div>
          )}

          {!loading && filteredMessages.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Сообщения не найдены
            </div>
          )}

          {!loading && filteredMessages.map((message) => {
            const status = statusConfig[message.status];
            return (
              <Card
                key={message.id}
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors border border-gray-200"
                onClick={() => handleMessageClick(message)}
              >
                <div className="flex items-start gap-4">
                  {/* Status Icon */}
                  <div className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center text-lg font-semibold",
                    status.bgColor,
                    status.borderColor,
                    "border"
                  )}>
                    <MessageSquare className={cn("h-6 w-6", status.iconColor)} />
                  </div>

                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#006039] truncate">
                          {message.sender}
                        </span>
                        <span className="hidden md:block text-xs text-gray-500">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      <div className="md:hidden text-xs text-gray-500">
                        {formatTime(message.timestamp)}
                      </div>
                    </div>

                    {/* Mobile sender and time */}
                    <div className="md:hidden mb-2">
                      <div className="text-xs text-gray-500">
                        {formatTime(message.timestamp)}
                      </div>
                    </div>

                    {/* Message text preview */}
                    <div className="text-sm text-gray-600 line-clamp-2 md:line-clamp-1 mb-2">
                      {message.text}
                    </div>

                    {/* Message details */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {/* Device */}
                        <div className="flex items-center gap-1">
                          <Smartphone className="h-3 w-3 text-orange-500" />
                          <span>{message.deviceName}</span>
                        </div>
                        
                        {/* Message ID */}
                        <div>
                          <span className="text-gray-400">ID:</span> {message.deviceId}
                        </div>
                      </div>

                      {/* Amount/Status */}
                      <div className="flex items-center gap-2">
                        {message.amount !== undefined && (
                          <span className={cn(
                            "text-sm font-medium",
                            message.status === "danger" ? "text-red-600" : 
                            message.status === "warning" ? "text-orange-600" : 
                            "text-[#006039]"
                          )}>
                            {message.amount} {message.currency}
                          </span>
                        )}
                        {message.status === "danger" && (
                          <Badge variant="destructive" className="text-xs">
                            Без реквизита
                          </Badge>
                        )}
                        {message.status === "warning" && (
                          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                            Без сделки
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Load more indicator */}
          {!loading && filteredMessages.length > 0 && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#006039]"></div>
            </div>
          )}
        </div>
      </div>

      {/* Message Detail Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Сообщение ${selectedMessage?.numericId}</DialogTitle>
            <DialogDescription>
              {selectedMessage && formatTime(selectedMessage.timestamp)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedMessage && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Отправитель:</label>
                <p className="text-sm text-gray-900 mt-1">{selectedMessage.sender}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Устройство:</label>
                <p className="text-sm text-gray-900 mt-1">{selectedMessage.deviceName}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Текст сообщения:</label>
                <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                  {selectedMessage.text}
                </p>
              </div>
              
              {selectedMessage.amount !== undefined && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Сумма:</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedMessage.amount} {selectedMessage.currency}
                  </p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-gray-700">Статус:</label>
                <p className="text-sm text-gray-900 mt-1">
                  {statusConfig[selectedMessage.status].label}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}