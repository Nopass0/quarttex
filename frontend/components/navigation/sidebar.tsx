"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DynamicLogo } from "@/components/DynamicLogo";
import { ProjectToggle } from "@/components/ProjectSelector";
import {
  ChevronDown,
  CreditCard,
  FileText,
  LogOut,
  MessageSquare,
  Users,
  Wallet,
  Menu,
  X,
  MoreHorizontal,
  Download,
  AlertCircle,
  Settings,
  Smartphone,
  Receipt,
  TrendingUp,
  BookOpen,
  BarChart3,
  Package,
  Headphones,
  Home,
  TestTube,
  DollarSign,
  Folder,
  Send,
  Clock,
  Trash2,
  PiggyBank,
  Lightbulb,
  Cog,
  Shield,
  Globe,
  Plus,
} from "lucide-react";
 
import { useTraderAuth, useAdminAuth } from "@/stores/auth";
import { useAgentAuth } from "@/stores/agent-auth";
import { useMerchantAuth } from "@/stores/merchant-auth";
import { useAggregatorAuth } from "@/stores/aggregator-auth";
import { useTraderFinancials } from "@/hooks/use-trader-financials";
import { useAggregatorBalance } from "@/hooks/use-aggregator-balance";
import { toast } from "sonner";
import { TelegramConnectModal } from "@/components/trader/telegram-connect-modal";
import { IdeaModal } from "@/components/trader/idea-modal";
import { ThemeSwitcher } from "@/components/ui/theme-toggle";
import { useRapiraRate } from "@/hooks/use-rapira-rate";
import { useTraderRate } from "@/hooks/use-trader-rate";
import { traderApi } from "@/services/api";

interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

interface SidebarProps {
  variant: "trader" | "admin" | "agent" | "merchant" | "aggregator";
}

const traderNavItems: NavItem[] = [
  {
    title: "Главная",
    href: "/trader/dashboard",
    icon: Home,
  },
  {
    title: "Классический вход",
    href: "/trader/devices",
    icon: Folder,
    children: [
      {
        title: "Устройства",
        href: "/trader/devices",
        icon: Smartphone,
      },
      {
        title: "Реквизиты",
        href: "/trader/requisites",
        icon: CreditCard,
      },
      {
        title: "Сделки",
        href: "/trader/classic-deals",
        icon: FileText,
      },
      {
        title: "Сообщения",
        href: "/trader/messages",
        icon: MessageSquare,
      },
    ],
  },
  {
    title: "БТ-Вход",
    href: "/trader/bt-entrance",
    icon: AlertCircle,
  },
  {
    title: "Сделки",
    href: "/trader/deals",
    icon: FileText,
    children: [
      {
        title: "Классический вход",
        href: "/trader/deals?tab=classic",
        icon: FileText,
      },
      {
        title: "БТ вход",
        href: "/trader/deals?tab=bt",
        icon: AlertCircle,
      },
      {
        title: "Все",
        href: "/trader/deals?tab=all",
        icon: FileText,
      },
    ],
  },

  {
    title: "Выплаты",
    href: "/trader/payouts",
    icon: DollarSign,
  },
  {
    title: "Финансы",
    href: "/trader/finances",
    icon: Wallet,
  },
  {
    title: "Споры",
    icon: AlertCircle,
    children: [
      {
        title: "Сделки",
        href: "/trader/disputes/deals",
        icon: FileText,
      },
      {
        title: "Выплаты",
        href: "/trader/disputes/payouts",
        icon: DollarSign,
      },
    ],
  },
  {
    title: "Папки",
    href: "/trader/folders",
    icon: Folder,
  },
  {
    title: "Настройки",
    href: "/trader/settings",
    icon: Settings,
  },
];

const adminNavItems: NavItem[] = [
  {
    title: "Аккаунты",
    icon: Users,
    children: [
      {
        title: "Трейдеры",
        href: "/admin/traders",
        icon: Users,
      },
      {
        title: "Агенты",
        href: "/admin/agents",
        icon: Users,
      },
      {
        title: "Агрегаторы",
        href: "/admin/aggregators",
        icon: Globe,
      },
      {
        title: "Мерчанты",
        href: "/admin/merchants",
        icon: CreditCard,
      },
    ],
  },
  {
    title: "Транзакции",
    icon: CreditCard,
    children: [
      {
        title: "Сделки",
        href: "/admin/deals",
        icon: FileText,
      },
      {
        title: "Выплаты",
        href: "/admin/payouts",
        icon: DollarSign,
      },
      {
        title: "Споры",
        href: "/admin/disputes",
        icon: AlertCircle,
      },
    ],
  },
  {
    title: "Финансы",
    icon: Wallet,
    children: [
      {
        title: "Депозиты",
        href: "/admin/deposits",
        icon: PiggyBank,
      },
      {
        title: "Депозиты агрегаторов",
        href: "/admin/aggregator-deposits",
        icon: Wallet,
      },
      {
        title: "Выводы",
        href: "/admin/withdrawals",
        icon: Download,
      },
      {
        title: "Методы платежей",
        href: "/admin/methods",
        icon: Wallet,
      },
      {
        title: "Настройки курса",
        href: "/admin/rate-sources",
        icon: TrendingUp,
      },
      {
        title: "Запросы на Settle",
        href: "/admin/settle-requests",
        icon: Wallet,
      },
    ],
  },
  {
    title: "Техническое",
    icon: Settings,
    children: [
      {
        title: "Бот по спорам",
        href: "/admin/bot-disputes",
        icon: Send,
      },
      {
        title: "Системные настройки",
        href: "/admin/system-settings",
        icon: Cog,
      },
      {
        title: "Сервисы",
        href: "/admin/services",
        icon: Settings,
      },
      {
        title: "Приложения",
        href: "/admin/applications",
        icon: Package,
      },
    ],
  },
  {
    title: "Метрики",
    href: "/admin/metrics",
    icon: BarChart3,
  },
  {
    title: "Устройства",
    href: "/admin/devices",
    icon: Smartphone,
  },
  {
    title: "Идеи",
    href: "/admin/ideas",
    icon: Lightbulb,
  },
];

const agentNavItems: NavItem[] = [
  {
    title: "Обзор",
    href: "/agent",
    icon: TrendingUp,
  },
  {
    title: "Команда",
    href: "/agent/team",
    icon: Users,
  },
  {
    title: "Заработок",
    href: "/agent/earnings",
    icon: Wallet,
  },
  {
    title: "История выплат",
    href: "/agent/payouts",
    icon: Receipt,
  },
  {
    title: "Настройки",
    href: "/agent/settings",
    icon: Settings,
  },
];

const merchantNavItems: NavItem[] = [
  {
    title: "Транзакции",
    href: "/merchant/transactions",
    icon: BarChart3,
  },
  {
    title: "Споры",
    href: "/merchant/disputes",
    icon: AlertCircle,
  },
  {
    title: "Безопасность",
    href: "/merchant/security",
    icon: Shield,
  },
  {
    title: "API документация",
    icon: BookOpen,
    children: [
      {
        title: "Обзор",
        href: "/merchant/api-docs",
        icon: FileText,
      },
      {
        title: "Основные методы",
        href: "/merchant/api-docs/basic",
        icon: FileText,
      },
      {
        title: "Транзакции",
        href: "/merchant/api-docs/transactions",
        icon: FileText,
      },
      {
        title: "Чеки",
        href: "/merchant/api-docs/receipts",
        icon: Receipt,
      },
      {
        title: "Webhooks",
        href: "/merchant/api-docs/webhooks",
        icon: FileText,
      },
      {
        title: "Примеры кода",
        href: "/merchant/api-docs/examples",
        icon: FileText,
      },
    ],
  },
];

const aggregatorNavItems: NavItem[] = [
  {
    title: "Главная",
    href: "/aggregator",
    icon: Home,
  },
  {
    title: "Транзакции",
    href: "/aggregator/transactions",
    icon: CreditCard,
  },
  {
    title: "Пополнения",
    href: "/aggregator/deposits",
    icon: Wallet,
  },
  {
    title: "Споры",
    href: "/aggregator/disputes",
    icon: AlertCircle,
  },
  {
    title: "API документация",
    href: "/aggregator/api-docs",
    icon: BookOpen,
  },
  {
    title: "Настройки",
    href: "/aggregator/settings",
    icon: Settings,
  },
];

export function Sidebar({ variant }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    // Load expanded state from localStorage on initialization
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar-expanded-items");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);
  const [ideaModalOpen, setIdeaModalOpen] = useState(false);
  const [traderProfile, setTraderProfile] = useState<{ numericId: number; email: string } | null>(null);

  // Save expanded state to localStorage when it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar-expanded-items", JSON.stringify(expandedItems));
    }
  }, [expandedItems]);

  // Auto-expand "Классический вход" menu when on related pages
  useEffect(() => {
    if (variant === "trader") {
      const classicEntryPaths = ['/trader/devices', '/trader/requisites', '/trader/classic-deals', '/trader/messages'];
      const shouldExpandClassic = classicEntryPaths.some(path => pathname.startsWith(path));
      
      if (shouldExpandClassic && !expandedItems.includes("Классический вход")) {
        setExpandedItems(prev => [...prev, "Классический вход"]);
      }
    }
  }, [pathname, variant, expandedItems]);

  const traderLogout = useTraderAuth((state) => state.logout);
  const adminAuth = useAdminAuth();
  const adminLogout = adminAuth.logout;
  const adminRole = adminAuth.role;
  const agentAuth = useAgentAuth();
  const agentLogout = agentAuth.logout;
  const agent = agentAuth.agent;
  const merchantAuth = useMerchantAuth();
  const merchantLogout = merchantAuth.logout;
  const merchant = merchantAuth;
  const aggregatorAuth = useAggregatorAuth();
  const aggregatorLogout = aggregatorAuth.logout;
  const aggregator = aggregatorAuth;
  const { financials } = useTraderFinancials();
  const aggregatorBalance = useAggregatorBalance();
  // Для трейдеров используем новый хук, для остальных - старый
  const { rate: traderRate } = useTraderRate();
  
  // Determine rate source for sidebar per role (для не-трейдеров)
  let source: "rapira" | "bybit" = "rapira";
  if (variant === "admin") {
    source = "rapira";
  } else if (variant === "agent") {
    source = "rapira";
  } else if (variant === "merchant") {
    source = "rapira";
  } else if (variant === "aggregator") {
    source = "rapira";
  }
  const { rate: rapiraRate } = useRapiraRate(source as any);

  // Загружаем профиль трейдера
  useEffect(() => {
    if (variant === "trader") {
      const fetchTraderProfile = async () => {
        try {
          const profile = await traderApi.getProfile();
          setTraderProfile({
            numericId: profile.numericId || 0,
            email: profile.email || ""
          });
        } catch (error) {
          console.error("Failed to fetch trader profile:", error);
        }
      };
      fetchTraderProfile();
    }
  }, [variant]);

  // Add Admins link for SUPER_ADMIN only
  const dynamicAdminNavItems = [...adminNavItems];
  if (variant === "admin" && adminRole === "SUPER_ADMIN") {
    dynamicAdminNavItems.push({
      title: "Администраторы",
      href: "/admin/admins",
      icon: Shield,
    });
  }

  const navItems =
    variant === "trader"
      ? traderNavItems
      : variant === "admin"
      ? dynamicAdminNavItems
      : variant === "agent"
      ? agentNavItems
      : variant === "merchant"
      ? merchantNavItems
      : aggregatorNavItems;

  const handleLogout = () => {
    console.log(`Logging out ${variant}`);
    if (variant === "trader") {
      traderLogout();
      // Очищаем localStorage полностью для трейдера
      if (typeof window !== "undefined") {
        localStorage.removeItem("trader-auth");
      }
      router.push("/trader/login");
    } else if (variant === "admin") {
      adminLogout();
      // Очищаем localStorage полностью для админа
      if (typeof window !== "undefined") {
        localStorage.removeItem("admin-auth");
      }
      router.push("/admin/login");
    } else if (variant === "agent") {
      agentLogout();
      router.push("/agent/login");
    } else if (variant === "merchant") {
      merchantLogout();
      router.push("/merchant/login");
    } else if (variant === "aggregator") {
      aggregatorLogout();
      router.push("/aggregator/login");
    }
  };

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  const renderNavItem = (item: NavItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.title);
    const isActive = item.href === pathname;

    return (
      <div key={item.title}>
        <div
          className={cn(
            "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200",
            "text-gray-800 hover:text-gray-950 font-semibold dark:text-[#eeeeee] dark:hover:text-[#eeeeee]",
            isActive
              ? "bg-primary/10 text-primary font-medium border-l-4 border-primary -ml-[1px] dark:bg-primary/10 dark:text-primary dark:border-primary"
              : "hover:bg-gray-50 dark:hover:bg-[#29382f]/20",
            level > 0 && "pl-12"
          )}
        >
          <button
            onClick={() => {
              if (item.href) {
                router.push(item.href);
                setMobileMenuOpen(false);
              } else if (hasChildren) {
                toggleExpanded(item.title);
              }
            }}
            className="flex items-center gap-3 flex-1 text-left"
          >
            <div
              className={cn(
                "flex items-center justify-center w-5 h-5",
                isActive && "text-primary"
              )}
            >
              <item.icon className="h-5 w-5 text-primary dark:text-primary" />
            </div>
            <span className="flex-1 text-left text-sm font-semibold">
              {item.title}
            </span>
          </button>

          

          {/* Expander for items with children */}
          {hasChildren && (
            <button
              className={cn(
                "p-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#29382f]/40",
                isExpanded && "rotate-180"
              )}
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(item.title);
              }}
              aria-label="Развернуть"
            >
              <ChevronDown className="h-4 w-4 text-primary" />
            </button>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children.map((child) => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden md:flex h-screen w-64 sticky top-0 bg-white dark:bg-[#0f0f0f] border-r border-gray-100 dark:border-[#29382f] flex-col">
        <div className="p-6 border-b border-gray-100 dark:border-[#29382f]">
          <div className="flex flex-col items-start gap-3">
            <DynamicLogo size="md" />
            <ProjectToggle />
            {variant === "admin" && (
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Админ-панель
              </span>
            )}
            {variant === "agent" && (
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Кабинет агента
              </span>
            )}
            {variant === "merchant" && (
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Кабинет мерчанта
              </span>
            )}
            {variant === "aggregator" && (
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Кабинет агрегатора
              </span>
            )}
          </div>
        </div>

        {variant === "agent" && agent && (
          <div className="p-4 border-b border-gray-100 dark:border-[#29382f]">
            <div className="space-y-1">
              <div className="text-sm font-medium dark:text-[#eeeeee]">
                {agent.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {agent.email}
              </div>
              <div className="text-xs text-primary dark:text-primary font-medium">
                Комиссия: {agent.commissionRate}%
              </div>
            </div>
          </div>
        )}

        {variant === "merchant" && merchant.merchantName && (
          <div className="p-4 border-b border-gray-100 dark:border-[#29382f]">
            <div className="space-y-1">
              <div className="text-sm font-medium dark:text-[#eeeeee]">
                {merchant.merchantName}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                ID: {merchant.merchantId}
              </div>
            </div>
          </div>
        )}

        {variant === "aggregator" && aggregator.aggregatorName && (
          <div className="p-4 border-b border-gray-100 dark:border-[#29382f]">
            <div className="space-y-2">
              <div className="text-sm font-medium dark:text-[#eeeeee]">
                {aggregator.aggregatorName}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {aggregator.email}
              </div>
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Баланс USDT
                  </div>
                  <div className="text-lg font-bold text-primary dark:text-primary">
                    {aggregatorBalance.toFixed(2)}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary hover:text-white"
                  onClick={() => {
                    // Открываем модальное окно пополнения
                    if (typeof window !== "undefined") {
                      const event = new CustomEvent("openDepositModal");
                      window.dispatchEvent(event);
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => renderNavItem(item))}

          {variant === "trader" && financials && (
            <div className="mt-6 space-y-3 px-3">
              {/* Баланс */}
              <div className="p-4 bg-gray-50 dark:bg-[#29382f]/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Баланс
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold">
                      {(financials.trustBalance || 0).toFixed(2)}
                    </span>
                    <span className="text-xs font-medium text-primary">
                      USDT
                    </span>
                  </div>
                </div>
                {(financials.frozenUsdt || 0) > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Заморожено
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          {(financials.frozenUsdt || 0).toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          USDT
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Депозит */}
              <div className="p-4 bg-gray-50 dark:bg-[#29382f]/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Депозит
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold">
                      {(financials.deposit || 0).toFixed(2)}
                    </span>
                    <span className="text-xs font-medium text-primary">
                      USDT
                    </span>
                  </div>
                </div>
              </div>

              {/* Общая прибыль */}
              <div className="p-4 bg-gray-50 dark:bg-[#29382f]/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Прибыль
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-primary">
                      +
                      {(
                        (financials.profitFromDeals || 0) +
                        (financials.profitFromPayouts || 0)
                      ).toFixed(2)}
                    </span>
                    <span className="text-xs font-medium text-primary">
                      USDT
                    </span>
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Со сделок</span>
                    <span className="text-xs font-medium">
                      +{(financials.profitFromDeals || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">С выплат</span>
                    <span className="text-xs font-medium">
                      +{(financials.profitFromPayouts || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ставка TRC-20 */}
              {(traderRate || rapiraRate) && (
                <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/10 dark:to-primary/5 rounded-lg border-2 border-primary dark:border-primary">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary dark:text-primary" />
                      <span className="text-base font-semibold text-gray-900 dark:text-gray-200">
                        Ставка TRC-20
                      </span>
                    </div>
                    <div className="flex items-center gap-1 pl-7">
                      <span className="text-lg font-bold text-primary dark:text-primary">
                        {traderRate ? traderRate.rate.toFixed(2) : rapiraRate?.rate.toFixed(2)}
                      </span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        ₽/USDT
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Download APK Button */}
              <div className="mt-6 p-3 bg-gradient-to-r from-[#006039]/10 to-[#006039]/5 rounded-lg border border-primary/20">
                <p className="text-xs text-gray-600 mb-2">
                  Приложение для автоматизации сделок
                </p>
                <Button
                  variant="default"
                  className="w-full justify-center gap-2 bg-primary hover:bg-primary/90 text-white"
                  onClick={() => {
                    toast.success("Загрузка APK началась");
                    // Use direct navigation for better compatibility
                    window.location.href = "/api/app/download-apk";
                  }}
                >
                  <Download className="h-5 w-5 text-white" />
                  <span className="font-medium">Скачать APK</span>
                </Button>
              </div>

              {/* Telegram Connect Button */}
              {/* <div className="p-3 bg-gradient-to-r from-blue-500/10 to-blue-400/5 rounded-lg border border-blue-500/20">
                <p className="text-xs text-gray-600 mb-2">
                  Получайте уведомления в Telegram
                </p>
                <Button
                  variant="outline"
                  className="w-full justify-center gap-2 border-blue-500 text-blue-600 hover:bg-blue-50"
                  onClick={() => setTelegramModalOpen(true)}
                >
                  <Send className="h-5 w-5" />
                  <span className="font-medium">Подключить ТГ</span>
                </Button>
              </div> */}

              {/* Propose Idea Button */}
              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-gray-700 hover:text-gray-950 font-medium hover:bg-gray-50 dark:text-gray-300 dark:hover:text-gray-50 dark:hover:bg-gray-800"
                onClick={() => setIdeaModalOpen(true)}
              >
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                <span>Предложить идею</span>
              </Button>
            </div>
          )}
        </nav>

        {/* Theme Switcher and Logout Button */}
        <div className="p-4 border-t border-gray-100 dark:border-[#29382f] space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-md text-gray-500 dark:text-gray-400">
              {variant === "trader" && traderProfile ? (
                <div>
                  <div>ID: {traderProfile.numericId}</div>
                  <div>{traderProfile.email}</div>
                </div>
              ) : (
                <div>ID: {variant}</div>
              )}
            </div>
          </div>
          <ThemeSwitcher />
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-800 hover:text-gray-950 font-semibold hover:bg-gray-50 dark:text-gray-200 dark:hover:text-gray-50 dark:hover:bg-gray-800"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-3 text-primary dark:text-primary" />
            <span className="text-sm font-semibold">Выход</span>
          </Button>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-white dark:bg-[#0f0f0f] dark:border-[#29382f]">
        <div className="flex items-center justify-around p-2">
          {navItems.slice(0, 4).map((item) => (
            <button
              key={item.title}
              onClick={() => {
                if (item.href) {
                  router.push(item.href);
                }
              }}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                "hover:bg-accent/50",
                pathname === item.href && "text-primary"
              )}
            >
              <item.icon className="h-5 w-5 text-primary dark:text-primary" />
              <span className="text-xs">{item.title}</span>
            </button>
          ))}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors hover:bg-accent/50"
          >
            <MoreHorizontal className="h-5 w-5 text-primary" />
            <span className="text-xs">Ещё</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-white dark:bg-[#0f0f0f]">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b">
              <DynamicLogo size="md" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-5 w-5 text-primary" />
              </Button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {navItems.map((item) => renderNavItem(item))}
            </nav>
          </div>
        </div>
      )}

      {/* Telegram Connect Modal */}
      {variant === "trader" && (
        <>
          <TelegramConnectModal
            open={telegramModalOpen}
            onOpenChange={setTelegramModalOpen}
          />
          <IdeaModal open={ideaModalOpen} onOpenChange={setIdeaModalOpen} />
        </>
      )}
    </>
  );
}
