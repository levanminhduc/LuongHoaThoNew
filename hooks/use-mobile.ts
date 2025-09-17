"use client"

import { useState, useEffect } from "react"

/**
 * Custom hook to detect mobile devices and screen sizes
 * Returns true if the screen width is below the mobile breakpoint (768px)
 */
export function useMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    // Check on mount
    checkIsMobile()

    // Add event listener for window resize
    window.addEventListener("resize", checkIsMobile)

    // Cleanup event listener on unmount
    return () => {
      window.removeEventListener("resize", checkIsMobile)
    }
  }, [])

  return isMobile
}

/**
 * Custom hook to detect various screen sizes
 * Returns an object with boolean values for different breakpoints
 */
export function useScreenSize() {
  const [screenSize, setScreenSize] = useState({
    isMobile: false,    // < 768px
    isTablet: false,    // >= 768px && < 1024px
    isDesktop: false,   // >= 1024px
    isLarge: false,     // >= 1280px
    isXLarge: false,    // >= 1536px
  })

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth
      
      setScreenSize({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        isLarge: width >= 1280,
        isXLarge: width >= 1536,
      })
    }

    // Check on mount
    updateScreenSize()

    // Add event listener for window resize
    window.addEventListener("resize", updateScreenSize)

    // Cleanup event listener on unmount
    return () => {
      window.removeEventListener("resize", updateScreenSize)
    }
  }, [])

  return screenSize
}

/**
 * Custom hook to detect if device is mobile based on user agent
 * This is useful for server-side rendering or when you need to detect
 * mobile devices regardless of screen size
 */
export function useIsMobileDevice() {
  const [isMobileDevice, setIsMobileDevice] = useState(false)

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera

    // Check for mobile devices in user agent
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i
    setIsMobileDevice(mobileRegex.test(userAgent.toLowerCase()))
  }, [])

  return isMobileDevice
}

/**
 * Custom hook that combines screen size and device detection
 * Returns comprehensive mobile/responsive information
 */
export function useResponsive() {
  const isMobile = useMobile()
  const screenSize = useScreenSize()
  const isMobileDevice = useIsMobileDevice()

  return {
    isMobile,
    isMobileDevice,
    isTablet: screenSize.isTablet,
    isDesktop: screenSize.isDesktop,
    isLarge: screenSize.isLarge,
    isXLarge: screenSize.isXLarge,
    // Convenience properties
    isSmallScreen: isMobile,
    isMediumScreen: screenSize.isTablet,
    isLargeScreen: screenSize.isDesktop,
  }
}

// Export default as the most commonly used hook
export default useMobile
