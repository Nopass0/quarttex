"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 dark:shadow-[0_0_15px_rgba(168,85,247,0.3)]",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 dark:bg-[#c64444] dark:hover:bg-[#a63636]",
        outline:
          "border border-gray-200 dark:border-purple-800/50 bg-white dark:bg-[#0f0f0f] hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-900 dark:text-[#eeeeee] hover:border-purple-300 dark:hover:border-purple-700",
        secondary:
          "bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100 hover:bg-purple-200 dark:hover:bg-purple-900/50",
        ghost: "hover:bg-purple-100 dark:hover:bg-purple-900/30 text-gray-900 dark:text-[#eeeeee]",
        link: "text-purple-600 dark:text-purple-400 underline-offset-4 hover:underline",
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
