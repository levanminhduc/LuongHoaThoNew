import type { Config } from "tailwindcss";

// all in fixtures is set to tailwind v3 as interims solutions

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: "475px",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "employee-card-shine": {
          "0%": {
            transform: "translateX(0) skewX(-18deg)",
          },
          "42%, 100%": {
            transform: "translateX(360%) skewX(-18deg)",
          },
        },
        "employee-detail-pulse": {
          "0%, 100%": {
            boxShadow:
              "0 14px 30px -14px rgba(37,99,235,0.95), inset 0 1px 0 rgba(255,255,255,0.34), 0 0 0 0 rgba(14,165,233,0)",
            filter: "brightness(1)",
          },
          "18%": {
            boxShadow:
              "0 20px 42px -12px rgba(37,99,235,1), inset 0 1px 0 rgba(255,255,255,0.48), 0 0 0 5px rgba(14,165,233,0.22)",
            filter: "brightness(1.16)",
          },
          "36%": {
            boxShadow:
              "0 16px 34px -14px rgba(37,99,235,0.98), inset 0 1px 0 rgba(255,255,255,0.38), 0 0 0 9px rgba(14,165,233,0)",
            filter: "brightness(1.04)",
          },
        },
        "employee-detail-flash": {
          "0%, 100%": {
            opacity: "0.36",
          },
          "18%": {
            opacity: "1",
          },
          "36%": {
            opacity: "0.5",
          },
        },
        "lookup-guide-signal": {
          "0%": {
            opacity: "0.78",
            transform: "scale(0.7)",
          },
          "55%, 100%": {
            opacity: "0",
            transform: "scale(1.45)",
          },
        },
        "lookup-guide-glow": {
          "0%, 100%": {
            opacity: "0.18",
            transform: "scale(0.9)",
          },
          "28%": {
            opacity: "0.52",
            transform: "scale(1.1)",
          },
        },
        "lookup-guide-pop": {
          "0%, 100%": {
            boxShadow:
              "0 0 0 2px rgba(37,99,235,0.08), 0 0 0 0 rgba(37,99,235,0)",
            filter: "brightness(1)",
          },
          "28%": {
            boxShadow:
              "0 0 0 2px rgba(37,99,235,0.16), 0 0 18px 0 rgba(37,99,235,0.32)",
            filter: "brightness(1.12)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "employee-card-shine": "employee-card-shine 4.2s ease-in-out infinite",
        "employee-detail-flash":
          "employee-detail-flash 2.35s ease-in-out infinite",
        "employee-detail-pulse":
          "employee-detail-pulse 2.35s ease-in-out infinite",
        "employee-detail-shine":
          "employee-card-shine 2.35s cubic-bezier(0.22,1,0.36,1) infinite",
        "lookup-guide-glow": "lookup-guide-glow 1.8s ease-out infinite",
        "lookup-guide-pop": "lookup-guide-pop 1.8s ease-out infinite",
        "lookup-guide-signal": "lookup-guide-signal 1.8s ease-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
