import { Card } from "@/components/ui/card"
import { Logo } from "@/components/ui/logo"
import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f0f] flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white dark:bg-[#29382f] shadow-lg border-gray-200 dark:border-[#29382f]">
        <div className="flex flex-col items-center">
          <Logo size="lg" />
          
          <div className="mt-8 p-4 bg-gray-50 dark:bg-[#0f0f0f] rounded-full">
            <Loader2 className="h-8 w-8 text-[#006039] dark:text-[#2d6a42] animate-spin" />
          </div>
          
          <h1 className="mt-6 text-2xl font-semibold text-gray-900 dark:text-[#eeeeee]">
            Загрузка
          </h1>
          
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Пожалуйста, подождите...
          </p>
        </div>
      </Card>
    </div>
  )
}