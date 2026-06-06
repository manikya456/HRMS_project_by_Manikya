/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        soft: "0 10px 30px rgba(15, 23, 42, 0.12)",
        glow: "0 0 0 1px rgba(99, 102, 241, 0.18), 0 24px 60px rgba(79, 70, 229, 0.18)",
      },
      backgroundImage: {
        "hero-gradient":
          "radial-gradient(circle at top left, rgba(59,130,246,0.22), transparent 35%), radial-gradient(circle at 80% 20%, rgba(16,185,129,0.18), transparent 30%), linear-gradient(135deg, rgba(2,6,23,0.98), rgba(15,23,42,0.94))",
      },
      keyframes: {
        floaty: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        floaty: "floaty 6s ease-in-out infinite",
        fadeUp: "fadeUp 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};
