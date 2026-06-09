/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Canvas scale — white / paper. `ink-950` is the body bg (matches the
        // CSS body color), deeper numbers go *darker* into light neutral grays
        // so panels still read as recessed. (Kept the key `ink` so className
        // refs migrate; semantics are light-on-light depth.)
        ink: {
          950: "#ffffff",
          900: "#f4f4f5",
          800: "#e9e9eb",
          700: "#dcdce0",
          600: "#c9c9ce",
        },
        // Text / accent scale — graphite to near-black. `sap-50` is the
        // strongest text (was the brightest cream in the dark theme — same
        // role, inverted value).
        sap: {
          50: "#0a0908",
          100: "#18171a",
          200: "#2a2a2c",
          300: "#3f3e40",
          400: "#5b5a5c",
          500: "#7a7976",
          600: "#98968f",
          700: "#b4b1a8",
          800: "#cbc7bd",
          900: "#ddd9ce",
          950: "#ebe6da",
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Archivo"', '"Inter"', 'ui-sans-serif', 'sans-serif'],
        serif: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
        wider2: '0.18em',
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(10,9,8,0.12), 0 18px 50px -16px rgba(10,9,8,0.20)",
        cta: "0 18px 50px -16px rgba(10,9,8,0.40)",
      },
      animation: {
        marquee: "marquee 40s linear infinite",
        caret: "caret 1s steps(1) infinite",
        "drift-slow": "drift 18s ease-in-out infinite",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        caret: {
          "0%, 50%": { opacity: "1" },
          "51%, 100%": { opacity: "0" },
        },
        drift: {
          "0%, 100%": { transform: "translate3d(0,0,0)" },
          "50%": { transform: "translate3d(-12px,8px,0)" },
        },
      },
    },
  },
  plugins: [],
};
