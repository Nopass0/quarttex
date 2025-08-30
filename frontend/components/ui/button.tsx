"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[#530FAD] text-white hover:bg-purple-700/80 dark:bg-[#7c3aed] dark:hover:bg-purple-800/60",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 dark:bg-[#c64444] dark:hover:bg-purple-800/60",
        outline:
          "border border-purple-200/60 dark:border-purple-700/60 bg-purple-50/20 dark:bg-purple-900/15 dark:bg-[#0f0f0f] hover:bg-purple-50/30 dark:hover:bg-purple-800/60 text-gray-900 dark:text-[#eeeeee]",
        secondary:
          "bg-purple-100/40 dark:bg-purple-800/60 text-gray-900 dark:text-[#eeeeee] hover:bg-gray-200 dark:hover:bg-[#1f2923]",
        ghost: "hover:bg-purple-100/40 dark:hover:bg-purple-800/60 text-gray-900 dark:text-[#eeeeee]",
        link: "text-[#530FAD] dark:text-[#7c3aed] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
