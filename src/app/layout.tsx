import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/lib/contexts/theme-context";
import { SidebarProvider } from "@/lib/contexts/sidebar-context";
import { TimerProvider } from "@/lib/contexts/timer-context";
import { ChatbotProvider } from "@/lib/contexts/chatbot-context";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Allows content to extend into notch/home-indicator areas;
  // we handle safe-area padding ourselves via CSS env() vars.
  viewportFit: "cover",
  themeColor: "#6366f1",
};

export const metadata: Metadata = {
  title: "ProFlow - Productivity Platform",
  description: "All-in-one productivity platform for teams and individuals",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ProFlow",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen antialiased font-sans", inter.variable)}>
        <ThemeProvider>
          <SidebarProvider>
            <TimerProvider>
              <ChatbotProvider>
                {children}
                <Toaster position="bottom-right" richColors closeButton />
              </ChatbotProvider>
            </TimerProvider>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
