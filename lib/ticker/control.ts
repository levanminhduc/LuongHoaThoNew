import { useTickerStore } from "@/lib/stores/ticker-store"

export const showTicker = () => useTickerStore.getState().show()
export const hideTicker = () => useTickerStore.getState().hide()
export const toggleTicker = () => useTickerStore.getState().toggle()
export const setTickerVisible = (v: boolean) => useTickerStore.getState().setVisible(v)

