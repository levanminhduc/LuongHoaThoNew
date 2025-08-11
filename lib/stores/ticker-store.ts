"use client"

import { create } from "zustand"

export type TickerState = {
  visible: boolean
  show: () => void
  hide: () => void
  toggle: () => void
  setVisible: (v: boolean) => void
}

export const useTickerStore = create<TickerState>((set) => ({
  visible: true,
  show: () => set({ visible: true }),
  hide: () => set({ visible: false }),
  toggle: () => set((s) => ({ visible: !s.visible })),
  setVisible: (v) => set({ visible: v }),
}))

