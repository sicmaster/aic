import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: '#d7dde5',
        canvas: '#f7f8fa',
        ink: '#17202e',
        muted: '#667085',
        panel: '#ffffff',
        primary: '#176b87',
        success: '#16835c',
        warning: '#b76e00',
        danger: '#b42318',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
          'Apple Color Emoji',
          'Segoe UI Emoji',
        ],
      },
    },
  },
  plugins: [],
};

export default config;
