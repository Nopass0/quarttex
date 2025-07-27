"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { 
  X, 
  LogOut, 
  Home, 
  FileText, 
  AlertCircle, 
  Smartphone, 
  CreditCard,
  MessageSquare,
  Wallet,
  Users,
  Settings,
  ChartBar,
  Package,
  Shield,
  Building2,
  ChevronRight,
  Receipt,
  UserPlus,
  DollarSign,
  Folder,
  TrendingUp,
  PiggyBank,
  Clock,
  Send,
  BarChart3,
  Headphones,
  TestTube,
  Trash2,
  BookOpen,
  Download,
  Lightbulb
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTraderAuth, useAdminAuth } from "@/stores/auth";
import { useTraderStore } from "@/stores/trader";
import { useMerchantAuth } from "@/stores/merchant-auth";
import { useAgentAuth } from "@/stores/agent-auth";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useRapiraRate } from "@/hooks/use-rapira-rate";
import { TelegramConnectModal } from "@/components/trader/telegram-connect-modal";
import { IdeaModal } from "@/components/trader/idea-modal";

interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

interface MobileMenuDrawerProps {
  variant: "trader" | "admin" | "agent" | "merchant";
  isOpen: boolean;
  onClose: () => void;
}

const traderNavItems: NavItem[] = [
  {
    title: "Главная",
    href: "/trader/dashboard",
    icon: Home,
  },
  {
    title: "Сделки",
    href: "/trader/deals",
    icon: FileText,
  },
  {
    title: "БТ-Вход",
    href: "/trader/bt-entry",
    icon: AlertCircle,
  },
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
    title: "Сообщения",
    href: "/trader/messages",
    icon: MessageSquare,
  },
  {
    title: "Выплаты",
    href: "/trader/payouts",
    icon: Receipt,
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
        icon: Receipt,
      },
    ],
  },
  {
    title: "Папки",
    href: "/trader/folders",
    icon: Folder,
  },
];

const adminNavItems: NavItem[] = [
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
    title: "Сделки",
    href: "/admin/deals",
    icon: CreditCard,
  },
  {
    title: "Депозиты",
    href: "/admin/deposits",
    icon: PiggyBank,
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
  {
    title: "Методы платежей",
    href: "/admin/methods",
    icon: Wallet,
  },
  {
    title: "Настройки ККК",
    href: "/admin/kkk-settings",
    icon: Settings,
  },
  {
    title: "Настройки споров",
    href: "/admin/dispute-settings",
    icon: Clock,
  },
  {
    title: "Мерчанты",
    href: "/admin/merchants",
    icon: CreditCard,
  },
  {
    title: "Сервисы",
    href: "/admin/services",
    icon: Settings,
  },
  {
    title: "Telegram-уведомления",
    href: "/admin/telegram-notifications",
    icon: Send,
  },
  {
    title: "Платежи",
    href: "/admin/payment-details",
    icon: Receipt,
  },
  {
    title: "Устройства",
    href: "/admin/devices",
    icon: Smartphone,
  },
  {
    title: "Приложение",
    href: "/admin/applications",
    icon: Package,
  },
  {
    title: "Техподдержка",
    href: "/admin/support",
    icon: Headphones,
  },
  {
    title: "Метрики",
    href: "/admin/metrics",
    icon: BarChart3,
  },
  {
    title: "Инструменты тестирования",
    href: "/admin/test-tools",
    icon: TestTube,
  },
  {
    title: "Массовое удаление",
    href: "/admin/bulk-delete",
    icon: Trash2,
  },
  {
    title: "Wellbit API",
    href: "/wellbit/docs",
    icon: BookOpen,
  },
  {
    title: "Идеи",
    href: "/admin/ideas",
    icon: Lightbulb,
  },
];

const agentNavItems: NavItem[] = [
  {
    title: "Главная",
    href: "/agent/dashboard",
    icon: Home,
  },
  {
    title: "Трейдеры",
    href: "/agent/traders",
    icon: Users,
  },
  {
    title: "Добавить трейдера",
    href: "/agent/traders/add",
    icon: UserPlus,
  },
  {
    title: "Статистика",
    href: "/agent/statistics",
    icon: ChartBar,
  },
  {
    title: "Финансы",
    href: "/agent/finances",
    icon: Wallet,
  },
];

const merchantNavItems: NavItem[] = [
  {
    title: "Главная",
    href: "/merchant/dashboard",
    icon: Home,
  },
  {
    title: "Транзакции",
    href: "/merchant/transactions",
    icon: FileText,
  },
  {
    title: "Методы оплаты",
    href: "/merchant/methods",
    icon: CreditCard,
  },
  {
    title: "Выплаты",
    href: "/merchant/payouts",
    icon: Receipt,
  },
  {
    title: "API",
    href: "/merchant/api",
    icon: Package,
  },
  {
    title: "Настройки",
    href: "/merchant/settings",
    icon: Settings,
  },
];

export function MobileMenuDrawer({ variant, isOpen, onClose }: MobileMenuDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchY, setTouchY] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);
  const [ideaModalOpen, setIdeaModalOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
      }
    }

    // Cleanup
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Get auth hooks based on variant
  const getAuthHooks = () => {
    switch (variant) {
      case "trader":
        return {
          auth: useTraderAuth(),
          store: useTraderStore(),
        };
      case "admin":
        return {
          auth: useAdminAuth(),
          store: null,
        };
      case "agent":
        return {
          auth: useAgentAuth(),
          store: null,
        };
      case "merchant":
        return {
          auth: useMerchantAuth(),
          store: null,
        };
      default:
        return { auth: null, store: null };
    }
  };

  const { auth, store } = getAuthHooks();
  const user = auth?.user;
  const financials = variant === "trader" ? store?.financials : null;
  const { rate: rapiraRate } = useRapiraRate();

  const getNavItems = () => {
    switch (variant) {
      case "trader":
        return traderNavItems;
      case "admin":
        const dynamicAdminNavItems = [...adminNavItems];
        if (auth?.role === "SUPER_ADMIN") {
          dynamicAdminNavItems.push({
            title: "Администраторы",
            href: "/admin/admins",
            icon: Shield,
          });
        }
        return dynamicAdminNavItems;
      case "agent":
        return agentNavItems;
      case "merchant":
        return merchantNavItems;
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const handleLogout = () => {
    if (auth?.logout) {
      auth.logout();
      router.push("/");
    }
  };

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  // Handle touch events for swipe to close
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
    setTouchY(e.touches[0].clientY);
    setIsDragging(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStart;
    
    if (diff > 10) {
      e.preventDefault(); // Prevent page scroll
      setIsDragging(true);
      setTouchY(currentY);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging || touchStart === null || touchY === null) {
      setTouchStart(null);
      setTouchY(null);
      setIsDragging(false);
      return;
    }

    const diff = touchY - touchStart;
    if (diff > 100) {
      onClose();
    }

    setTouchStart(null);
    setTouchY(null);
    setIsDragging(false);
  };

  // Calculate drawer transform based on drag
  const getDrawerTransform = () => {
    if (!isDragging || touchStart === null || touchY === null) return 0;
    const diff = touchY - touchStart;
    return Math.max(0, diff);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />

          {/* Drawer */}
          <motion.div
            ref={drawerRef}
            initial={{ y: "100%" }}
            animate={{ y: isDragging ? getDrawerTransform() : 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-3xl shadow-xl md:hidden max-h-[90vh] flex flex-col touch-none"
            style={{ touchAction: 'none' }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-2 pb-2">
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
            </div>

            {/* Header with user info */}
            <div className="px-6 pb-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {user?.name || user?.email || "Пользователь"}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {user?.email}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Balance info for traders - USDT only */}
              {variant === "trader" && financials && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Баланс USDT</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {financials.balanceUsdt.toFixed(2)} USDT
                  </p>
                </div>
              )}

              {variant === "trader" && rapiraRate && (
                <div className="mt-2 p-2 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/10 dark:to-purple-800/10 rounded-lg border border-purple-500 dark:border-purple-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-200">
                        TRC-20
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                        {rapiraRate.rate.toFixed(2)}
                      </span>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        ₽/USDT
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons for traders */}
              {variant === "trader" && (
                <div className="mt-3 space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-sm border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    onClick={() => {
                      setTelegramModalOpen(true);
                      onClose();
                    }}
                  >
                    <Send className="h-4 w-4" />
                    <span>Подключить Telegram</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-sm text-gray-700 hover:text-gray-950 dark:text-gray-300 dark:hover:text-gray-50"
                    onClick={() => {
                      setIdeaModalOpen(true);
                      onClose();
                    }}
                  >
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    <span>Предложить идею</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-sm text-gray-700 hover:text-gray-950 dark:text-gray-300 dark:hover:text-gray-50"
                    onClick={() => {
                      window.open('/apk/chase.apk', '_blank');
                    }}
                  >
                    <Download className="h-4 w-4 text-purple-600" />
                    <span>Скачать APK</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Navigation items */}
            <div className="flex-1 overflow-y-auto px-4 py-4 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.href && pathname === item.href;
                  const isExpanded = expandedItems.includes(item.title);

                  if (item.children) {
                    return (
                      <div key={item.title}>
                        <button
                          onClick={() => toggleExpanded(item.title)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                            "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="h-5 w-5" />
                            <span>{item.title}</span>
                          </div>
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 transition-transform",
                              isExpanded && "rotate-90"
                            )}
                          />
                        </button>
                        {isExpanded && (
                          <div className="ml-8 mt-1 space-y-1">
                            {item.children.map((child) => {
                              const ChildIcon = child.icon;
                              const isChildActive = child.href && pathname === child.href;
                              
                              return (
                                <Link
                                  key={child.title}
                                  href={child.href || "#"}
                                  onClick={onClose}
                                  className={cn(
                                    "flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors",
                                    isChildActive
                                      ? "bg-[#530FAD]/10 text-[#530FAD] dark:text-[#530FAD]"
                                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                  )}
                                >
                                  <ChildIcon className="h-4 w-4" />
                                  <span>{child.title}</span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.title}
                      href={item.href || "#"}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                        isActive
                          ? "bg-[#530FAD]/10 text-[#530FAD] dark:text-[#530FAD]"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Logout button */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Выйти
              </Button>
            </div>
          </motion.div>
        </>
        )}
      </AnimatePresence>
      
      {/* Modals */}
      {variant === "trader" && (
        <>
          <TelegramConnectModal
            open={telegramModalOpen}
            onOpenChange={setTelegramModalOpen}
          />
          <IdeaModal
            open={ideaModalOpen}
            onOpenChange={setIdeaModalOpen}
          />
        </>
      )}
    </>
  );
}