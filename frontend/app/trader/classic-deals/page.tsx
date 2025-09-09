"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { DealsList } from "@/components/deals/deals-list"
import { ClassicEntryTabs } from "@/components/trader/classic-entry-tabs"

export default function ClassicDealsPage() {
  return (
    <ProtectedRoute variant="trader">
      <AuthLayout variant="trader">
        <div className="space-y-6">
          {/* Classic Entry Tabs */}
          <ClassicEntryTabs />
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold">Сделки классического входа</h1>
              <p className="text-sm md:text-base text-gray-500">Управление сделками классического входа</p>
            </div>
          </div>

          {/* Deals List - только классический вход */}
          <DealsList />
        </div>
      </AuthLayout>
    </ProtectedRoute>
  )
}
