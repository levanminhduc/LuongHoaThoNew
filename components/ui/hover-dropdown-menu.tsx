"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, LucideIcon } from "lucide-react";
import React from "react";

export interface DropdownMenuItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  description?: string;
  colorClass?: string;
  iconColorClass?: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface DropdownMenuSection {
  title?: string;
  description?: string;
  items: DropdownMenuItem[];
}

export interface HoverDropdownMenuProps {
  // Trigger button props
  triggerLabel: string;
  triggerIcon?: LucideIcon;
  triggerClassName?: string;

  // Menu props
  menuItems?: DropdownMenuItem[];
  menuSections?: DropdownMenuSection[];
  menuWidth?: string;
  menuAlign?: "start" | "center" | "end";
  sideOffset?: number;

  // Behavior props
  hoverDelay?: number;
  disabled?: boolean;

  // Footer props
  footerText?: string;

  // Styling props
  variant?: "default" | "outline" | "ghost" | "secondary";
}

export function HoverDropdownMenu({
  triggerLabel,
  triggerIcon: TriggerIcon,
  triggerClassName = "",
  menuItems = [],
  menuSections = [],
  menuWidth = "w-80",
  menuAlign = "end",
  sideOffset = 2,
  hoverDelay = 200,
  disabled = false,
  footerText,
  variant = "outline",
}: HoverDropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Combine menuItems and menuSections into a unified structure
  const allSections: DropdownMenuSection[] = [
    ...(menuItems.length > 0 ? [{ items: menuItems }] : []),
    ...menuSections,
  ];

  const handleMenuItemClick = (onClick: () => void) => {
    onClick();
    setIsOpen(false);
  };

  // Hover handlers
  const handleMouseEnter = () => {
    if (disabled) return;

    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    // Open dropdown immediately on hover
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (disabled) return;

    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // Set timeout to close dropdown with delay
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      hoverTimeoutRef.current = null;
    }, hoverDelay);
  };

  // Keep menu open when hovering over content
  const handleContentMouseEnter = () => {
    // Clear any existing timeout to keep menu open
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            disabled={disabled}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`
              flex items-center gap-2 px-4 py-2 h-10
              transition-all duration-200 ease-in-out
              ${triggerClassName}
            `}
          >
            {TriggerIcon && <TriggerIcon className="h-4 w-4" />}
            <span className="font-medium">{triggerLabel}</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ease-in-out ${
                isOpen ? "rotate-180" : "rotate-0"
              }`}
            />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className={`${menuWidth} p-2 bg-white border border-slate-200 shadow-lg rounded-lg`}
          align={menuAlign}
          sideOffset={sideOffset}
          onMouseEnter={handleContentMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {allSections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              {/* Section Header */}
              {section.title && (
                <div className="px-2 py-1.5 mb-1">
                  <p className="text-sm font-semibold text-slate-700">
                    {section.title}
                  </p>
                  {section.description && (
                    <p className="text-xs text-slate-500">
                      {section.description}
                    </p>
                  )}
                </div>
              )}

              {/* Section Separator */}
              {(section.title || sectionIndex > 0) && (
                <DropdownMenuSeparator className="my-1" />
              )}

              {/* Menu Items */}
              {section.items.map((item) => {
                const IconComponent = item.icon;
                return (
                  <DropdownMenuItem
                    key={item.id}
                    disabled={item.disabled}
                    onClick={() => handleMenuItemClick(item.onClick)}
                    className={`
                      flex items-start gap-3 p-3 rounded-md cursor-pointer
                      transition-all duration-200 ease-in-out
                      ${item.colorClass || "text-slate-700 hover:text-slate-800 hover:bg-slate-50"}
                      focus:outline-none focus:ring-2 focus:ring-slate-300
                      group
                      ${item.disabled ? "opacity-50 cursor-not-allowed" : ""}
                    `}
                  >
                    {IconComponent && (
                      <div
                        className={`
                        flex-shrink-0 mt-0.5 p-1.5 rounded-md 
                        bg-white border border-slate-200
                        group-hover:border-current group-hover:bg-current/5
                        transition-all duration-200
                      `}
                      >
                        <IconComponent
                          className={`h-4 w-4 ${item.iconColorClass || "text-slate-600"} group-hover:text-current`}
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm leading-tight">
                        {item.label}
                      </div>
                      {item.description && (
                        <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </DropdownMenuItem>
                );
              })}

              {/* Section Separator after items (except last section) */}
              {sectionIndex < allSections.length - 1 && (
                <DropdownMenuSeparator className="my-2" />
              )}
            </div>
          ))}

          {/* Footer */}
          {footerText && (
            <>
              <DropdownMenuSeparator className="my-2" />
              <div className="px-2 py-1">
                <p className="text-xs text-slate-400 text-center">
                  {footerText}
                </p>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
