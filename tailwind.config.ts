import type { Config } from "tailwindcss";

// Shared design tokens. Darko and Sops: use these names (bg-surface, text-muted,
// border-line, bg-brand...) rather than raw colours, so the app looks like one app.
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#1f4e79", strong: "#163a5a", soft: "#e8f0f8" },
        ink: "#1c1c1e",
        muted: "#5f6368",
        line: "#dadce0",
        surface: "#ffffff",
        canvas: "#f7f7f5",
        good: "#1e7a46",
        warn: "#a15c00",
        danger: "#b3261e",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
      },
    },
  },
  plugins: [],
} satisfies Config;
