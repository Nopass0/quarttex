"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DisputedDealsList } from "@/components/disputes/disputed-deals-list"
import { DisputedPayoutsList } from "@/components/disputes/disputed-payouts-list"
import { TraderHeader } from "@/components/trader/trader-header"
import { AlertCircle, CreditCard, Send } from "lucide-react"

export function DisputesMain() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Споры</h1>
        <TraderHeader />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="deals" className="w-full">
        <TabsList className="grid w-fit grid-cols-2 gap-1 bg-gray-100 p-1">
          <TabsTrigger 
            value="deals" 
            className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm px-6"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Сделки
          </TabsTrigger>
          <TabsTrigger 
            value="payouts" 
            className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm px-6"
          >
            <Send className="mr-2 h-4 w-4" />
            Выплаты
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="deals" className="mt-6">
          <DisputedDealsList />
        </TabsContent>
        
        <TabsContent value="payouts" className="mt-6">
          <DisputedPayoutsList />
        </TabsContent>
      </Tabs>
    </div>
  )
}