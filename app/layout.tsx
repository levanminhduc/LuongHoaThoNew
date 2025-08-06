import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"

export const metadata: Metadata = {
  title: "Tra Cứu Lương Hoà Thọ Điện Bàn",
  description: "MAY HÒA THỌ ĐIỆN BÀN",
  generator: 'v0.dev',
  icons: {
    icon: [
      { url: '/favicon.ico?v=2', type: 'image/x-icon' },
      { url: '/favicon-32x32.png?v=2', sizes: '32x32', type: 'image/png' }
    ],
    shortcut: '/favicon.ico?v=2'
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico?v=2" type="image/x-icon" />
        <link rel="shortcut icon" href="/favicon.ico?v=2" type="image/x-icon" />
        <style>{`
        html {
          font-family: ${GeistSans.style.fontFamily};
          --font-sans: ${GeistSans.variable};
          --font-mono: ${GeistMono.variable};
        }
      `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
