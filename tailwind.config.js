export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: '#09090b',
        surface: '#121215', 
        primary: '#F59E0B',
        secondary: '#DC2626',
        text: '#FAFAFA',
        muted: '#A1A1AA',
      },
      backgroundImage: {
        'crazy-gradient': 'linear-gradient(135deg, #F59E0B 0%, #DC2626 100%)',
        'crazy-gradient-hover': 'linear-gradient(135deg, #D97706 0%, #B91C1C 100%)',
        'glass-gradient': 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
        'glow-conic': 'conic-gradient(from 180deg at 50% 50%, #2a8af6 0deg, #a853ba 180deg, #e92a67 360deg)',
        'flare-gradient': 'conic-gradient(from 0deg at 50% 50%, #DC2626 0deg, #F59E0B 120deg, #7C3AED 240deg, #DC2626 360deg)',
      },
      animation: {
        'progress-indefinite': 'progressIndefinite 1.5s linear infinite',
        'fade-in-up': 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fadeIn 1s ease-out forwards',
        'fade-out': 'fadeOut 1s ease-in forwards',
        'page-enter': 'pageEnter 0.9s cubic-bezier(0.19, 1, 0.22, 1) forwards',
        'pulse-slow': 'pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 8s ease-in-out infinite',
        'shine': 'shine 2s linear infinite',
        'scale-in': 'scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'spin-slow': 'spin 20s linear infinite',
        'spin-reverse-slow': 'spin 25s linear infinite reverse',
        'meteor': 'meteor 5s linear infinite',
        'twinkle': 'twinkle 4s ease-in-out infinite',
        'letter-slam': 'letterSlam 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
        'zoom-pulse': 'zoomPulse 2s ease-in-out infinite',
        'slide-down-reveal': 'slideDownReveal 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)', filter: 'blur(4px)' },
          '100%': { opacity: '1', transform: 'none', filter: 'none' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        pageEnter: {
          '0%': { opacity: '0', transform: 'translateY(15px) scale(0.98)', filter: 'blur(8px)' },
          '100%': { opacity: '1', transform: 'none', filter: 'none' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shine: {
          '0%': { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.92)', opacity: '0', filter: 'blur(4px)' },
          '100%': { transform: 'none', opacity: '1', filter: 'none' },
        },
        meteor: {
          '0%': { transform: 'rotate(215deg) translateX(0)', opacity: '1' },
          '70%': { opacity: '1' },
          '100%': { transform: 'rotate(215deg) translateX(-500px)', opacity: '0' },
        },
        twinkle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        letterSlam: {
          '0%': { opacity: '0', transform: 'scale(10) translateZ(0)', filter: 'blur(10px)' },
          '40%': { opacity: '1' },
          '100%': { opacity: '1', transform: 'scale(1) translateZ(0)', filter: 'blur(0px)' }
        },
        zoomPulse: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' }
        },
        slideDownReveal: {
          '0%': { transform: 'translateY(-80px)', opacity: '0' },
          '100%': { transform: 'none', opacity: '1' }
        },
        progressIndefinite: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        }
      },
      boxShadow: {
        'glow': '0 0 20px -5px rgba(245, 158, 11, 0.3)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      }
    }
  }
}
