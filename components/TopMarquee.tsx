"use client";
import React, { useState, useEffect } from "react";
import Marquee from "react-fast-marquee";
import { tickerConfig } from "@/config/ticker";

export default function TopMarquee() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render during SSR to prevent hydration mismatch
  if (!mounted) return null;

  // Use default speed - avoid complex motion detection that might fail on some devices
  const speed = tickerConfig.speed || 30;

  return (
    <div style={{ background: "#085bf3ff", color: "#ffffffff" }}>
      <div
        className="flex items-center px-3 py-1 text-sm h-8 sm:h-9"
        style={{ fontFamily: "'Times New Roman', serif", fontSize: "16px" }}
        role="region"
        aria-label="Thông báo chạy"
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <Marquee
            speed={speed}
            gradient={false}
            pauseOnHover={tickerConfig.pauseOnHover}
          >
            <span>{tickerConfig.messages.join("  •  ")}</span>
            <span
              aria-hidden
              className="inline-block md:hidden"
              style={{ width: tickerConfig.loopSpacingMobilePx }}
            />
          </Marquee>
        </div>
      </div>
    </div>
  );
}
