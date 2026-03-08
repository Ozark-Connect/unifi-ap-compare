/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'unifi-blue': '#0559C9',
        'unifi-blue-bright': '#1A7AFF',
        'unifi-bg': '#0f1119',
        'unifi-surface': '#181b25',
        'unifi-surface-2': '#1f2330',
        'unifi-border': '#2a2e3d',
        'unifi-text': '#e8eaf0',
        'unifi-text-secondary': '#8b90a0',
        'unifi-green': '#22c55e',
        'unifi-amber': '#f59e0b',
        'unifi-red': '#ef4444',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Source Code Pro"', 'monospace'],
        sans: ['"DM Sans"', '"Manrope"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
