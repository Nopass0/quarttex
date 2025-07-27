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
          "border-transparent bg-[#530FAD] text-white hover:bg-[#3f0a82] dark:bg-[#530FAD] dark:hover:bg-[#6b29b8]",
        secondary:
          "border-transparent bg-gray-100 dark:bg-[#292133] text-gray-900 dark:text-[#eeeeee] hover:bg-gray-200 dark:hover:bg-[#1f1a29]",
        destructive:
          "border-transparent bg-red-600 text-white hover:bg-red-700 dark:bg-[#c64444] dark:hover:bg-[#a63636]",
        outline: "text-gray-900 dark:text-[#eeeeee] border-gray-200 dark:border-[#292133]",
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
