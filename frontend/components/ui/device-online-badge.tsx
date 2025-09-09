"use client"

import { cn } from "@/lib/utils"
import { useProject } from "@/contexts/ProjectContext"

interface DeviceOnlineBadgeProps {
  isOnline: boolean | null | undefined
  className?: string
  showText?: boolean
}

export function DeviceOnlineBadge({ isOnline, className, showText = true }: DeviceOnlineBadgeProps) {
  const online = isOnline === true
  const { project } = useProject()
  
  const primaryColor = project === "quattrex" 
    ? "bg-violet-500 text-violet-600" 
    : "bg-emerald-500 text-emerald-600"
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "h-2.5 w-2.5 rounded-full animate-pulse",
        online ? primaryColor.split(' ')[0] : "bg-gray-400"
      )} />
      {showText && (
        <span className={cn(
          "text-sm font-medium",
          online ? primaryColor.split(' ')[1] : "text-gray-500"
        )}>
          {online ? "Онлайн" : "Офлайн"}
        </span>
      )}
    </div>
  )
}