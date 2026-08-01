"use client";

import { usePathname } from "next/navigation";
import TickerGate from "@/components/TickerGate";
import { SafeClientComponent } from "@/components/safe-client-component";
import { ENABLE_TICKER } from "@/lib/features";

export function AppTickerSlot() {
  const pathname = usePathname();

  if (!ENABLE_TICKER) return null;
  if (pathname?.startsWith("/admin")) return null;

  return (
    <SafeClientComponent componentName="TickerGate" fallback={null}>
      <header className="sticky top-0 z-50">
        <TickerGate />
      </header>
    </SafeClientComponent>
  );
}
