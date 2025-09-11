"use client"

import { ReactNode, useState, useEffect } from "react"

interface ClientWrapperProps {
  children: ReactNode
  fallback?: ReactNode
}

export default function ClientWrapper({ children, fallback = null }: ClientWrapperProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR and initial hydration, show fallback or nothing
  if (!mounted) {
    return <>{fallback}</>
  }

  // After hydration, show the actual content
  return <>{children}</>
}
