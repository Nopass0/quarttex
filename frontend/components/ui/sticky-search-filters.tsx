"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/simple-popover";
import { Search, SlidersHorizontal, ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";
import { useStableSticky } from "@/hooks/use-stable-sticky";

interface StickySearchFiltersProps {
  children?: ReactNode;
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  activeFiltersCount?: number;
  className?: string;
  filterTriggerLabel?: string;
  onApplyFilters?: () => void;
  onResetFilters?: () => void;
  stickyTop?: number;
  additionalButtons?: ReactNode;
}

export function StickySearchFilters({
  children,
  searchPlaceholder = "Поиск...",
  searchValue,
  onSearchChange,
  activeFiltersCount = 0,
  className,
  filterTriggerLabel = "Не выбраны",
  onApplyFilters,
  onResetFilters,
  stickyTop = 0,
  additionalButtons,
}: StickySearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalSearchValue, setInternalSearchValue] = useState(searchValue);
  const [focusedInputId, setFocusedInputId] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const stickyRef = useStableSticky();
  
  // Debounce search
  const debouncedSearchValue = useDebounce(internalSearchValue, 300);
  
  useEffect(() => {
    onSearchChange(debouncedSearchValue);
  }, [debouncedSearchValue, onSearchChange]);

  useEffect(() => {
    setInternalSearchValue(searchValue);
  }, [searchValue]);

  // Save and restore focus
  useEffect(() => {
    if (isOpen && focusedInputId) {
      const timer = setTimeout(() => {
        const input = popoverRef.current?.querySelector(`#${focusedInputId}`) as HTMLInputElement;
        if (input) {
          input.focus();
          // Restore cursor position
          const length = input.value.length;
          input.setSelectionRange(length, length);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, focusedInputId]);

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.id) {
      setFocusedInputId(e.target.id);
    }
  };

  const handleInputBlur = () => {
    // Keep the focused input ID when blur happens
    // This helps restore focus when popover reopens
  };

  const handleApplyFilters = () => {
    if (onApplyFilters) {
      onApplyFilters();
    }
    setIsOpen(false);
  };

  const handleResetFilters = () => {
    if (onResetFilters) {
      onResetFilters();
    }
    setFocusedInputId(null);
  };

  return (
    <div 
      ref={stickyRef}
      className={cn(
        "sticky bg-white dark:bg-[#0f0f0f] pb-3 md:pb-4 -mx-4 md:-mx-6 px-4 md:px-6 pt-2 shadow-sm dark:shadow-[#29382f] z-10",
        className
      )}
      style={{ 
        top: `${stickyTop}px`,
        position: 'sticky',
        transform: 'translateZ(0)', // Force GPU acceleration
        backfaceVisibility: 'hidden', // Prevent flickering
      }}
    >
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#006039] dark:text-[#2d6a42] h-4 w-4" />
          <Input
            placeholder={searchPlaceholder}
            value={internalSearchValue}
            onChange={(e) => setInternalSearchValue(e.target.value)}
            className="pl-10 border h-10 md:h-12 text-sm md:text-base border-gray-300 dark:border-[#29382f] rounded-lg"
          />
        </div>

        {/* Filters Container */}
        <div className="flex gap-2">
          {/* Filters */}
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild ref={triggerRef}>
              <Button
                variant="outline"
                size="default"
                className="gap-1 md:gap-2 h-10 md:h-12 px-3 md:px-6 text-sm md:text-base flex-1 sm:flex-initial"
              >
                <SlidersHorizontal className="h-4 w-4 text-[#006039]" />
                <span className="hidden sm:inline">{filterTriggerLabel}</span>
                {activeFiltersCount > 0 && (
                  <Badge className="ml-1 bg-[#006039] text-white">
                    {activeFiltersCount}
                  </Badge>
                )}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isOpen ? "text-[#006039]" : "text-gray-400"
                  )}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              ref={popoverRef}
              align="end" 
              className="w-[90vw] sm:w-[500px] max-w-[500px]" 
              sideOffset={5}
              onFocusCapture={(e) => e.preventDefault()}
              onInteractOutside={(e) => {
                // Prevent closing when clicking inside the popover
                const target = e.target as HTMLElement;
                if (popoverRef.current?.contains(target)) {
                  e.preventDefault();
                }
              }}
            >
              <div className="space-y-4">
                <h4 className="font-medium">Параметры поиска</h4>

                {/* Filter content with focus management */}
                <div
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                >
                  {children}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-12"
                    onClick={handleResetFilters}
                  >
                    Сбросить все
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-12 bg-[#006039] hover:bg-[#006039]/90"
                    onClick={handleApplyFilters}
                  >
                    Применить фильтры
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Additional buttons */}
          {additionalButtons}
        </div>
      </div>
    </div>
  );
}