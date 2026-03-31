import { useEffect } from 'react'
import { useLocale } from '../hooks/useLocale'
import LinguaToggle from './LinguaToggle'

function PrivacyIT() {
  return (
    <div className="space-y-6 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">1. Titolare del trattamento</h2>
        <p>Il titolare del trattamento dei dati personali è il gestore del servizio ETF Lens, raggiungibile all'indirizzo email <a href="mailto:privacy@etflens.app" className="text-blue-600 dark:text-blue-400 hover:underline">privacy@etflens.app</a>. Per qualsiasi richiesta relativa ai tuoi dati personali puoi contattarci a quell'indirizzo.</p>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">2. Dati raccolti e finalità</h2>
        <p className="mb-2">Raccogliamo esclusivamente i dati che fornisci volontariamente durante la registrazione e l'utilizzo del servizio:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-slate-700 dark:text-slate-200">Dati di autenticazione:</strong> indirizzo email e password (conservata in forma cifrata). Finalità: creazione e gestione del tuo account. Base giuridica: esecuzione del contratto (art. 6.1.b GDPR).</li>
          <li><strong className="text-slate-700 dark:text-slate-200">Dati di portafoglio:</strong> nomi ETF, codici ISIN, importi investiti, date e prezzi degli acquisti. Finalità: fornitura delle funzionalità di monitoraggio. Base giuridica: esecuzione del contratto (art. 6.1.b GDPR).</li>
          <li><strong className="text-slate-700 dark:text-slate-200">Dati tecnici minimi:</strong> log di accesso anonimi e dati di errore raccolti tramite Sentry, privi di informazioni personali identificabili. Finalità: stabilità e sicurezza del servizio. Base giuridica: legittimo interesse (art. 6.1.f GDPR).</li>
        </ul>
        <p className="mt-2">Non raccogliamo dati di navigazione, cookie di profilazione, informazioni demografiche o qualsiasi dato non strettamente necessario alla fornitura del servizio.</p>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">3. Cookie e tecnologie di tracciamento</h2>
        <p>Utilizziamo esclusivamente cookie tecnici necessari al funzionamento del servizio (cookie di sessione Supabase per mantenere l'accesso autenticato e preferenze locali come lingua e tema). Non utilizziamo cookie di terze parti, cookie di profilazione o strumenti di analisi comportamentale.</p>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">4. Conservazione dei dati</h2>
        <p>I tuoi dati vengono conservati per tutta la durata del tuo account. Se elimini il tuo account, tutti i dati associati vengono cancellati entro 30 giorni, salvo obblighi di conservazione previsti dalla legge applicabile. I log tecnici anonimi sono conservati per un massimo di 90 giorni.</p>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">5. Condivisione con terze parti e trasferimento extra-UE</h2>
        <p className="mb-2">Non vendiamo né condividiamo i tuoi dati personali con terze parti a fini commerciali. I dati sono trattati dai seguenti fornitori tecnici (<em>sub-processor</em>), che agiscono in qualità di responsabili del trattamento:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-slate-700 dark:text-slate-200">Supabase Inc.</strong> (USA) — archiviazione del database e autenticazione. Dati conservati su server in regione <em>eu-central-1</em> (Francoforte). Trasferimento regolato da Clausole Contrattuali Standard (SCC) approvate dalla Commissione Europea. <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy Supabase</a>.</li>
          <li><strong className="text-slate-700 dark:text-slate-200">Vercel Inc.</strong> (USA) — hosting e distribuzione dell'applicazione. <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy Vercel</a>.</li>
          <li><strong className="text-slate-700 dark:text-slate-200">Functional Software Inc. (Sentry)</strong> (USA) — monitoraggio anonimo degli errori. I dati inviati a Sentry non contengono informazioni personali identificabili. <a href="https://sentry.io/privacy/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy Sentry</a>.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">6. I tuoi diritti (artt. 15–22 GDPR)</h2>
        <p className="mb-2">In qualità di interessato hai il diritto di:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-slate-700 dark:text-slate-200">Accesso</strong> — ottenere conferma del trattamento e copia dei tuoi dati (art. 15).</li>
          <li><strong className="text-slate-700 dark:text-slate-200">Rettifica</strong> — correggere dati inesatti (art. 16).</li>
          <li><strong className="text-slate-700 dark:text-slate-200">Cancellazione</strong> — richiedere la cancellazione dei tuoi dati ("diritto all'oblio", art. 17). Puoi esercitarlo direttamente dalla dashboard o contattandoci.</li>
          <li><strong className="text-slate-700 dark:text-slate-200">Portabilità</strong> — ricevere i tuoi dati in formato strutturato e leggibile da macchina (art. 20). Funzione di export JSON disponibile nella dashboard.</li>
          <li><strong className="text-slate-700 dark:text-slate-200">Limitazione</strong> — richiedere la limitazione del trattamento in determinati casi (art. 18).</li>
          <li><strong className="text-slate-700 dark:text-slate-200">Opposizione</strong> — opporti al trattamento basato su legittimo interesse (art. 21).</li>
          <li><strong className="text-slate-700 dark:text-slate-200">Revoca del consenso</strong> — in qualsiasi momento, senza pregiudicare la liceità del trattamento precedente.</li>
        </ul>
        <p className="mt-2">Per esercitare questi diritti scrivi a <a href="mailto:privacy@etflens.app" className="text-blue-600 dark:text-blue-400 hover:underline">privacy@etflens.app</a>. Risponderemo entro 30 giorni.</p>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">7. Diritto di reclamo</h2>
        <p>Se ritieni che il trattamento dei tuoi dati violi il GDPR, hai il diritto di proporre reclamo all'autorità di controllo competente. In Italia: <strong className="text-slate-700 dark:text-slate-200">Garante per la Protezione dei Dati Personali</strong> — <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">www.garanteprivacy.it</a>.</p>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">8. Sicurezza dei dati</h2>
        <p>Adottiamo misure tecniche e organizzative appropriate per proteggere i tuoi dati: trasmissione cifrata via TLS 1.2+, password in hash bcrypt gestito da Supabase Auth, accesso ai dati limitato per utente tramite Row Level Security (RLS) sul database.</p>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">9. Modifiche alla presente informativa</h2>
        <p>In caso di modifiche sostanziali alla presente informativa, ti informeremo tramite email o avviso in app con almeno 14 giorni di preavviso. La versione aggiornata sarà sempre disponibile su questa pagina.</p>
      </section>

    </div>
  )
}

function PrivacyEN() {
  return (
    <div className="space-y-6 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">1. Data Controller</h2>
        <p>The data controller for ETF Lens is reachable at <a href="mailto:privacy@etflens.app" className="text-blue-600 dark:text-blue-400 hover:underline">privacy@etflens.app</a>. For any request regarding your personal data, please contact us at that address.</p>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">2. Data Collected and Purpose</h2>
        <p className="mb-2">We collect only the data you voluntarily provide during registration and use of the service:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-slate-700 dark:text-slate-200">Authentication data:</strong> email address and password (stored in encrypted form). Purpose: account creation and management. Legal basis: performance of contract (Art. 6.1.b GDPR).</li>
          <li><strong className="text-slate-700 dark:text-slate-200">Portfolio data:</strong> ETF names, ISIN codes, invested amounts, purchase dates and prices. Purpose: providing portfolio monitoring features. Legal basis: performance of contract (Art. 6.1.b GDPR).</li>
          <li><strong className="text-slate-700 dark:text-slate-200">Minimal technical data:</strong> anonymous access logs and error data collected via Sentry, containing no personally identifiable information. Purpose: service stability and security. Legal basis: legitimate interest (Art. 6.1.f GDPR).</li>
        </ul>
        <p className="mt-2">We do not collect browsing data, profiling cookies, demographic information, or any data not strictly necessary for providing the service.</p>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">3. Cookies and Tracking Technologies</h2>
        <p>We use only technical cookies necessary for the service to function (Supabase session cookies to maintain authenticated access, and local preferences such as language and theme). We do not use third-party cookies, profiling cookies, or behavioral analytics tools.</p>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">4. Data Retention</h2>
        <p>Your data is retained for the duration of your account. If you delete your account, all associated data is erased within 30 days, unless a legal retention obligation applies. Anonymous technical logs are retained for a maximum of 90 days.</p>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">5. Third-Party Sharing and International Transfers</h2>
        <p className="mb-2">We do not sell or share your personal data with third parties for commercial purposes. Data is processed by the following technical providers (sub-processors), acting as data processors:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-slate-700 dark:text-slate-200">Supabase Inc.</strong> (USA) — database storage and authentication. Data stored in the <em>eu-central-1</em> region (Frankfurt). Transfer governed by Standard Contractual Clauses (SCC) approved by the European Commission. <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Supabase Privacy Policy</a>.</li>
          <li><strong className="text-slate-700 dark:text-slate-200">Vercel Inc.</strong> (USA) — application hosting and delivery. <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Vercel Privacy Policy</a>.</li>
          <li><strong className="text-slate-700 dark:text-slate-200">Functional Software Inc. (Sentry)</strong> (USA) — anonymous error monitoring. Data sent to Sentry contains no personally identifiable information. <a href="https://sentry.io/privacy/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Sentry Privacy Policy</a>.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">6. Your Rights (Arts. 15–22 GDPR)</h2>
        <p className="mb-2">As a data subject you have the right to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-slate-700 dark:text-slate-200">Access</strong> — obtain confirmation of processing and a copy of your data (Art. 15).</li>
          <li><strong className="text-slate-700 dark:text-slate-200">Rectification</strong> — correct inaccurate data (Art. 16).</li>
          <li><strong className="text-slate-700 dark:text-slate-200">Erasure</strong> — request deletion of your data ("right to be forgotten", Art. 17). Exercisable directly from the dashboard or by contacting us.</li>
          <li><strong className="text-slate-700 dark:text-slate-200">Portability</strong> — receive your data in a structured, machine-readable format (Art. 20). JSON export function available in the dashboard.</li>
          <li><strong className="text-slate-700 dark:text-slate-200">Restriction</strong> — request restriction of processing in certain cases (Art. 18).</li>
          <li><strong className="text-slate-700 dark:text-slate-200">Objection</strong> — object to processing based on legitimate interest (Art. 21).</li>
          <li><strong className="text-slate-700 dark:text-slate-200">Withdrawal of consent</strong> — at any time, without affecting the lawfulness of prior processing.</li>
        </ul>
        <p className="mt-2">To exercise these rights, write to <a href="mailto:privacy@etflens.app" className="text-blue-600 dark:text-blue-400 hover:underline">privacy@etflens.app</a>. We will respond within 30 days.</p>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">7. Right to Lodge a Complaint</h2>
        <p>If you believe the processing of your data violates the GDPR, you have the right to lodge a complaint with the competent supervisory authority. In Italy: <strong className="text-slate-700 dark:text-slate-200">Garante per la Protezione dei Dati Personali</strong> — <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">www.garanteprivacy.it</a>.</p>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">8. Data Security</h2>
        <p>We implement appropriate technical and organizational measures to protect your data: encrypted transmission via TLS 1.2+, passwords hashed with bcrypt managed by Supabase Auth, per-user data access enforced by Row Level Security (RLS) on the database.</p>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">9. Changes to This Policy</h2>
        <p>For material changes to this policy, we will notify you by email or in-app notice at least 14 days in advance. The updated version will always be available on this page.</p>
      </section>

    </div>
  )
}

export default function Privacy() {
  const { t, lingua } = useLocale()

  useEffect(() => {
    const isLight = localStorage.getItem('lightMode') === 'true'
    document.documentElement.classList.toggle('dark', !isLight)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/termini" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">{lingua === 'it' ? 'Termini di Servizio' : 'Terms of Service'} →</a>
          <LinguaToggle />
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{t('privacy_title')}</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-8">{lingua === 'it' ? 'Ultimo aggiornamento: 31 marzo 2026' : 'Last updated: March 31, 2026'}</p>
        {lingua === 'it' ? <PrivacyIT /> : <PrivacyEN />}
      </main>
    </div>
  )
}
