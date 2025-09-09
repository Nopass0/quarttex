"use client"

import { useState } from "react"
import { Sidebar } from "@/components/navigation/sidebar"
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav"
import { MobileMenuDrawer } from "@/components/navigation/mobile-menu-drawer"

interface AuthLayoutProps {
  children: React.ReactNode
  variant: "trader" | "admin" | "agent" | "merchant" | "aggregator"
}

export function AuthLayout({ children, variant }: AuthLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f0f]">
      <div className="mx-auto max-w-[1920px] px-0 lg:px-6 xl:px-12 2xl:px-20">
        <div className="flex">
          {/* Desktop Sidebar */}
          <div className="hidden md:block">
            <Sidebar variant={variant} />
          </div>
          
          {/* Main Content Area */}
          <main className="flex-1 min-w-0 pb-20 md:pb-0">
            <div className="h-full px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-7xl py-4 md:py-6">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav variant={variant} onMoreClick={() => setMobileMenuOpen(true)} />
      
      {/* Mobile Menu Drawer */}
      <MobileMenuDrawer 
        variant={variant} 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
      />
    </div>
  )
}