import React from "react"
import { cn } from "@/lib/utils"

interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  variant?: "full" | "mini" | "uppercase"
  className?: string
  animated?: boolean
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

export function Logo({ size = "md", variant = "full", className, animated = false }: LogoProps) {
  const textSize = sizeMap[size]
  const iconSize = iconSizeMap[size]

  const rotateClass = animated ? "logo-rotate-z" : ""

  if (variant === "mini") {
    return (
      <div className={cn("flex items-center justify-center", iconSize, className)} suppressHydrationWarning>
        <span className={cn("font-black text-[#006039] dark:text-[#2d6a42] inline-block glass-dollar", textSize, rotateClass)} style={{ fontWeight: '900' }}>$</span>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center font-bold tracking-tight dark:text-[#eeeeee]", textSize, className)} suppressHydrationWarning>
      <span>CHA</span>
      <span 
        className={cn("text-[#006039] dark:text-[#2d6a42] mx-0.5 inline-block font-black glass-dollar", rotateClass)} 
        style={{ 
          fontSize: '1.1em', 
          letterSpacing: '0.05em',
          fontWeight: '900'
        }}
      >
        $
      </span>
      <span>E</span>
    </div>
  )
}