/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          bg: '#0f0f0f',
          sidebar: '#141414',
          card: '#1a1a1a',
          border: '#2a2a2a',
          hover: '#222222',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#818cf8',
          muted: '#4f46e5',
        },
        guided: {
          bg: '#2D0A1E',
          'bg-deep': '#1A0A12',
          accent: '#FF6B9D',
          'accent-hover': '#FF85B1',
          'accent-muted': '#E85D8A',
          glow: 'rgba(255,107,157,0.15)',
          glass: 'rgba(255,255,255,0.06)',
          border: 'rgba(255,255,255,0.08)',
        },
        autopilot: {
          bg: '#060610',
          'bg-deep': '#0D0D1A',
          accent: '#7C3AED',
          'accent-hover': '#8B5CF6',
          'accent-muted': '#6D28D9',
          glow: 'rgba(124,58,237,0.15)',
          glass: 'rgba(255,255,255,0.08)',
          border: 'rgba(255,255,255,0.10)',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        text: {
          primary: '#f9fafb',
          secondary: '#9ca3af',
          muted: '#6b7280',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
}
