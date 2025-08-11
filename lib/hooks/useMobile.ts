"use client"

import { useState, useEffect } from "react"
import { isBrowser, isMobileViewport, onWindowResize } from "@/lib/utils/browser-detection"

interface UseMobileOptions {
  breakpoint?: number
  fallback?: boolean
  debounceDelay?: number
}

export function useMobile(options: UseMobileOptions = {}): boolean {
  const {
    breakpoint = 768,
    fallback = false,
    debounceDelay = 250
  } = options

  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(fallback)

  useEffect(() => {
    setMounted(true)

    if (!isBrowser()) return

    setIsMobile(isMobileViewport(breakpoint, fallback))

    const cleanup = onWindowResize((size) => {
      setIsMobile(size.width < breakpoint)
    }, debounceDelay)

    return cleanup
  }, [breakpoint, fallback, debounceDelay])

  return mounted ? isMobile : fallback
}

export function useReducedMotion(fallback = false): boolean {
  const [mounted, setMounted] = useState(false)
  const [prefersReduced, setPrefersReduced] = useState(fallback)

  useEffect(() => {
    setMounted(true)

    if (!isBrowser() || !window.matchMedia) return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const updatePreference = () => {
      setPrefersReduced(mediaQuery.matches)
    }

    updatePreference()

    mediaQuery.addEventListener('change', updatePreference)

    return () => {
      mediaQuery.removeEventListener('change', updatePreference)
    }
  }, [])

  return mounted ? prefersReduced : fallback
}
