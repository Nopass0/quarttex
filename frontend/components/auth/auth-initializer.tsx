"use client"

import { useEffect } from "react"
import { useTraderAuth, useAdminAuth } from "@/stores/auth"
import { traderApi, adminApi } from "@/services/api"

export function AuthInitializer() {
  const traderToken = useTraderAuth((state) => state.token)
  const adminToken = useAdminAuth((state) => state.token)
  const traderLogout = useTraderAuth((state) => state.logout)
  const adminLogout = useAdminAuth((state) => state.logout)
  const hasHydrated = useTraderAuth((state) => state.hasHydrated)
  
  useEffect(() => {
    // Проверяем токен трейдера при загрузке
    if (hasHydrated && traderToken) {
      console.log("Checking trader token on app init:", traderToken)
      traderApi.validateToken().catch((error) => {
        console.log("Trader token is invalid, logging out:", error)
        traderLogout()
      })
    }
  }, [hasHydrated])
  
  useEffect(() => {
    // Проверяем токен админа при загрузке
    if (hasHydrated && adminToken) {
      console.log("Checking admin token on app init:", adminToken)
      adminApi.validateToken().catch((error) => {
        console.log("Admin token is invalid, logging out:", error)
        adminLogout()
      })
    }
  }, [hasHydrated])
  
  return null
}