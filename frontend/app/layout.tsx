import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import "./radix-fixes.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Chase Platform",
  description: "Trading and payment platform",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedProject = localStorage.getItem('selectedProject');
                  const project = savedProject || 'quattrex';
                  const root = document.documentElement;
                  
                  if (project === 'quattrex') {
                    root.setAttribute('data-project', 'quattrex');
                    root.style.setProperty('--primary', '271 91% 65%');
                    root.style.setProperty('--primary-foreground', '0 0% 100%');
                    root.style.setProperty('--accent', '271 85% 58%');
                    root.style.setProperty('--ring', '271 91% 65%');
                  } else {
                    root.setAttribute('data-project', 'chase');
                    root.style.setProperty('--primary', '160 100% 18.8%');
                    root.style.setProperty('--primary-foreground', '0 0% 100%');
                    root.style.setProperty('--accent', '160 50% 95%');
                    root.style.setProperty('--ring', '160 100% 18.8%');
                  }
                } catch (e) {
                  // Default to quattrex if localStorage is not available
                  document.documentElement.setAttribute('data-project', 'quattrex');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased bg-white dark:bg-[#0f0f0f] text-gray-900 dark:text-[#eeeeee]">
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}