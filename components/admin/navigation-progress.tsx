"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavigationProgress() {
  const pathname = usePathname();
  const [isPending] = useTransition();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setIsNavigating(true);
    setProgress(0);

    const timer1 = setTimeout(() => setProgress(30), 50);
    const timer2 = setTimeout(() => setProgress(60), 150);
    const timer3 = setTimeout(() => setProgress(80), 300);
    const timer4 = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setIsNavigating(false);
        setProgress(0);
      }, 200);
    }, 400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [pathname]);

  if (!isNavigating && !isPending) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1">
      <div
        className={cn(
          "h-full bg-primary transition-all duration-300 ease-out",
          progress === 100 && "opacity-0",
        )}
        style={{ width: `${progress}%` }}
      />
      <div
        className={cn(
          "absolute right-0 top-0 h-full w-24 bg-gradient-to-r from-transparent to-primary/50",
          "animate-pulse",
          progress === 100 && "opacity-0",
        )}
        style={{
          transform: `translateX(${progress < 100 ? "0" : "100%"})`,
        }}
      />
    </div>
  );
}
