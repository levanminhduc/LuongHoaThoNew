"use client"

import dynamic from "next/dynamic"
import { ENABLE_TICKER } from "@/lib/features"
import { useClientOnly } from "@/lib/hooks"
import { useTickerStore } from "@/lib/stores/ticker-store"

const TopMarqueeLazy = dynamic(() => import("./TopMarquee"), { ssr: false })

export default function TickerGate() {
  const visible = useTickerStore((s) => s.visible)
  const isClient = useClientOnly(true, false)

  if (!ENABLE_TICKER) return null
  if (!isClient) return null
  if (!visible) return null

  return <TopMarqueeLazy />
}

