"use client"

import * as React from "react"
import { ArrowLeft } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useUrlModal } from "@/hooks/use-url-modal"
import { cn } from "@/lib/utils"

interface UrlDialogProps {
  modalName: string
  children: React.ReactNode
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
}

export function UrlDialog({
  modalName,
  children,
  onOpenChange,
  trigger
}: UrlDialogProps) {
  const { isOpen, setOpen } = useUrlModal({
    modalName,
    onOpen: () => onOpenChange?.(true),
    onClose: () => onOpenChange?.(false)
  })

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {children}
    </Dialog>
  )
}

interface UrlDialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogContent> {
  showBackButton?: boolean
  onBack?: () => void
  backButtonLabel?: string
}

export const UrlDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  UrlDialogContentProps
>(({ 
  className, 
  children, 
  showBackButton = true,
  onBack,
  backButtonLabel = "Назад",
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
    <DialogContent ref={ref} className={cn("max-w-lg", className)} {...props}>
      {showBackButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="absolute left-4 top-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">{backButtonLabel}</span>
        </Button>
      )}
      
      <div className={cn(showBackButton && "mt-8")}>
        {children}
      </div>
    </DialogContent>
  )
})
UrlDialogContent.displayName = "UrlDialogContent"

// Re-export other dialog components for convenience
export {
  DialogHeader as UrlDialogHeader,
  DialogFooter as UrlDialogFooter,
  DialogTitle as UrlDialogTitle,
  DialogDescription as UrlDialogDescription,
  DialogTrigger as UrlDialogTrigger,
  DialogClose as UrlDialogClose
}