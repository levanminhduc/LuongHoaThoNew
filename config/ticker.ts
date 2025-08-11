export type TickerConfig = {
  messages: string[]
  speed: number
  pauseOnHover: boolean
  showCloseButton: boolean
  /** Pixel width of the spacer inserted at the end of the marquee loop for small screens */
  loopSpacingMobilePx?: number
}

export const tickerConfig: TickerConfig = {
  messages: [
    "Chào mừng bạn đến với Hệ thống Tra cứu và Ký nhận lương Công Ty May Hòa Thọ Điện Bàn",
  ],
  speed: 50,
  pauseOnHover: true,
  showCloseButton: false, // Disable dismiss functionality
  loopSpacingMobilePx: 48,
}

