"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface AnimatedGradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  className?: string
  variant?: "default" | "teal" | "blue" | "green"
}

const AnimatedGradientButton = React.forwardRef<HTMLButtonElement, AnimatedGradientButtonProps>(
  ({ className, children, variant = "teal", ...props }, ref) => {
    const variantStyles = {
      teal: {
        background: "radial-gradient(ellipse 80% 50% at 50% 120%, #037d77, #037d77)",
        hoverShadow: "hover:shadow-[1px_3px_45px_-11px_#03706b]"
      },
      blue: {
        background: "radial-gradient(ellipse 80% 50% at 50% 120%, #1e40af, #1e40af)",
        hoverShadow: "hover:shadow-[1px_3px_45px_-11px_#1e3a8a]"
      },
      green: {
        background: "radial-gradient(ellipse 80% 50% at 50% 120%, #059669, #059669)",
        hoverShadow: "hover:shadow-[1px_3px_45px_-11px_#047857]"
      },
      default: {
        background: "radial-gradient(ellipse 80% 50% at 50% 120%, #6366f1, #6366f1)",
        hoverShadow: "hover:shadow-[1px_3px_45px_-11px_#4f46e5]"
      }
    }

    const currentVariant = variantStyles[variant]

    return (
      <>
        <style jsx>{`
          @keyframes spin-gradient {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
          .rotate-gradient {
            animation: spin-gradient 4s linear infinite;
          }
        `}</style>
        
        <button
          ref={ref}
          className={cn(
            "group relative cursor-pointer overflow-hidden whitespace-nowrap p-4 text-white rounded-lg transition-all duration-300 hover:scale-105 flex justify-center",
            currentVariant.hoverShadow,
            className
          )}
          style={{
            background: currentVariant.background,
            "--spread": "90deg",
            "--shimmer-color": "#ffffff",
            "--radius": "5px",
            "--speed": "1.5s",
            "--cut": "2px"
          } as React.CSSProperties}
          {...props}
        >
          {/* Rotating gradient overlay */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-[-100%] rotate-gradient">
              <div
                className="absolute inset-0"
                style={{
                  background: "conic-gradient(from calc(270deg - (var(--spread) * 0.5)), transparent 0, hsl(0 0% 100% / 1) var(--spread), transparent var(--spread))"
                }}
              />
            </div>
          </div>
          
          {/* Inner background */}
          <div 
            className="absolute rounded-lg"
            style={{
              background: currentVariant.background,
              inset: "var(--cut)"
            }}
          />
          
          {/* Content */}
          <span className="z-10 w-48 bg-gradient-to-b from-black from-30% to-gray-300/80 bg-clip-text text-l text-center font-normal leading-none tracking-tight text-white">
            {children}
          </span>
        </button>
      </>
    )
  }
)

AnimatedGradientButton.displayName = "AnimatedGradientButton"

export { AnimatedGradientButton }
