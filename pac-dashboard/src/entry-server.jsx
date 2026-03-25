import { renderToString } from 'react-dom/server'
import { StrictMode } from 'react'
import App from './App.jsx'

export function render(url) {
  return renderToString(
    <StrictMode>
      <App url={url} />
    </StrictMode>
  )
}
