"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Gift } from "lucide-react";
import { BonusViewModal } from "@/components/bonus/bonus-view-modal";

interface BonusViewButtonProps {
  departments?: string[];
  className?: string;
}

export function BonusViewButton({
  departments,
  className,
}: BonusViewButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={className}
      >
        <Gift data-icon="inline-start" className="h-4 w-4 text-pink-600" />
        Xem Thưởng
      </Button>
      {isOpen && (
        <BonusViewModal
          isOpen
          onClose={() => setIsOpen(false)}
          departments={departments}
        />
      )}
    </>
  );
}
