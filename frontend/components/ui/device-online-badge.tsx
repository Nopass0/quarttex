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
        online ? "bg-purple-500 dark:shadow-[0_0_8px_rgba(168,85,247,0.5)]" : "bg-gray-400"
      )} />
      {showText && (
        <span className={cn(
          "text-sm font-medium",
          online ? "text-purple-600 dark:text-purple-400" : "text-gray-500"
        )}>
          {online ? "Онлайн" : "Офлайн"}
        </span>
      )}
    </div>
  )
}