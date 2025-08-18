
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', "[data-color-scheme='dark']"],
    theme: {
    fontSize:{
      xs: '0.55rem',
      sm: '0.8rem',
      base: '1rem',
      xl: '1.25rem',
      '2xl': '1.563rem',
      '3xl': '1.953rem',
      '4xl': '2.441rem',
      '5xl': '3.052rem',
      'title': '26px'
    },
    fontWeight: {
      thin: '100',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900',
    },
    extend: {
      fontFamily: {
        pacifico: ['Pacifico', 'cursive'],
        comfortaa: ['Comfortaa', 'sans-serif'],
      },
      backgroundPosition: {
        bottom: 'bottom',
        'bottom-4': 'center bottom 1rem',
        center: 'center',
        left: 'left',
        'left-bottom': 'left bottom',
        'left-top': 'left top',
        right: 'right',
        'right-bottom': 'right bottom',
        'right-top': 'right top',
        top: 'top',
        'top-4': 'center top 1rem',
      },
      boxShadow: {
        '3xl': '0 35px 60px 5px rgba(0, 0, 0, .9)',
      },
      spacing: {
        'half-screen': '55vh',
        'screen-20': '120vh',
        'main-btn': '4dvh'
      }
    },
    colors: {
      'dark': "#14181C",
      'light': '#e9eff8',
      'mainBtn': '#0C61FD',
      'darkCard': '#192025',
      'transparent': 'transparent',
      'white': '#ffffff',
      'black': '#000000',
      'dark-switch': '#2b2b2f',
      'purple': '#3f3cbb',
      'blue': '#316ff4',
      'midnight': '#121063',
      'metal': '#565584',
      'tahiti': '#3ab7bf',
      'silver': '#f0eef6',
      'bubble-gum': '#ff77e9',
      'bermuda': '#78dcca',
      'gray': '#808080',
      'gray-300': '#E0E0E0',
      'gray-500': '#9E9E9E',
      'red': '#FF0000',
      'orange': '#FFA500',
      'orange-600': '#FB8C00',
      'light-gray': '#D3D3D3',
      'lightSlate-gray': '#778899',
      'DimGray': '#696969',
      'darkGray': '#141616',
    }
  },
  plugins: [],
};
