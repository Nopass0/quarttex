'use client'

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Logo } from "@/components/ui/logo"
import { FileQuestion, Home, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f0f] flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white dark:bg-[#29382f] shadow-lg border-gray-200 dark:border-[#29382f]">
        <div className="flex flex-col items-center">
          <Logo size="lg" />
          
          <div className="mt-8 p-4 bg-gray-100 dark:bg-[#0f0f0f] rounded-full">
            <FileQuestion className="h-8 w-8 text-[#006039] dark:text-[#2d6a42]" />
          </div>
          
          <h1 className="mt-6 text-2xl font-semibold text-gray-900 dark:text-[#eeeeee]">
            Страница не найдена
          </h1>
          
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Запрашиваемая страница не существует или была перемещена.
          </p>
          
          <div className="mt-4 text-6xl font-bold text-gray-200 dark:text-gray-600">
            404
          </div>
          
          <div className="mt-8 flex gap-3 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4 text-[#006039] dark:text-[#2d6a42]" />
              Назад
            </Button>
            <Link href="/" className="flex-1">
              <Button className="w-full bg-[#006039] hover:bg-[#004d2e] dark:bg-[#2d6a42] dark:hover:bg-[#236035]">
                <Home className="mr-2 h-4 w-4 text-white" />
                На главную
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}