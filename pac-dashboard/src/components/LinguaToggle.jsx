import { useLocale } from '../hooks/useLocale'

export default function LinguaToggle() {
  const { lingua, setLingua } = useLocale()
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => setLingua('it')}
        title="Italiano"
        className={`rounded transition-opacity ${lingua === 'it' ? 'opacity-100 ring-2 ring-white/30 ring-offset-1 ring-offset-transparent' : 'opacity-40 hover:opacity-70'}`}
      >
        <img src="https://flagcdn.com/24x18/it.png" srcSet="https://flagcdn.com/48x36/it.png 2x" width="24" height="18" alt="IT" className="rounded-sm block" />
      </button>
      <button
        onClick={() => setLingua('en')}
        title="English"
        className={`rounded transition-opacity ${lingua === 'en' ? 'opacity-100 ring-2 ring-white/30 ring-offset-1 ring-offset-transparent' : 'opacity-40 hover:opacity-70'}`}
      >
        <img src="https://flagcdn.com/24x18/gb.png" srcSet="https://flagcdn.com/48x36/gb.png 2x" width="24" height="18" alt="EN" className="rounded-sm block" />
      </button>
    </div>
  )
}
