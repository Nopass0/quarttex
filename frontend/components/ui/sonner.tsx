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
            "group toast group-[.toaster]:bg-white dark:group-[.toaster]:bg-[#292133] group-[.toaster]:text-gray-900 dark:group-[.toaster]:text-[#eeeeee] group-[.toaster]:border group-[.toaster]:border-gray-200 dark:group-[.toaster]:border-[#292133] group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-gray-600 dark:group-[.toast]:text-gray-400",
          actionButton:
            "group-[.toast]:bg-[#530FAD] dark:group-[.toast]:bg-[#530FAD] group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-gray-100 dark:group-[.toast]:bg-[#292133] group-[.toast]:text-gray-900 dark:group-[.toast]:text-[#eeeeee]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
