"use client"

import { ServerCheck } from "@/components/server-check"
import { AuthInitializer } from "@/components/auth/auth-initializer"
import { ThemeProvider } from "@/providers/theme-provider"
import { WebSocketProvider } from "@/providers/websocket-provider"
import { ProjectProvider } from "@/contexts/ProjectContext"
import { useEffect } from "react"

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Suppress ResizeObserver errors
    const debounce = (callback: Function, delay: number) => {
      let timeoutId: NodeJS.Timeout;
      return (...args: any[]) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => callback(...args), delay);
      };
    };

    const handleError = (e: ErrorEvent) => {
      if (e.message?.includes('ResizeObserver loop') || 
          e.message?.includes('ResizeObserver loop completed') ||
          e.message?.includes('ResizeObserver')) {
        e.stopImmediatePropagation();
        e.preventDefault();
        return true;
      }
    };
    
    // Also override console methods to suppress these errors
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    console.error = (...args: any[]) => {
      const message = args[0]?.toString() || '';
      if (message.includes('ResizeObserver') || 
          message.includes('Unknown event handler property') ||
          message.includes('onOpenAutoFocus')) {
        return;
      }
      originalConsoleError.apply(console, args);
    };
    
    console.warn = (...args: any[]) => {
      const message = args[0]?.toString() || '';
      if (message.includes('ResizeObserver')) {
        return;
      }
      originalConsoleWarn.apply(console, args);
    };

    // Override ResizeObserver to debounce notifications
    if (typeof window !== 'undefined' && window.ResizeObserver) {
      const OriginalResizeObserver = window.ResizeObserver;
      
      window.ResizeObserver = class extends OriginalResizeObserver {
        constructor(callback: ResizeObserverCallback) {
          super(debounce(callback, 16)); // 16ms = ~60fps
        }
      };
    }

    window.addEventListener('error', handleError, true);

    return () => {
      window.removeEventListener('error', handleError, true);
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, []);

  return (
    <ProjectProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        disableTransitionOnChange
      >
        <AuthInitializer />
        <WebSocketProvider>
          <ServerCheck>
            {children}
          </ServerCheck>
        </WebSocketProvider>
      </ThemeProvider>
    </ProjectProvider>
  )
}