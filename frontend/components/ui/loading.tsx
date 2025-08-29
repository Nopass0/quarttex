import { Card } from "@/components/ui/card"
import QuatrexLogo from "@/components/ui/quattrex-logo"
import { Loader2 } from "lucide-react"

interface LoadingProps {
  fullScreen?: boolean
}

export function Loading({ fullScreen = false }: LoadingProps) {
  const content = (
    <Card className="bg-purple-50/10 w-full max-w-md p-8 bg-purple-50/20 dark:bg-purple-900/15 shadow-lg">
      <div className="flex flex-col items-center">
        <QuatrexLogo size="lg" />
        
        <div className="mt-8 p-4 bg-purple-50/30 rounded-full">
          <Loader2 className="h-8 w-8 text-[#530FAD] animate-spin" />
        </div>
        
        <h1 className="mt-6 text-2xl font-semibold text-gray-900">
          Загрузка
        </h1>
        
        <p className="mt-2 text-center text-sm text-gray-600">
          Пожалуйста, подождите...
        </p>
      </div>
    </Card>
  )

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-purple-50/30 flex items-center justify-center p-4">
        {content}
      </div>
    )
  }

  return content
}