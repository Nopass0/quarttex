import { Card } from "@/components/ui/card"
import QuatrexLogo from "@/components/ui/quattrex-logo"
import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-screen bg-purple-50/30 dark:bg-[#0f0f0f] flex items-center justify-center p-4">
      <Card className="bg-purple-50/10 w-full max-w-md p-8 bg-purple-50/20 dark:bg-purple-900/15 dark:bg-purple-800/60 shadow-lg border-purple-200/60 dark:border-purple-700/60">
        <div className="flex flex-col items-center">
          <QuatrexLogo size="lg" />
          
          <div className="mt-8 p-4 bg-purple-50/30 dark:bg-[#0f0f0f] rounded-full">
            <Loader2 className="h-8 w-8 text-[#530FAD] dark:text-[#7c3aed] animate-spin" />
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