"use client";

import React, { useState, useEffect, forwardRef, useRef, ChangeEvent, KeyboardEvent, Fragment } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export const PhoneInput = forwardRef<HTMLDivElement, PhoneInputProps>(
  ({ value = "", onChange, disabled, className }, ref) => {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    
    // Ensure phone always starts with 7 for Russia
    const normalizedValue = value && !value.startsWith("7") ? "7" + value : value;
    const phoneDigits = normalizedValue.slice(1).padEnd(10, " ").split("");
    
    const handleDigitChange = (index: number, digit: string) => {
      if (!/^\d*$/.test(digit)) return;
      
      const newDigits = [...phoneDigits];
      newDigits[index] = digit || " ";
      
      const newPhone = "7" + newDigits.join("").trim();
      onChange?.(newPhone);
      
      // Auto-focus next input
      if (digit && index < 9) {
        inputRefs.current[index + 1]?.focus();
        inputRefs.current[index + 1]?.select();
      }
    };
    
    const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !phoneDigits[index].trim() && index > 0) {
        e.preventDefault();
        inputRefs.current[index - 1]?.focus();
        inputRefs.current[index - 1]?.select();
      }
    };
    
    const handlePaste = (e: React.ClipboardEvent) => {
      e.preventDefault();
      const paste = e.clipboardData.getData("text");
      const digits = paste.replace(/\D/g, "").slice(0, 11);
      const normalizedDigits = digits.startsWith("7") ? digits : "7" + digits;
      onChange?.(normalizedDigits);
    };
    
    return (
      <div className={cn("flex items-center gap-1", className)} ref={ref}>
        <span className="text-sm text-muted-foreground font-mono mr-1">+7</span>
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">(</span>
          {[0, 1, 2].map((i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={phoneDigits[i]?.trim() || ""}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              disabled={disabled}
              className={cn(
                "w-8 h-8 text-center border rounded-md",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "text-sm"
              )}
            />
          ))}
          <span className="text-sm text-muted-foreground">)</span>
        </div>
        <div className="flex items-center gap-1">
          {[3, 4, 5].map((i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={phoneDigits[i]?.trim() || ""}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              disabled={disabled}
              className={cn(
                "w-8 h-8 text-center border rounded-md",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "text-sm"
              )}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground">-</span>
        <div className="flex items-center gap-1">
          {[6, 7].map((i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={phoneDigits[i]?.trim() || ""}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              disabled={disabled}
              className={cn(
                "w-8 h-8 text-center border rounded-md",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "text-sm"
              )}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground">-</span>
        <div className="flex items-center gap-1">
          {[8, 9].map((i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={phoneDigits[i]?.trim() || ""}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              disabled={disabled}
              className={cn(
                "w-8 h-8 text-center border rounded-md",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "text-sm"
              )}
            />
          ))}
        </div>
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";

interface CardNumberInputProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export const CardNumberInput = forwardRef<HTMLInputElement, CardNumberInputProps>(
  ({ value = "", onChange, disabled, className }, ref) => {
    const [displayValue, setDisplayValue] = useState("");
    
    useEffect(() => {
      // Format the value for display with spaces
      const formatted = value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
      setDisplayValue(formatted);
    }, [value]);
    
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      // Remove all non-digits
      const digits = e.target.value.replace(/\D/g, "");
      
      // Limit to 16 digits
      const limitedDigits = digits.slice(0, 16);
      
      // Update parent with raw digits
      onChange?.(limitedDigits);
    };
    
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      // Allow navigation keys, backspace, delete, tab
      const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
      
      // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      if (e.ctrlKey && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
        return;
      }
      
      // Block if not a number and not an allowed key
      if (!allowedKeys.includes(e.key) && !/^\d$/.test(e.key)) {
        e.preventDefault();
      }
    };
    
    return (
      <div className={cn("relative w-full", className)}>
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="0000 0000 0000 0000"
          className={cn(
            "w-full h-10 px-3 py-2 text-sm border border-input rounded-md",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "font-mono tracking-wide bg-background",
            "placeholder:text-muted-foreground"
          )}
        />
        {/* Vertical separators - positioned based on character positions */}
        {!disabled && displayValue && (
          <div className="absolute inset-0 pointer-events-none">
            <div 
              className="absolute top-1/2 -translate-y-1/2 h-5 w-px bg-border" 
              style={{ left: 'calc(12px + 4.5ch)' }}
            />
            <div 
              className="absolute top-1/2 -translate-y-1/2 h-5 w-px bg-border" 
              style={{ left: 'calc(12px + 9.5ch)' }}
            />
            <div 
              className="absolute top-1/2 -translate-y-1/2 h-5 w-px bg-border" 
              style={{ left: 'calc(12px + 14.5ch)' }}
            />
          </div>
        )}
      </div>
    );
  }
);

CardNumberInput.displayName = "CardNumberInput";