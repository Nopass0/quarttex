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
        online ? "bg-[#530FAD]" : "bg-gray-400"
      )} />
      {showText && (
        <span className={cn(
          "text-sm font-medium",
          online ? "text-[#530FAD] dark:text-[#7c3aed]" : "text-gray-500"
        )}>
          {online ? "Онлайн" : "Офлайн"}
        </span>
      )}
    </div>
  )
}