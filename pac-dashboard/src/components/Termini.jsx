import { useLocale } from '../hooks/useLocale'
import LinguaToggle from './LinguaToggle'

function TerminiIT() {
  return (
    <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
      <section>
        <h2 className="text-white font-semibold text-base mb-2">1. Accettazione dei termini</h2>
        <p>Utilizzando ETF Lens accetti i presenti Termini di Servizio. Se non li accetti, non utilizzare il servizio.</p>
      </section>
      <section>
        <h2 className="text-white font-semibold text-base mb-2">2. Descrizione del servizio</h2>
        <p>ETF Lens è uno strumento gratuito per la gestione e il monitoraggio di un portafoglio ETF multi-broker. Non fornisce consulenza finanziaria né raccomandazioni di investimento.</p>
      </section>
      <section>
        <h2 className="text-white font-semibold text-base mb-2">3. Limitazione di responsabilità</h2>
        <p>I dati e i calcoli mostrati sono a solo scopo informativo. L'utente è l'unico responsabile delle proprie decisioni di investimento. Il servizio è fornito "così com'è" senza garanzie di alcun tipo.</p>
      </section>
      <section>
        <h2 className="text-white font-semibold text-base mb-2">4. Dati dell'utente</h2>
        <p>I tuoi dati di portafoglio sono memorizzati sul tuo account Supabase. Puoi esportarli o eliminarli in qualsiasi momento. Non vendiamo né condividiamo i tuoi dati con terze parti.</p>
      </section>
      <section>
        <h2 className="text-white font-semibold text-base mb-2">5. Modifiche al servizio</h2>
        <p>Ci riserviamo il diritto di modificare o interrompere il servizio in qualsiasi momento senza preavviso.</p>
      </section>
      <section>
        <h2 className="text-white font-semibold text-base mb-2">6. Legge applicabile</h2>
        <p>I presenti termini sono regolati dalla legge italiana.</p>
      </section>
    </div>
  )
}

function TerminiEN() {
  return (
    <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
      <section>
        <h2 className="text-white font-semibold text-base mb-2">1. Acceptance of Terms</h2>
        <p>By using ETF Lens you accept these Terms of Service. If you do not agree, do not use the service.</p>
      </section>
      <section>
        <h2 className="text-white font-semibold text-base mb-2">2. Description of Service</h2>
        <p>ETF Lens is a free tool for managing and monitoring a multi-broker ETF portfolio. It does not provide financial advice or investment recommendations.</p>
      </section>
      <section>
        <h2 className="text-white font-semibold text-base mb-2">3. Limitation of Liability</h2>
        <p>The data and calculations shown are for informational purposes only. The user is solely responsible for their investment decisions. The service is provided "as is" without warranties of any kind.</p>
      </section>
      <section>
        <h2 className="text-white font-semibold text-base mb-2">4. User Data</h2>
        <p>Your portfolio data is stored on your Supabase account. You can export or delete it at any time. We do not sell or share your data with third parties.</p>
      </section>
      <section>
        <h2 className="text-white font-semibold text-base mb-2">5. Changes to the Service</h2>
        <p>We reserve the right to modify or discontinue the service at any time without notice.</p>
      </section>
      <section>
        <h2 className="text-white font-semibold text-base mb-2">6. Governing Law</h2>
        <p>These terms are governed by Italian law.</p>
      </section>
    </div>
  )
}

export default function Termini() {
  const { t, lingua } = useLocale()
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="text-sm text-slate-400 hover:text-white transition-colors">← ETF Lens</a>
          <LinguaToggle />
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-white mb-8">{t('termini_title')}</h1>
        {lingua === 'it' ? <TerminiIT /> : <TerminiEN />}
      </main>
    </div>
  )
}
