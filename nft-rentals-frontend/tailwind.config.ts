import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        black: {
          primary: "var(--black-primary)",
          secondary: "var(--black-secondary)",
          tertiary: "var(--black-tertiary)",
        },
        silver: {
          primary: "var(--silver-primary)",
          secondary: "var(--silver-secondary)",
        },
        accent: {
          blue: "var(--accent-blue)",
          purple: "var(--accent-purple)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        error: "var(--error)",
      },
      boxShadow: {
        neon: "0 0 10px rgba(0,212,255,0.6), 0 0 20px rgba(168,85,247,0.4)",
        glow: "0 8px 30px rgba(0,212,255,0.25)",
      },
      backgroundImage: {
        'gradient-accent': "linear-gradient(90deg, var(--accent-blue), var(--accent-purple))",
        'gradient-silver': "linear-gradient(180deg, rgba(232,232,232,0.12), rgba(192,192,192,0.04))",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      borderColor: {
        'accent-gradient': "var(--accent-blue)",
      },
    },
  },
  plugins: [],
};
export default config;
