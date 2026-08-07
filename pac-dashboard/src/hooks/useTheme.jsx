// Provider e hook convivono deliberatamente nello stesso file: separarli
// costringerebbe a riscrivere gli import in tutti i consumer senza alcun beneficio
// a runtime. L'unico effetto è che in sviluppo il Fast Refresh ricarica la pagina
// invece di aggiornare il solo componente.
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(() => {
    if (typeof localStorage === 'undefined') return 'dark'
    return localStorage.getItem('lightMode') === 'true' ? 'light' : 'dark'
  })

  useEffect(() => {
    const root = document.documentElement
    if (tema === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('lightMode', String(tema === 'light'))
  }, [tema])

  function toggleTema() {
    setTema(t => t === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ tema, toggleTema }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
