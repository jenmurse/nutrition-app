import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      /* ═══════════════════════════════════════════════════════════════════════
         QUIET SURFACE DESIGN SYSTEM — Tailwind Configuration
         ═══════════════════════════════════════════════════════════════════════ */
      
      /* Font Families */
      fontFamily: {
        sans: ["var(--font-sans)", "DM Sans", "sans-serif"],
        mono: ["var(--font-mono)", "DM Mono", "monospace"],
      },

      /* Typography Scale */
      fontSize: {
        title: "var(--fs-title)",      // 16px compact, 18px relaxed
        field: "var(--fs-field)",      // 14px compact, 16px relaxed
        label: "var(--fs-label)",      // 12px compact, 14px relaxed
        body: "var(--fs-body)",        // 11px compact, 13px relaxed
        action: "var(--fs-action)",    // 9px compact, 10px relaxed
        ui: "var(--fs-ui)",            // 10px compact, 11px relaxed
      },

      /* Letter Spacing */
      letterSpacing: {
        action: "0.1em",
        label: "0.12em",
        tight: "-0.01em",
        normal: "0.02em",
        wide: "0.04em",
        wider: "0.06em",
        widest: "0.08em",
      },

      /* Colors — mapped from CSS custom properties */
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
          DEFAULT: "hsl(var(--muted-hsl))",
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
      },

      /* Border Radius — always 0 for Quiet Surface aesthetic */
      borderRadius: {
        lg: "var(--radius)",
        md: "var(--radius)",
        sm: "var(--radius)",
        DEFAULT: "var(--radius)",
      },

      /* Spacing Scale — 4px increments per design system */
      spacing: {
        "micro": "4px",
        "icon": "6px",
        "compact": "8px",
        "list": "10px",
        "small": "12px",
        "section": "14px",
        "base": "16px",
        "medium": "20px",
        "large": "24px",
        "container": "28px",
        "section-lg": "32px",
        "section-xl": "36px",
        "page": "40px",
        "section-bottom": "44px",
        "container-lg": "48px",
      },

      /* Container Widths */
      maxWidth: {
        sidebar: "220px",
        content: "596px",
        settings: "596px",
        modal: "380px",
        onboarding: "480px",
      },

      /* Transition Durations */
      transitionDuration: {
        fast: "100ms",
        normal: "150ms",
        slow: "300ms",
      },

      /* Animation */
      keyframes: {
        "slide-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "slide-in": "slide-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "fade-in": "fade-in 0.5s ease-in-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
