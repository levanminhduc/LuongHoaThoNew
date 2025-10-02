export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function isServer(): boolean {
  return typeof window === "undefined";
}

export function hasLocalStorage(): boolean {
  if (!isBrowser()) return false;

  try {
    const testKey = "__localStorage_test__";
    window.localStorage.setItem(testKey, "test");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function hasSessionStorage(): boolean {
  if (!isBrowser()) return false;

  try {
    const testKey = "__sessionStorage_test__";
    window.sessionStorage.setItem(testKey, "test");
    window.sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function getViewportSize(fallback = { width: 1024, height: 768 }) {
  if (!isBrowser()) return fallback;

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

export function isMobileViewport(breakpoint = 768, fallback = false): boolean {
  if (!isBrowser()) return fallback;

  return window.innerWidth < breakpoint;
}

export function prefersReducedMotion(fallback = false): boolean {
  if (!isBrowser() || !window.matchMedia) return fallback;

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function onWindowResize(
  callback: (size: { width: number; height: number }) => void,
  delay = 250,
): () => void {
  if (!isBrowser()) return () => {};

  let timeoutId: NodeJS.Timeout;

  const handleResize = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      callback(getViewportSize());
    }, delay);
  };

  window.addEventListener("resize", handleResize);

  return () => {
    clearTimeout(timeoutId);
    window.removeEventListener("resize", handleResize);
  };
}
