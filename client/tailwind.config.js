/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        vault: {
          'bg-deep':     '#080614',
          'bg-surface':  '#120D2A',
          'bg-elevated': '#1E1545',
          'bg-card':     '#160F35',
          'border':      '#2A1F5A',
          'border-light':'#3D2E7A',
          'violet':      '#7B3FE4',
          'violet-light':'#9B5FFF',
          'blue':        '#3B7FE8',
          'blue-light':  '#5B9FFF',
          'glow':        '#A06EFF',
          'text-primary':'#E8E4FF',
          'text-secondary':'#A89FCC',
          'text-muted':  '#5E5580',
          'success':     '#22D3A0',
          'danger':      '#FF4D6A',
          'warning':     '#F5A623',
          'gold':        '#FFD700',
        },
      },
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'vault-gradient': 'linear-gradient(135deg, #080614 0%, #120D2A 50%, #0D0B20 100%)',
        'card-gradient': 'linear-gradient(135deg, #1E1545 0%, #160F35 100%)',
        'violet-gradient': 'linear-gradient(135deg, #7B3FE4 0%, #5B2BC8 100%)',
        'glow-radial': 'radial-gradient(ellipse at center, rgba(123,63,228,0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'vault': '0 0 0 1px rgba(123,63,228,0.3)',
        'vault-hover': '0 0 0 1px rgba(160,110,255,0.6), 0 4px 20px rgba(123,63,228,0.2)',
        'glow-sm': '0 0 12px rgba(123,63,228,0.4)',
        'glow-md': '0 0 24px rgba(123,63,228,0.5)',
        'glow-lg': '0 0 48px rgba(123,63,228,0.4)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'danger': '0 0 12px rgba(255,77,106,0.4)',
        'success': '0 0 12px rgba(34,211,160,0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease forwards',
        'slide-in-left': 'slideInLeft 0.35s cubic-bezier(0.16,1,0.3,1) forwards',
        'slide-in-up': 'slideInUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-in': 'bounceIn 0.4s cubic-bezier(0.36,0.07,0.19,0.97) forwards',
        'mine-explode': 'mineExplode 0.5s ease forwards',
        'tile-flip': 'tileFlip 0.3s ease forwards',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideInLeft: {
          from: { transform: 'translateX(-100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        slideInUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(123,63,228,0.4)' },
          '50%': { boxShadow: '0 0 32px rgba(123,63,228,0.8)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '60%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        mineExplode: {
          '0%': { transform: 'scale(1)', backgroundColor: 'rgba(255,77,106,0.3)' },
          '50%': { transform: 'scale(1.2)', backgroundColor: 'rgba(255,77,106,0.8)' },
          '100%': { transform: 'scale(1)', backgroundColor: 'rgba(255,77,106,0.2)' },
        },
        tileFlip: {
          '0%': { transform: 'rotateY(0deg)' },
          '50%': { transform: 'rotateY(90deg)' },
          '100%': { transform: 'rotateY(0deg)' },
        },
      },
    },
  },
  plugins: [],
};
