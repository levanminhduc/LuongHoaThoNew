"use client"

import { useState, useEffect } from "react"

export function useClientOnly<T>(
  clientValue: T,
  serverValue?: T
): T | undefined {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return mounted ? clientValue : serverValue
}

export function isClient(): boolean {
  return typeof window !== 'undefined'
}

export function isServer(): boolean {
  return typeof window === 'undefined'
}
