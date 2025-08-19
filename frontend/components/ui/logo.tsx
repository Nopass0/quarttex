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
        <span className={cn("font-bold text-[#006039] dark:text-[#2d6a42]", textSize)}>$</span>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center font-bold tracking-tight dark:text-[#eeeeee]", textSize, className)} suppressHydrationWarning>
      <span>CHA</span>
      <span className="text-[#006039] dark:text-[#2d6a42] mx-0.5" style={{ fontSize: '1.1em', letterSpacing: '0.05em' }}>$</span>
      <span>E</span>
    </div>
  )
}