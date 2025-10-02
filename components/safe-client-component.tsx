"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * SafeClientComponent wraps components that might fail on certain mobile devices
 * It provides error boundaries and hydration safety
 */
export class SafeClientComponent extends Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    // Log the error with component name for easier debugging
    console.warn(
      `[SafeClientComponent] Error in ${this.props.componentName || "component"}:`,
      error.message,
    );
  }

  render() {
    if (this.state.hasError) {
      // Return fallback or nothing if component fails
      return this.props.fallback || null;
    }

    return this.props.children;
  }
}

/**
 * Hook version for functional components
 */
export function useSafeClient() {
  if (typeof window === "undefined") {
    return {
      isClient: false,
      isSafe: false,
    };
  }

  try {
    // Check for basic browser features
    const hasLocalStorage = "localStorage" in window;
    const hasSessionStorage = "sessionStorage" in window;
    const hasJSON = "JSON" in window && typeof JSON.parse === "function";

    return {
      isClient: true,
      isSafe: hasLocalStorage && hasSessionStorage && hasJSON,
    };
  } catch {
    return {
      isClient: true,
      isSafe: false,
    };
  }
}
