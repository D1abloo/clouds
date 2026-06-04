/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        sidebar: {
          bg: '#13151f',
          'bg-light': '#f7f8fc',
          primary: '#7F77DD',
          text: '#e2e4ee',
          muted: '#6b6f85',
          faint: '#444760',
          border: '#2a2d3a',
        },
        app: {
          bg: '#0f1117',
          'bg-light': '#ffffff',
        },
        status: {
          ok: '#4caf50',
          warn: '#ff9800',
          error: '#f44336',
        },
      },
      width: {
        sidebar: '248px',
        'sidebar-collapsed': '64px',
      },
      height: {
        topbar: '48px',
      },
    },
  },
  plugins: [],
}
