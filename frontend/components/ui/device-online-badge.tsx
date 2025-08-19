import { cn } from "@/lib/utils"

interface DeviceOnlineBadgeProps {
  isOnline: boolean | null | undefined
  className?: string
  showText?: boolean
}

export function DeviceOnlineBadge({ isOnline, className, showText = true }: DeviceOnlineBadgeProps) {
  const online = isOnline === true
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "h-2.5 w-2.5 rounded-full animate-pulse",
        online ? "bg-green-500" : "bg-gray-400"
      )} />
      {showText && (
        <span className={cn(
          "text-sm font-medium",
          online ? "text-green-600" : "text-gray-500"
        )}>
          {online ? "Онлайн" : "Офлайн"}
        </span>
      )}
    </div>
  )
}