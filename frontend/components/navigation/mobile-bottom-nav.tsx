"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  FileText, 
  AlertCircle, 
  Smartphone, 
  CreditCard,
  MoreHorizontal,
  Wallet,
  MessageSquare,
  Users,
  Settings,
  ChartBar,
  Package,
  Shield,
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MobileBottomNavProps {
  variant: "trader" | "admin" | "agent" | "merchant";
  onMoreClick: () => void;
}

const traderMainItems: NavItem[] = [
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
    title: "Устройства",
    href: "/trader/devices",
    icon: Smartphone,
  },
  {
    title: "БТ-Вход",
    href: "/trader/bt-entry",
    icon: AlertCircle,
  },
];

const adminMainItems: NavItem[] = [
  {
    title: "Главная",
    href: "/admin/dashboard",
    icon: Home,
  },
  {
    title: "Трейдеры",
    href: "/admin/traders",
    icon: Users,
  },
  {
    title: "Мерчанты",
    href: "/admin/merchants",
    icon: Building2,
  },
  {
    title: "Транзакции",
    href: "/admin/transactions",
    icon: FileText,
  },
];

const agentMainItems: NavItem[] = [
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

const merchantMainItems: NavItem[] = [
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
    title: "Методы",
    href: "/merchant/methods",
    icon: CreditCard,
  },
  {
    title: "API",
    href: "/merchant/api",
    icon: Package,
  },
];

export function MobileBottomNav({ variant, onMoreClick }: MobileBottomNavProps) {
  const pathname = usePathname();
  
  const getMainItems = () => {
    switch (variant) {
      case "trader":
        return traderMainItems;
      case "admin":
        return adminMainItems;
      case "agent":
        return agentMainItems;
      case "merchant":
        return merchantMainItems;
      default:
        return [];
    }
  };

  const mainItems = getMainItems();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 md:hidden">
      <div className="grid grid-cols-5 h-16">
        {mainItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs transition-colors",
                isActive
                  ? "text-[#530FAD] dark:text-[#530FAD]"
                  : "text-gray-600 dark:text-gray-400"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{item.title}</span>
            </Link>
          );
        })}
        
        <button
          onClick={onMoreClick}
          className="flex flex-col items-center justify-center gap-1 text-xs text-gray-600 dark:text-gray-400 transition-colors hover:text-[#530FAD] dark:hover:text-[#530FAD]"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>Ещё</span>
        </button>
      </div>
    </div>
  );
}