"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

export type TickerState = {
  visible: boolean
  show: () => void
  hide: () => void
  toggle: () => void
  setVisible: (v: boolean) => void
}

const createTickerStore = () => {
  // Check if we're on the client side
  if (typeof window === "undefined") {
    // Server-side: return a simple store without persistence
    return create<TickerState>((set) => ({
      visible: false, // Default to false on server to avoid hydration mismatch
      show: () => set({ visible: true }),
      hide: () => set({ visible: false }),
      toggle: () => set((s) => ({ visible: !s.visible })),
      setVisible: (v) => set({ visible: v }),
    }))
  }

  // Client-side: use persisted store with localStorage
  return create<TickerState>()(
    persist(
      (set) => ({
        visible: true,
        show: () => set({ visible: true }),
        hide: () => set({ visible: false }),
        toggle: () => set((s) => ({ visible: !s.visible })),
        setVisible: (v) => set({ visible: v }),
      }),
      {
        name: "ticker-storage",
        storage: createJSONStorage(() => localStorage),
        skipHydration: true, // Skip automatic hydration
      }
    )
  )
}

export const useTickerStore = createTickerStore()

