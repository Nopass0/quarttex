import { Card } from "@/components/ui/card"
import { Logo } from "@/components/ui/logo"
import { Loader2 } from "lucide-react"

interface LoadingProps {
  fullScreen?: boolean
}

export function Loading({ fullScreen = false }: LoadingProps) {
  const content = (
    <Card className="w-full max-w-md p-8 bg-white shadow-lg">
      <div className="flex flex-col items-center">
        <Logo size="lg" />
        
        <div className="mt-8 p-4 bg-gray-50 rounded-full">
          <Loader2 className="h-8 w-8 text-[#006039] animate-spin" />
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        {content}
      </div>
    )
  }

  return content
}