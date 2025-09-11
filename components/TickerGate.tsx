"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { ENABLE_TICKER } from "@/lib/features"

const TopMarqueeLazy = dynamic(() => import("./TopMarquee"), { 
  ssr: false,
  loading: () => null 
})

export default function TickerGate() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render anything during SSR or if ticker is disabled
  if (!ENABLE_TICKER || !mounted) {
    return null
  }

  return <TopMarqueeLazy />
}

