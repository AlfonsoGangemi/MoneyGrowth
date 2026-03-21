import { useLocale } from '../hooks/useLocale'
import LinguaToggle from './LinguaToggle'

function PrivacyIT() {
  return (
    <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
      <section>
        <h2 className="text-white font-semibold text-base mb-2">1. Titolare del trattamento</h2>
        <p>Il titolare del trattamento dei dati è il gestore di questo servizio. Per qualsiasi richiesta relativa ai tuoi dati, puoi contattarci tramite i canali indicati nel repository del progetto.</p>
      </section>
      <section>
        <h2 className="text-white font-semibold text-base mb-2">2. Dati raccolti</h2>
        <p>Raccogliamo esclusivamente i dati che inserisci volontariamente: indirizzo email (per l'autenticazione), dati del tuo portafoglio ETF (nomi, ISIN, importi, acquisti). Non raccogliamo dati di navigazione, cookie di tracciamento o informazioni di profilazione.</p>
      </section>
      <section>
        <h2 className="text-white font-semibold text-base mb-2">3. Finalità del trattamento</h2>
        <p>I tuoi dati sono trattati esclusivamente per fornire il servizio: autenticazione al tuo account e visualizzazione del tuo portafoglio personale. Non utilizziamo i tuoi dati per finalità di marketing, analisi di mercato o profilazione.</p>
      </section>
      <section>
        <h2 className="text-white font-semibold text-base mb-2">4. Base giuridica</h2>
        <p>Il trattamento si basa sul tuo consenso espresso al momento della registrazione e sull'esecuzione del contratto di servizio (fornitura della dashboard).</p>
      </section>
      <section>
        <h2 className="text-white font-semibold text-base mb-2">5. Conservazione dei dati</h2>
        <p>I tuoi dati sono conservati sul tuo account Supabase finché non decidi di eliminarli. Puoi eliminare il tuo account e tutti i dati associati in qualsiasi momento tramite la dashboard o contattandoci direttamente.</p>
      </section>
      <section>
        <h2 className="text-white font-semibold text-base mb-2">6. Condivisione con terze parti</h2>
        <p>Non vendiamo né condividiamo i tuoi dati con terze parti. I dati sono archiviati su Supabase (infrastruttura cloud), il cui utilizzo è regolato dalla <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Privacy Policy di Supabase</a>.</p>
      </section>
      <section>
        <h2 className="text-white font-semibold text-base mb-2">7. I tuoi diritti</h2>
        <p>Hai il diritto di accedere ai tuoi dati, rettificarli, cancellarli o richiederne la portabilità in qualsiasi momento. Puoi esercitare questi diritti direttamente dalla dashboard (export/cancellazione dati) o contattandoci.</p>
      </section>
    </div>
  )
}

function PrivacyEN() {
  return (
    <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
      <section>
        <h2 className="text-white font-semibold text-base mb-2">1. Data Controller</h2>
        <p>The data controller is the operator of this service. For any requests regarding your data, you can contact us through the channels indicated in the project repository.</p>
      </section>
      <section>
        <h2 className="text-white font-semibold text-base mb-2">2. Data Collected</h2>
        <p>We collect only the data you voluntarily provide: email address (for authentication), your ETF portfolio data (names, ISINs, amounts, purchases). We do not collect browsing data, tracking cookies, or profiling information.</p>
      </section>
      <section>
        <h2 className="text-white font-semibold text-base mb-2">3. Purpose of Processing</h2>
        <p>Your data is processed solely to provide the service: authenticating you to your account and displaying your personal portfolio. We do not use your data for marketing, market analysis, or profiling purposes.</p>
      </section>
      <section>
        <h2 className="text-white font-semibold text-base mb-2">4. Legal Basis</h2>
        <p>Processing is based on your explicit consent at registration and the performance of the service contract (providing the dashboard).</p>
      </section>
      <section>
        <h2 className="text-white font-semibold text-base mb-2">5. Data Retention</h2>
        <p>Your data is stored on your Supabase account until you decide to delete it. You can delete your account and all associated data at any time through the dashboard or by contacting us directly.</p>
      </section>
      <section>
        <h2 className="text-white font-semibold text-base mb-2">6. Third-Party Sharing</h2>
        <p>We do not sell or share your data with third parties. Data is stored on Supabase (cloud infrastructure), whose use is governed by <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Supabase's Privacy Policy</a>.</p>
      </section>
      <section>
        <h2 className="text-white font-semibold text-base mb-2">7. Your Rights</h2>
        <p>You have the right to access, rectify, delete, or request portability of your data at any time. You can exercise these rights directly from the dashboard (data export/deletion) or by contacting us.</p>
      </section>
    </div>
  )
}

export default function Privacy() {
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
        <h1 className="text-2xl font-bold text-white mb-8">{t('privacy_title')}</h1>
        {lingua === 'it' ? <PrivacyIT /> : <PrivacyEN />}
      </main>
    </div>
  )
}
