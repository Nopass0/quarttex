'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import {
  Users,
  Wallet,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  TrendingUp,
  Receipt,
} from 'lucide-react'
import { useAgentAuth } from '@/stores/agent-auth'
import { ThemeSwitcher } from '@/components/ui/theme-toggle'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  {
    title: 'Обзор',
    href: '/agent',
    icon: TrendingUp,
  },
  {
    title: 'Команда',
    href: '/agent/team',
    icon: Users,
  },
  {
    title: 'Заработок',
    href: '/agent/earnings',
    icon: Wallet,
  },
  {
    title: 'История выплат',
    href: '/agent/payouts',
    icon: Receipt,
  },
  {
    title: 'Настройки',
    href: '/agent/settings',
    icon: Settings,
  },
]

export function AgentSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { logout, agent } = useAgentAuth()

  const handleLogout = () => {
    logout()
    router.push('/agent/login')
  }

  const renderNavItem = (item: NavItem) => {
    const isActive = pathname === item.href

    return (
      <Link
        key={item.title}
        href={item.href}
        onClick={() => setMobileMenuOpen(false)}
        className={cn(
          'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200',
          'text-gray-600 hover:text-gray-900',
          isActive ? 'bg-[#006039]/10 text-[#006039] font-medium border-l-4 border-[#006039] -ml-[1px]' : 'hover:bg-gray-50'
        )}
      >
        <div className={cn(
          'flex items-center justify-center w-5 h-5',
          isActive && 'text-[#006039]'
        )}>
          <item.icon className="h-5 w-5 text-[#006039]" />
        </div>
        <span className="text-sm">{item.title}</span>
      </Link>
    )
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-screen w-64 sticky top-0 bg-white border-r border-gray-100 flex-col">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col items-start">
            <Logo size="md" />
            <span className="text-xs text-gray-500 mt-2">Кабинет агента</span>
          </div>
        </div>
        
        {agent && (
          <div className="p-4 border-b border-gray-100">
            <div className="space-y-1">
              <div className="text-sm font-medium">{agent.name}</div>
              <div className="text-xs text-gray-500">{agent.email}</div>
              <div className="text-xs text-[#006039] font-medium">
                Комиссия: {agent.commissionRate}%
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => renderNavItem(item))}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-2">
          <ThemeSwitcher />
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-3 text-[#006039]" />
            <span className="text-sm">Выход</span>
          </Button>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b">
        <div className="flex items-center justify-between p-4">
          <Logo size="sm" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5 text-[#006039]" />
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-white">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b">
              <Logo size="md" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-5 w-5 text-[#006039]" />
              </Button>
            </div>
            
            {agent && (
              <div className="p-4 border-b border-gray-100">
                <div className="space-y-1">
                  <div className="text-sm font-medium">{agent.name}</div>
                  <div className="text-xs text-gray-500">{agent.email}</div>
                  <div className="text-xs text-[#006039] font-medium">
                    Комиссия: {agent.commissionRate}%
                  </div>
                </div>
              </div>
            )}

            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {navItems.map((item) => renderNavItem(item))}
            </nav>
            
            <div className="p-4 border-t space-y-2">
              <ThemeSwitcher />
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5 mr-3 text-[#006039]" />
                Выход
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}