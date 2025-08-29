"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-purple-50/20 dark:bg-purple-900/15 dark:group-[.toaster]:bg-purple-800/60 group-[.toaster]:text-gray-900 dark:group-[.toaster]:text-[#eeeeee] group-[.toaster]:border group-[.toaster]:border-purple-200/60 dark:group-[.toaster]:border-[#29382f] group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-gray-600 dark:group-[.toast]:text-gray-400",
          actionButton:
            "group-[.toast]:bg-[#530FAD] dark:group-[.toast]:bg-[#7c3aed] group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-purple-100/40 dark:group-[.toast]:bg-purple-800/60 group-[.toast]:text-gray-900 dark:group-[.toast]:text-[#eeeeee]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
