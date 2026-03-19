/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    // Override default spacing / sizing with semantic tokens only
    spacing: {
      px: '1px',
      0: '0px',
      'xs': 'var(--space-xs)',
      'sm': 'var(--space-sm)',
      'md': 'var(--space-md)',
      'lg': 'var(--space-lg)',
      'xl': 'var(--space-xl)',
      '2xl': 'var(--space-2xl)',
      '3xl': 'var(--space-3xl)',
    },
    borderRadius: {
      none: '0',
      sm: 'var(--radius-sm)',
      DEFAULT: 'var(--radius-md)',
      md: 'var(--radius-md)',
      lg: 'var(--radius-lg)',
      xl: 'var(--radius-xl)',
      full: '9999px',
    },
    fontSize: {
      'caption': ['var(--text-caption)', { lineHeight: '1.4' }],
      'body-sm': ['var(--text-body-sm)', { lineHeight: '1.5' }],
      'body': ['var(--text-body)', { lineHeight: '1.6' }],
      'label': ['var(--text-label)', { lineHeight: '1.4', fontWeight: '500' }],
      'heading-sm': ['var(--text-heading-sm)', { lineHeight: '1.3', fontWeight: '600' }],
      'heading': ['var(--text-heading)', { lineHeight: '1.25', fontWeight: '600' }],
      'heading-lg': ['var(--text-heading-lg)', { lineHeight: '1.2', fontWeight: '700' }],
      'display': ['var(--text-display)', { lineHeight: '1.1', fontWeight: '700' }],
      'mono': ['var(--text-mono)', { lineHeight: '1.6', fontFamily: 'var(--font-mono)' }],
    },
    extend: {
      colors: {
        // Semantic color tokens backed by CSS variables
        bg: {
          base: 'var(--color-bg-base)',
          surface: 'var(--color-bg-surface)',
          elevated: 'var(--color-bg-elevated)',
          overlay: 'var(--color-bg-overlay)',
          inverse: 'var(--color-bg-inverse)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          subtle: 'var(--color-border-subtle)',
          strong: 'var(--color-border-strong)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          inverse: 'var(--color-text-inverse)',
          link: 'var(--color-text-link)',
        },
        brand: {
          DEFAULT: 'var(--color-brand)',
          hover: 'var(--color-brand-hover)',
          muted: 'var(--color-brand-muted)',
          subtle: 'var(--color-brand-subtle)',
        },
        status: {
          running: 'var(--color-status-running)',
          pending: 'var(--color-status-pending)',
          failed: 'var(--color-status-failed)',
          succeeded: 'var(--color-status-succeeded)',
          unknown: 'var(--color-status-unknown)',
          warning: 'var(--color-status-warning)',
          'running-bg': 'var(--color-status-running-bg)',
          'pending-bg': 'var(--color-status-pending-bg)',
          'failed-bg': 'var(--color-status-failed-bg)',
          'succeeded-bg': 'var(--color-status-succeeded-bg)',
          'unknown-bg': 'var(--color-status-unknown-bg)',
          'warning-bg': 'var(--color-status-warning-bg)',
        },
        sidebar: {
          bg: 'var(--color-sidebar-bg)',
          text: 'var(--color-sidebar-text)',
          'text-muted': 'var(--color-sidebar-text-muted)',
          active: 'var(--color-sidebar-active)',
          'active-bg': 'var(--color-sidebar-active-bg)',
          hover: 'var(--color-sidebar-hover)',
          border: 'var(--color-sidebar-border)',
        },
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'sans-serif'],
        mono: ['Roboto Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        surface: 'var(--shadow-surface)',
        elevated: 'var(--shadow-elevated)',
        overlay: 'var(--shadow-overlay)',
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        base: 'var(--duration-base)',
        slow: 'var(--duration-slow)',
      },
      width: {
        sidebar: 'var(--sidebar-width)',
        'details-panel': 'var(--details-panel-width)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

