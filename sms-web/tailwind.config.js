/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50:'#e8f0fb', 100:'#c5d7f5', 200:'#9dbdee', 300:'#74a2e6', 400:'#538ddf', 500:'#1E3A5F', 600:'#1a3356', 700:'#152a47', 800:'#112038', 900:'#0c1729' },
        success: { 50:'#eaf3de', 500:'#27500A', 600:'#1f3e08' },
        warning: { 50:'#faeeda', 500:'#633806', 600:'#4d2b05' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
