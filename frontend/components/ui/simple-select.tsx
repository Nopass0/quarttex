"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Check } from "lucide-react";

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
  className?: string;
}

interface SelectTriggerProps {
  children?: React.ReactNode;
  className?: string;
}

interface SelectContentProps {
  children?: React.ReactNode;
  className?: string;
  align?: "start" | "end" | "center";
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

interface SelectValueProps {
  placeholder?: string;
}

const SelectContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
  selectedLabel?: string;
  setSelectedLabel?: (label: string) => void;
}>({
  open: false,
  setOpen: () => {},
  triggerRef: React.createRef(),
});

export function Select({ value, onValueChange, children, className }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedLabel, setSelectedLabel] = React.useState<string>("");
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  // Extract labels from children when value changes
  React.useEffect(() => {
    if (!value || !children) return;
    
    const findLabel = (elements: React.ReactNode): string | null => {
      let label: string | null = null;
      
      React.Children.forEach(elements, (child) => {
        if (!React.isValidElement(child)) return;
        
        if (child.type === SelectContent) {
          label = findLabel(child.props.children);
        } else if (child.type === SelectItem && child.props.value === value) {
          label = child.props.children?.toString() || value;
        }
      });
      
      return label;
    };
    
    const foundLabel = findLabel(children);
    if (foundLabel) {
      setSelectedLabel(foundLabel);
    }
  }, [value, children]);

  return (
    <SelectContext.Provider 
      value={{ 
        value, 
        onValueChange, 
        open, 
        setOpen, 
        triggerRef,
        selectedLabel,
        setSelectedLabel
      }}
    >
      <div className={cn("relative", className)}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ children, className }: SelectTriggerProps) {
  const { open, setOpen, triggerRef } = React.useContext(SelectContext);

  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      aria-expanded={open}
      aria-haspopup="listbox"
    >
      {children}
      <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", open && "rotate-180")} />
    </button>
  );
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const { value, selectedLabel } = React.useContext(SelectContext);
  
  return (
    <span className="block truncate">
      {selectedLabel || value || placeholder || "Select..."}
    </span>
  );
}

export function SelectContent({ children, className, align = "start" }: SelectContentProps) {
  const { open, setOpen, triggerRef } = React.useContext(SelectContext);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
    } else {
      const timer = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current && 
        !contentRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, setOpen, triggerRef]);

  if (!mounted) return null;

  return (
    <div
      ref={contentRef}
      className={cn(
        "absolute z-50 mt-1 w-full min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        open ? "animate-in fade-in-0 zoom-in-95" : "animate-out fade-out-0 zoom-out-95",
        className
      )}
      style={{
        maxHeight: "300px",
        overflowY: "auto"
      }}
    >
      <div role="listbox">
        {children}
      </div>
    </div>
  );
}

export function SelectItem({ value, children, className }: SelectItemProps) {
  const context = React.useContext(SelectContext);
  const isSelected = context.value === value;

  const handleClick = () => {
    context.onValueChange?.(value);
    context.setSelectedLabel?.(children?.toString() || value);
    context.setOpen(false);
  };

  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={handleClick}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        isSelected && "bg-accent text-accent-foreground",
        className
      )}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {isSelected && <Check className="h-4 w-4" />}
      </span>
      {children}
    </div>
  );
}