"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 dark:shadow-[0_0_10px_rgba(168,85,247,0.25)]",
        secondary:
          "border-transparent bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100 hover:bg-purple-200 dark:hover:bg-purple-900/50",
        destructive:
          "border-transparent bg-red-600 text-white hover:bg-red-700 dark:bg-[#c64444] dark:hover:bg-[#a63636]",
        outline: "text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
