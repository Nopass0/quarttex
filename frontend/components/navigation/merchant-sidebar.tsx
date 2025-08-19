"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { useMerchantAuth } from "@/stores/merchant-auth"
import {
  FileText,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  LogOut,
  BarChart3,
  AlertCircle,
} from "lucide-react"
import { ThemeSwitcher } from "@/components/ui/theme-toggle"

interface NavItem {
  title: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  children?: NavItem[]
}

const merchantNavItems: NavItem[] = [
  {
    title: "Транзакции",
    href: "/merchant/transactions",
    icon: FileText,
  },
  {
    title: "Статистика",
    href: "/merchant/statistics",
    icon: BarChart3,
  },
  {
    title: "Споры",
    href: "/merchant/disputes",
    icon: AlertCircle,
  },
  {
    title: "Документация API",
    icon: BookOpen,
    children: [
      {
        title: "Создание транзакции",
        href: "/merchant/docs/create-transaction",
        icon: FileText,
      },
      {
        title: "Проверка статуса",
        href: "/merchant/docs/check-status",
        icon: FileText,
      },
      {
        title: "Webhook уведомления",
        href: "/merchant/docs/webhooks",
        icon: FileText,
      },
      {
        title: "Методы оплаты",
        href: "/merchant/docs/payment-methods",
        icon: FileText,
      },
      {
        title: "Коды ошибок",
        href: "/merchant/docs/error-codes",
        icon: FileText,
      },
    ],
  },
]

export function MerchantSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const merchantName = useMerchantAuth((state) => state.merchantName)
  const logout = useMerchantAuth((state) => state.logout)

  useEffect(() => {
    // Auto-expand items if current path is a child
    merchantNavItems.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some((child) => pathname === child.href)
        if (hasActiveChild && !expandedItems.includes(item.title)) {
          setExpandedItems([...expandedItems, item.title])
        }
      }
    })
  }, [pathname])

  const handleLogout = () => {
    logout()
    router.push("/merchant/login")
  }

  const toggleExpanded = (title: string) => {
    if (expandedItems.includes(title)) {
      setExpandedItems(expandedItems.filter((item) => item !== title))
    } else {
      setExpandedItems([...expandedItems, title])
    }
  }

  const renderNavItem = (item: NavItem, level = 0) => {
    const isActive = pathname === item.href
    const isExpanded = expandedItems.includes(item.title)
    const Icon = item.icon

    if (item.children) {
      return (
        <div key={item.title}>
          <button
            onClick={() => toggleExpanded(item.title)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
              "hover:bg-gray-100 text-gray-700",
              level > 0 && "pl-9"
            )}
          >
            <Icon className="h-4 w-4 text-[#006039]" />
            <span className="flex-1 text-left">{item.title}</span>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-[#006039]" />
            ) : (
              <ChevronRight className="h-4 w-4 text-[#006039]" />
            )}
          </button>
          {isExpanded && (
            <div className="mt-1 space-y-1">
              {item.children.map((child) => renderNavItem(child, level + 1))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link
        key={item.title}
        href={item.href!}
        className={cn(
          "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
          isActive
            ? "bg-[#006039] text-white"
            : "text-gray-700 hover:bg-gray-100",
          level > 0 && "pl-9"
        )}
        onClick={() => setMobileMenuOpen(false)}
      >
        <Icon className="h-4 w-4" />
        <span>{item.title}</span>
      </Link>
    )
  }

  const sidebarContent = (
    <>
      <div className="px-3 py-5">
        <Link href="/merchant/transactions" className="flex items-center gap-2">
          <Logo size="sm" />
          <span className="text-lg font-semibold">Мерчант</span>
        </Link>
        {merchantName && (
          <p className="mt-2 text-sm text-gray-600">{merchantName}</p>
        )}
      </div>
      <nav className="mt-5 px-2 space-y-1 flex-1">
        {merchantNavItems.map((item) => renderNavItem(item))}
      </nav>
      <div className="p-4 border-t space-y-2">
        <ThemeSwitcher />
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4 text-[#006039]" />
          Выйти
        </Button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 bg-white border-r">
          {sidebarContent}
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="md:hidden fixed bottom-4 right-4 z-50">
        <Button
          size="icon"
          className="rounded-full shadow-lg bg-[#006039] hover:bg-[#006039]/90"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Mobile sidebar */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}