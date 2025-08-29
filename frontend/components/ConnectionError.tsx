import React from "react"
import { AlertCircle, X } from "lucide-react"
import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"

interface ConnectionErrorProps {
  onClose?: () => void
  onRetry?: () => void
}

export function ConnectionError({ onClose, onRetry }: ConnectionErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-white px-8 py-12">
      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      )}

      {/* Logo */}
      <div className="mb-8">
        <Logo className="h-16 w-auto" />
      </div>

      {/* Error Icon */}
      <div className="mb-6">
        <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-xl font-semibold text-gray-900 mb-3">
        Ошибка подключения
      </h2>

      {/* Status items */}
      <div className="space-y-3 mb-8 w-full max-w-xs">
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-gray-600">Соединение</span>
          <span className="text-red-500 font-medium">Офлайн</span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-gray-600">Статус</span>
          <span className="text-gray-900 font-medium">Онлайн</span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-gray-600">Доступ</span>
          <span className="text-gray-900 font-medium">Открыт</span>
        </div>
      </div>

      {/* Action button */}
      <Button
        onClick={onRetry}
        className="w-full max-w-xs bg-gray-900 hover:bg-gray-800 text-white"
      >
        Повторить попытку
      </Button>
    </div>
  )
}