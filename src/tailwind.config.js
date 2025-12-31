/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // we control dark mode manually
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        // Marslab brand reds
        mars: {
          50: "#fff1f2",
          100: "#ffe4e6",
          200: "#fecdd3",
          300: "#fda4af",
          400: "#fb7185",
          500: "#ef4444", // primary
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d"
        }
      },

      backgroundImage: {
        "mars-gradient":
          "linear-gradient(135deg, #ef4444 0%, #b91c1c 50%, #7f1d1d 100%)",
        "mars-radial":
          "radial-gradient(circle at top, rgba(239,68,68,0.25), transparent 60%)",
        "glass-shimmer":
          "linear-gradient(120deg, transparent, rgba(255,255,255,0.25), transparent)"
      },

      boxShadow: {
        glass:
          "0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)",
        glow:
          "0 0 40px rgba(239,68,68,0.55)",
        glowSoft:
          "0 0 24px rgba(239,68,68,0.35)",
        glowHard:
          "0 0 60px rgba(239,68,68,0.85)"
      },

      backdropBlur: {
        glass: "18px"
      },

      borderRadius: {
        xl: "1.25rem",
        "2xl": "1.75rem",
        "3xl": "2.25rem"
      },

      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" }
        },
        glowPulse: {
          "0%, 100%": { opacity: 0.6 },
          "50%": { opacity: 1 }
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" }
        },
        spinSlow: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" }
        }
      },

      animation: {
        float: "float 6s ease-in-out infinite",
        glow: "glowPulse 2.2s ease-in-out infinite",
        shimmer: "shimmer 2.4s infinite",
        spinSlow: "spinSlow 18s linear infinite"
      }
    }
  },
  plugins: [
    require("@tailwindcss/forms")
  ]
};
