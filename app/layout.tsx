import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import TickerGate from "@/components/TickerGate";
import { ENABLE_TICKER } from "@/lib/features";
import ErrorBoundary from "@/components/error-boundary";
import { SafeClientComponent } from "@/components/safe-client-component";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tra Cứu Lương Hoà Thọ Điện Bàn",
  description: "MAY HÒA THỌ ĐIỆN BÀN",
  generator: "v0.dev",
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", type: "image/x-icon" },
      { url: "/favicon-32x32.png?v=2", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={inter.variable}>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
        <link rel="icon" href="/favicon.ico?v=2" type="image/x-icon" />
        <link rel="shortcut icon" href="/favicon.ico?v=2" type="image/x-icon" />
      </head>
      <body suppressHydrationWarning className={inter.className}>
        <ErrorBoundary>
          {ENABLE_TICKER ? (
            <SafeClientComponent componentName="TickerGate" fallback={null}>
              <header className="sticky top-0 z-50">
                <TickerGate />
              </header>
            </SafeClientComponent>
          ) : null}
          {children}
          <Toaster position="top-center" />
        </ErrorBoundary>
      </body>
    </html>
  );
}
