"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { DealsList } from "@/components/deals/deals-list"
import { BtEntranceDeals } from "@/components/trader/bt-entrance-deals"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

export default function TraderDealsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get("tab")
  const initialTab = useMemo(() => {
    if (tabParam === "bt") return "bt-entry"
    if (tabParam === "all") return "all"
    return "classic"
  }, [tabParam])
  const [selectedTab, setSelectedTab] = useState(initialTab)

  // Sync when URL query changes (e.g. from sidebar clicks)
  useEffect(() => {
    setSelectedTab(initialTab)
  }, [initialTab])

  const handleTabChange = (value: string) => {
    setSelectedTab(value)
    const urlTab = value === "bt-entry" ? "bt" : value
    const params = new URLSearchParams(searchParams as any)
    if (urlTab === "classic") {
      params.delete("tab")
    } else {
      params.set("tab", urlTab)
    }
    const query = params.toString()
    router.replace(`/trader/deals${query ? `?${query}` : ""}`)
  }

  return (
    <ProtectedRoute variant="trader">
      <AuthLayout variant="trader">
        <Tabs value={selectedTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="classic">Классический вход</TabsTrigger>
            <TabsTrigger value="bt-entry">БТ вход</TabsTrigger>
            <TabsTrigger value="all">Все</TabsTrigger>
          </TabsList>
          <TabsContent value="classic">
            <DealsList />
          </TabsContent>
          <TabsContent value="bt-entry">
            <BtEntranceDeals />
          </TabsContent>
          <TabsContent value="all">
            {/* Показываем DealsList, но без фильтра по устройству - все сделки */}
            <DealsList showAllDeals={true} />
          </TabsContent>
        </Tabs>
      </AuthLayout>
    </ProtectedRoute>
  )
}