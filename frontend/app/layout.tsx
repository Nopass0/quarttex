import type { Metadata } from "next";
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
      <body className="antialiased bg-white dark:bg-[#0f0f0f] text-gray-900 dark:text-[#eeeeee]">
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}