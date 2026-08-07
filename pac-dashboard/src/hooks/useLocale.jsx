// Provider e hook convivono deliberatamente nello stesso file: separarli
// costringerebbe a riscrivere gli import in tutti i consumer senza alcun beneficio
// a runtime. L'unico effetto è che in sviluppo il Fast Refresh ricarica la pagina
// invece di aggiornare il solo componente.
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react'
import it from '../i18n/it'
import en from '../i18n/en'
import itFaq from '../i18n/it.faq'
import enFaq from '../i18n/en.faq'

const dizionari = {
  it: { ...it, ...itFaq },
  en: { ...en, ...enFaq },
}

const LocaleContext = createContext(null)

export function LocaleProvider({ children }) {
  const [lingua, setLingua] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('lingua') : null) ?? 'it')

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
