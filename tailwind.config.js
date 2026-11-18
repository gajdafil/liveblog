/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Skolar', 'Cambria', 'Literata', 'Georgia', 'Times New Roman', 'serif'],
        serif: ['Skolar', 'Cambria', 'Literata', 'Georgia', 'Times New Roman', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        muni: {
          blue: '#0000DC',
          law: '#9100DC',
          black: '#000000',
          white: '#FFFFFF',
        },
        indigo: {
          50: '#F2F3FF',
          100: '#E2E4FF',
          200: '#C4C8FF',
          300: '#99A0FF',
          400: '#5C66FF',
          500: '#1F2BFF',
          600: '#0000DC', // MUNI modrá (RGB 0/0/220)
          700: '#0000B0',
          800: '#000085',
          900: '#00005C',
          950: '#00003D',
        },
      },
    },
  },
  plugins: [],
};
