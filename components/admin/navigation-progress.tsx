"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useNavigationPending } from "@/components/admin/navigation-pending-context";

export function NavigationProgress() {
  const { isPending } = useNavigationPending();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isPending) {
      if (!visible) return;
      setProgress(100);
      const done = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200);
      return () => clearTimeout(done);
    }

    setVisible(true);
    setProgress(15);
    const t1 = setTimeout(() => setProgress(45), 100);
    const t2 = setTimeout(() => setProgress(70), 300);
    const t3 = setTimeout(() => setProgress(85), 700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isPending, visible]);

  if (!visible) return null;

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
