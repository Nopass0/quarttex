"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#530FAD] text-white hover:bg-purple-700/80 dark:bg-[#7c3aed] dark:hover:bg-purple-800/60",
        secondary:
          "border-transparent bg-purple-100/40 dark:bg-purple-800/60 text-gray-900 dark:text-[#eeeeee] hover:bg-gray-200 dark:hover:bg-[#1f2923]",
        destructive:
          "border-transparent bg-red-600 text-white hover:bg-red-700 dark:bg-[#c64444] dark:hover:bg-purple-800/60",
        outline: "text-gray-900 dark:text-[#eeeeee] border-purple-200/60 dark:border-purple-700/60",
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
