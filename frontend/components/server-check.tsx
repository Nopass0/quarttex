"use client"

import { useEffect, useState } from "react"
import { checkServerConnection } from "@/services/api"
import { Logo } from "@/components/ui/logo"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ServerCheckProps {
  children: React.ReactNode
}

export function ServerCheck({ children }: ServerCheckProps) {
  const [isChecking, setIsChecking] = useState(true)
  const [isServerDown, setIsServerDown] = useState(false)

  const checkConnection = async () => {
    setIsChecking(true)
    const isConnected = await checkServerConnection()
    setIsServerDown(!isConnected)
    setIsChecking(false)
  }

  useEffect(() => {
    checkConnection()
    
    // Check connection every 30 seconds if server is down
    const interval = setInterval(() => {
      if (isServerDown) {
        checkConnection()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [isServerDown])

  if (isChecking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background" suppressHydrationWarning>
        <div className="text-center space-y-4">
          <Logo size="xl" />
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-[#006039]" />
            <span className="text-lg">Подключение к серверу...</span>
          </div>
        </div>
      </div>
    )
  }

  if (isServerDown) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800" suppressHydrationWarning>
        <div className="text-center space-y-6 max-w-md p-8 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
          <Logo size="xl" variant="uppercase" />
          <div className="space-y-4">
            <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto" />
            <h1 className="text-3xl font-bold text-white">Технические работы</h1>
            <p className="text-gray-200">
              Сервер временно недоступен. Мы работаем над устранением проблемы.
              Пожалуйста, попробуйте позже.
            </p>
          </div>
          <Button 
            onClick={checkConnection}
            className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Проверить подключение
          </Button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}