import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
enabled: !!import.meta.env.VITE_SENTRY_DSN && !import.meta.env.DEV,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: 1.0,
  // Set `tracePropagationTargets` to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ["localhost", /^https:\/\/etflens.app/],
  // Dati finanziari: non registrare sessioni normali, solo in caso di errore
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: 1.0,
})
