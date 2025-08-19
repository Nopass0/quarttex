"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { ArrowLeft, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useModalNavigation } from "@/hooks/use-modal-navigation"

// Re-export original Dialog components
export const NavigableDialog = DialogPrimitive.Root
export const NavigableDialogTrigger = DialogPrimitive.Trigger
export const NavigableDialogPortal = DialogPrimitive.Portal
export const NavigableDialogClose = DialogPrimitive.Close

const NavigableDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
NavigableDialogOverlay.displayName = "NavigableDialogOverlay"

interface NavigableDialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  showBackButton?: boolean
  onBack?: () => void
  backButtonLabel?: string
  hideCloseButton?: boolean
}

export const NavigableDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  NavigableDialogContentProps
>(({ 
  className, 
  children, 
  showBackButton = true,
  onBack,
  backButtonLabel = "Назад",
  hideCloseButton = false,
  ...props 
}, ref) => {
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      // Default behavior: go back in history
      window.history.back()
    }
  }

  return (
    <NavigableDialogPortal>
      <NavigableDialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-gray-200 dark:border-[#29382f] bg-white dark:bg-[#0f0f0f] p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
          className
        )}
        {...props}
      >
        {/* Header with navigation */}
        {(showBackButton || !hideCloseButton) && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">{backButtonLabel}</span>
              </Button>
            )}
            
            {!hideCloseButton && (
              <DialogPrimitive.Close className={cn(
                "rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
                !showBackButton && "ml-auto"
              )}>
                <X className="h-4 w-4 text-[#006039] dark:text-[#2d6a42]" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            )}
          </div>
        )}
        
        {/* Add padding to account for header */}
        <div className={cn(
          (showBackButton || !hideCloseButton) && "mt-8"
        )}>
          {children}
        </div>
      </DialogPrimitive.Content>
    </NavigableDialogPortal>
  )
})
NavigableDialogContent.displayName = "NavigableDialogContent"

// Re-export other dialog components with Navigable prefix
export const NavigableDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
NavigableDialogHeader.displayName = "NavigableDialogHeader"

export const NavigableDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
NavigableDialogFooter.displayName = "NavigableDialogFooter"

export const NavigableDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-gray-900 dark:text-[#eeeeee]",
      className
    )}
    {...props}
  />
))
NavigableDialogTitle.displayName = "NavigableDialogTitle"

export const NavigableDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-gray-600 dark:text-gray-400", className)}
    {...props}
  />
))
NavigableDialogDescription.displayName = "NavigableDialogDescription"

// Wrapper component that integrates with URL navigation
interface NavigableDialogWrapperProps {
  modalName: string
  children: React.ReactNode
  onOpenChange?: (open: boolean) => void
  showBackButton?: boolean
  onBack?: () => void
  backButtonLabel?: string
  hideCloseButton?: boolean
  trigger?: React.ReactNode
}

// Wrapper component that integrates with URL navigation
export function NavigableDialogWrapper({
  modalName,
  children,
  onOpenChange,
  showBackButton = true,
  onBack,
  backButtonLabel,
  hideCloseButton,
  trigger
}: NavigableDialogWrapperProps) {
  const { isOpen, setOpen, goBack } = useModalNavigation({
    modalName,
    onOpen: () => onOpenChange?.(true),
    onClose: () => onOpenChange?.(false)
  })

  return (
    <NavigableDialog open={isOpen} onOpenChange={setOpen}>
      {trigger && (
        <NavigableDialogTrigger asChild>
          {trigger}
        </NavigableDialogTrigger>
      )}
      {React.Children.map(children, child => {
        if (React.isValidElement(child) && child.type === NavigableDialogContent) {
          return React.cloneElement(child as any, {
            showBackButton,
            onBack: onBack || goBack,
            backButtonLabel,
            hideCloseButton
          })
        }
        return child
      })}
    </NavigableDialog>
  )
}