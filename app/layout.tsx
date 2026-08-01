import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "@/components/error-boundary";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/lib/providers/query-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { AdminCommandMenu } from "@/components/admin/admin-command-menu";
import { AppTickerSlot } from "@/components/app-ticker-slot";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tra Cứu Lương Hoà Thọ Điện Bàn",
  description: "MAY HÒA THỌ ĐIỆN BÀN",
  generator: "v0.dev",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "MAY HÒA THỌ ĐIỆN BÀN",
    title: "Tra Cứu Lương Hoà Thọ Điện Bàn",
    description: "Hệ thống tra cứu lương và ký xác nhận nội bộ",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tra Cứu Lương Hoà Thọ Điện Bàn",
    description: "Hệ thống tra cứu lương và ký xác nhận nội bộ",
  },
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
    <html lang="vi" className={inter.variable} suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
        <link rel="icon" href="/favicon.ico?v=2" type="image/x-icon" />
        <link rel="shortcut icon" href="/favicon.ico?v=2" type="image/x-icon" />
      </head>
      <body suppressHydrationWarning className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ErrorBoundary>
            <QueryProvider>
              <AppTickerSlot />
              {children}
              <AdminCommandMenu />
              <Toaster position="top-center" />
            </QueryProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
