"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAdminAuth } from "@/stores/auth"

export default function AdminRootPage() {
  const router = useRouter()
  const token = useAdminAuth((state) => state.token)
  
  useEffect(() => {
    if (token) {
      router.push("/admin/traders")
    } else {
      router.push("/admin/login")
    }
  }, [token, router])
  
  return null
}