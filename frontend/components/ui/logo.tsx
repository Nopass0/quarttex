import React from "react"
import { cn } from "@/lib/utils"

interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  variant?: "full" | "mini" | "uppercase"
  className?: string
}

const sizeMap = {
  xs: "text-base",
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl",
  xl: "text-4xl"
}

const iconSizeMap = {
  xs: "w-5 h-5",
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-10 h-10",
  xl: "w-12 h-12"
}

export function Logo({ size = "md", variant = "full", className }: LogoProps) {
  const textSize = sizeMap[size]
  const iconSize = iconSizeMap[size]

  if (variant === "mini") {
    return (
      <div className={cn("flex items-center justify-center", iconSize, className)} suppressHydrationWarning>
        <div className="relative w-full h-full">
          {/* Mini logo with Q */}
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 blur-sm opacity-60 dark:opacity-80"></div>
          <div className="relative w-full h-full rounded-lg bg-gradient-to-br from-purple-600 to-purple-800 dark:from-purple-500 dark:to-purple-700 flex items-center justify-center">
            <span className={cn("font-bold text-white", textSize)}>Q</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center font-bold tracking-tight dark:text-[#eeeeee]", textSize, className)} suppressHydrationWarning>
      <span className="bg-gradient-to-r from-purple-600 to-purple-800 dark:from-purple-400 dark:to-purple-600 bg-clip-text text-transparent">QUATT</span>
      <span className="text-purple-500 dark:text-purple-400" style={{ fontSize: '1.1em', letterSpacing: '0.05em' }}>REX</span>
    </div>
  )
}