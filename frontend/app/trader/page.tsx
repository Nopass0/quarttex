"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTraderAuth } from "@/stores/auth"

export default function TraderRootPage() {
  const router = useRouter()
  const token = useTraderAuth((state) => state.token)
  
  useEffect(() => {
    if (token) {
      router.push("/trader/dashboard")
    } else {
      router.push("/trader/login")
    }
  }, [token, router])
  
  return null
}