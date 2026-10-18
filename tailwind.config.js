/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        zzz: {
          // Core Surface & Viewport
          obsidian: '#0D0E12',
          surface: '#16181D',
          'surface-hover': '#1E2127',
          elevated: '#242831',
          border: '#2E3342',
          'border-bright': '#4A5268',

          // High-Voltage Accents
          yellow: '#F2FF00',
          'yellow-dim': '#CBE300',
          danger: '#FF3B30',
          orange: '#FF7700',
          cyan: '#00F0FF',
          purple: '#B33BFF',

          // Typography
          text: '#FFFFFF',
          'text-secondary': '#A0A5B5',
          'text-muted': '#5C6275',

          // Aliases for convenience
          bg: '#0D0E12',
          card: '#16181D',
        },
      },
      fontFamily: {
        display: ['"Chakra Petch"', 'Impact', 'Teko', '"Arial Black"', 'sans-serif'],
        hud: ['"Chakra Petch"', 'Impact', 'Teko', '"Arial Black"', 'sans-serif'],
        comic: ['Bangers', 'Impact', '"Arial Black"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'Consolas', '"Courier New"', 'monospace'],
        body: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'zzz-glow': '0 0 15px rgba(242, 255, 0, 0.4)',
        'zzz-glow-cyan': '0 0 15px rgba(0, 240, 255, 0.4)',
        'zzz-glow-danger': '0 0 15px rgba(255, 59, 48, 0.4)',
        'zzz-hard': '4px 4px 0px #000000',
        'zzz-hard-yellow': '4px 4px 0px #F2FF00',
      },
      keyframes: {
        glitch: {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
        },
        stamp: {
          '0%': { transform: 'scale(3) rotate(-25deg)', opacity: '0' },
          '60%': { transform: 'scale(0.92) rotate(-10deg)', opacity: '1' },
          '80%': { transform: 'scale(1.04) rotate(-10deg)' },
          '100%': { transform: 'scale(1) rotate(-10deg)', opacity: '1' },
        },
        'bangboo-breathe': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-4px) scale(1.02, 0.98)' },
        },
        'bangboo-jump': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '30%': { transform: 'translateY(-16px) scale(0.95, 1.08)' },
          '60%': { transform: 'translateY(-4px) scale(1.04, 0.96)' },
        },
        'bangboo-spin': {
          '0%': { transform: 'rotate(0deg) scale(1)' },
          '50%': { transform: 'rotate(180deg) scale(1.2)' },
          '100%': { transform: 'rotate(360deg) scale(1)' },
        },
        'bangboo-wiggle': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-8deg)' },
          '75%': { transform: 'rotate(8deg)' },
        },
        'bangboo-poke': {
          '0%': { transform: 'scale(1)' },
          '30%': { transform: 'scale(1.15, 0.85)' },
          '60%': { transform: 'scale(0.92, 1.08)' },
          '100%': { transform: 'scale(1)' },
        },
        'pulse-fast': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        glitch: 'glitch 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        stamp: 'stamp 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'bangboo-breathe': 'bangboo-breathe 2.5s ease-in-out infinite',
        'bangboo-jump': 'bangboo-jump 0.5s ease-in-out',
        'bangboo-spin': 'bangboo-spin 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'bangboo-wiggle': 'bangboo-wiggle 0.3s ease-in-out infinite',
        'bangboo-poke': 'bangboo-poke 0.4s ease-out',
        'pulse-fast': 'pulse-fast 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
