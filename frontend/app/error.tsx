"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import QuatrexLogo from "@/components/ui/quattrex-logo"
import { AlertCircle, RefreshCw, Home } from "lucide-react"
import { useRouter } from "next/navigation"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f0f] flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white dark:bg-purple-900/30 shadow-lg border-gray-200 dark:border-purple-900/30">
        <div className="flex flex-col items-center">
          <QuatrexLogo size="lg" />
          
          <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/20 rounded-full">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-[#c64444]" />
          </div>
          
          <h1 className="mt-6 text-2xl font-semibold text-gray-900 dark:text-[#eeeeee]">
            Произошла ошибка
          </h1>
          
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Что-то пошло не так. Попробуйте обновить страницу или вернуться на главную.
          </p>
          
          {error.message && (
            <div className="mt-4 p-3 bg-gray-100 dark:bg-[#0f0f0f] rounded-lg w-full">
              <p className="text-xs text-gray-600 dark:text-gray-400 font-mono break-all">
                {error.message}
              </p>
            </div>
          )}
          
          <div className="mt-8 flex gap-3 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push("/")}
            >
              <Home className="mr-2 h-4 w-4 text-[purple-600] dark:text-[purple-600]" />
              На главную
            </Button>
            <Button
              className="flex-1 bg-[purple-600] hover:bg-[purple-700] dark:bg-[purple-600] dark:hover:bg-[purple-700]"
              onClick={() => reset()}
            >
              <RefreshCw className="mr-2 h-4 w-4 text-white" />
              Попробовать снова
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}