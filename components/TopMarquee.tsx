"use client";
import React from "react";
import Marquee from "react-fast-marquee";
import { tickerConfig } from "@/config/ticker";
import { useReducedMotion, useClientOnly } from "@/lib/hooks";

export default function TopMarquee() {
  // Use SSR-safe hooks - no localStorage logic needed
  const prefersReduced = useReducedMotion(false);
  const isClient = useClientOnly(true, false);

  // Don't render during SSR to prevent hydration mismatch
  if (!isClient) return null;

  // Calculate speed based on reduced motion preference
  const speed = prefersReduced ? Math.max(10, Math.floor(tickerConfig.speed * 0.2)) : tickerConfig.speed;

  return (
    <div style={{ background: "#085bf3ff", color: "#ffffffff" }}>
      <div
        className="flex items-center px-3 py-1 text-sm h-8 sm:h-9"
        style={{ fontFamily: "'Times New Roman', serif", fontSize: "16px" }}
        role="region"
        aria-label="Thông báo chạy"
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <Marquee speed={speed} gradient={false} pauseOnHover={tickerConfig.pauseOnHover}>
            <span>{tickerConfig.messages.join("  •  ")}</span>
            <span aria-hidden className="inline-block md:hidden" style={{ width: tickerConfig.loopSpacingMobilePx }} />
          </Marquee>
        </div>
      </div>
    </div>
  );
}

