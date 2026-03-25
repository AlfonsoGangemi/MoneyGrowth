import './instrument.js'
import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'

const container = document.getElementById('root')
const sentryOptions = {
  onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
    console.warn('Uncaught error', error, errorInfo)
  }),
  onCaughtError: Sentry.reactErrorHandler(),
}
const app = <StrictMode><App /></StrictMode>

if (container.innerHTML) {
  hydrateRoot(container, app, sentryOptions)
} else {
  createRoot(container, sentryOptions).render(app)
}
