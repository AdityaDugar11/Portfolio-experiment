/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        signal: {
          ivory: '#FAF7F2',
          peach: '#F4B896',
          coral: '#E06D53',
          sky: '#94B9D8',
          aqua: '#A3D5D7',
          champagne: '#E5A862',
          sandstone: '#2A1B16',
          terracotta: '#C85A3D',
          twilight: '#181210',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
