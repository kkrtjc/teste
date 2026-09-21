import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.tsx'
import './index.css'
import { GlobalErrorBoundary } from './components/ErrorBoundary.tsx'

// ── Sentry Error Monitoring — only active in production with a valid DSN ──
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
if (SENTRY_DSN && import.meta.env.PROD) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: `mura-manager@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
    // Only report 100% of errors (increase to control volume on scale)
    tracesSampleRate: 0.1,
    // Prevent PII from being sent
    beforeSend(event) {
      // Strip any email or CPF from the event payload
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
    // Ignore known non-critical errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      /^AbortError/,
      /^NetworkError/,
    ],
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>,
)
