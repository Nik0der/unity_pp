/** @type {import('tailwindcss').Config} */
import forms from '@tailwindcss/forms'
export default {
  content: ["./index.html","./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter","ui-sans-serif","system-ui","-apple-system","Segoe UI","Roboto"] },
      boxShadow: {
        soft: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 10px 30px -15px rgba(0,0,0,.5)",
      }
    }
  },
  plugins: [forms],
}
