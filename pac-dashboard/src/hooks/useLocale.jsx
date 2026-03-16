import { createContext, useContext, useState, useEffect } from 'react'
import it from '../i18n/it'
import en from '../i18n/en'

const dizionari = { it, en }

const LocaleContext = createContext(null)

export function LocaleProvider({ children }) {
  const [lingua, setLingua] = useState(() => localStorage.getItem('lingua') ?? 'it')

  useEffect(() => {
    localStorage.setItem('lingua', lingua)
  }, [lingua])

  const t = (key) => dizionari[lingua]?.[key] ?? dizionari['it'][key] ?? key

  return (
    <LocaleContext.Provider value={{ t, lingua, setLingua }}>
      {children}
    </LocaleContext.Provider>
  )
}

export const useLocale = () => useContext(LocaleContext)
