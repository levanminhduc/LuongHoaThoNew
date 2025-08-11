export {
  useClientOnly,
  isClient,
  isServer
} from './useClientOnly'

export {
  useMobile,
  useReducedMotion
} from './useMobile'

export * from '../utils/browser-detection'

export interface ViewportInfo {
  width: number
  height: number
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

export type SSRSafeProps<T> = T & {
  ssrFallback?: React.ReactNode
  showLoadingDuringHydration?: boolean
}
