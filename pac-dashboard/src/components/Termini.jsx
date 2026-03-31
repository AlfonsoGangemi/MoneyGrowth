import { useEffect } from 'react'
import { useLocale } from '../hooks/useLocale'
import LinguaToggle from './LinguaToggle'

function TerminiIT() {
  return (
    <div className="space-y-6 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">1. Accettazione dei termini</h2>
        <p>Utilizzando ETF Lens accetti integralmente i presenti Termini di Servizio e la nostra <a href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">Informativa sulla Privacy</a>. Se non accetti questi termini, non utilizzare il servizio.</p>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">2. Descrizione del servizio</h2>
        <p>ETF Lens è uno strumento gratuito per la gestione e il monitoraggio di un portafoglio ETF multi-broker. Il servizio consente di registrare acquisti, visualizzare rendimenti storici e proiezioni future basate su scenari personalizzabili.</p>
        <p className="mt-2"><strong className="text-slate-700 dark:text-slate-200">ETF Lens non è un servizio di investimento regolamentato.</strong> Non fornisce consulenza finanziaria, raccomandazioni di investimento, gestione patrimoniale né alcun altro servizio soggetto alle norme MiFID II o alla vigilanza di autorità finanziarie (Consob, Banca d'Italia, ESMA). Tutti i dati, i calcoli e le proiezioni hanno esclusivamente scopo informativo e non costituiscono in nessun caso consulenza finanziaria personalizzata.</p>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">3. Limitazione di responsabilità</h2>
        <p>Il servizio è fornito "così com'è" (<em>as is</em>) e "come disponibile" (<em>as available</em>), senza garanzie di alcun tipo, espresse o implicite, incluse ma non limitate a garanzie di commerciabilità, idoneità a uno scopo specifico o non violazione di diritti di terzi.</p>
        <p className="mt-2">Il titolare non è responsabile per:</p>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>Perdite finanziarie derivanti da decisioni di investimento prese sulla base dei dati mostrati dall'applicazione.</li>
          <li>Inesattezze nei calcoli dovute a dati inseriti in modo errato dall'utente.</li>
          <li>Interruzioni, malfunzionamenti o perdita di dati causati da eventi fuori dal controllo del fornitore (guasti infrastrutturali, attacchi informatici, cause di forza maggiore).</li>
          <li>Danni indiretti, incidentali, consequenziali o perdita di profitti di qualsiasi natura.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">4. Obblighi e responsabilità dell'utente</h2>
        <p>L'utente si impegna a:</p>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>Fornire dati accurati durante la registrazione e l'utilizzo del servizio.</li>
          <li>Mantenere riservate le credenziali di accesso al proprio account e non condividerle con terzi.</li>
          <li>Notificare immediatamente eventuali accessi non autorizzati al proprio account.</li>
          <li>Non utilizzare il servizio per scopi illegali, fraudolenti o lesivi dei diritti di terzi.</li>
          <li>Non tentare di compromettere la sicurezza, l'integrità o la disponibilità del servizio.</li>
        </ul>
        <p className="mt-2">L'utente è l'unico responsabile delle proprie decisioni di investimento e dell'accuratezza dei dati inseriti.</p>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">5. Dati dell'utente e privacy</h2>
        <p>I dati di portafoglio inseriti sono di esclusiva proprietà dell'utente. Puoi esportarli in formato JSON o eliminarli in qualsiasi momento dalla dashboard. Il trattamento dei dati personali è disciplinato dalla nostra <a href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">Informativa sulla Privacy</a>, redatta in conformità al Regolamento (UE) 2016/679 (GDPR).</p>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">6. Proprietà intellettuale</h2>
        <p>Il codice sorgente di ETF Lens è rilasciato come software open source. Il nome, il logo e il marchio "ETF Lens" sono di proprietà del titolare del servizio. È vietato utilizzarli per scopi commerciali senza autorizzazione scritta.</p>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">7. Modifiche al servizio e ai termini</h2>
        <p>Ci riserviamo il diritto di modificare o interrompere il servizio. In caso di modifiche sostanziali ai presenti Termini, gli utenti registrati saranno informati con almeno <strong className="text-slate-700 dark:text-slate-200">14 giorni di preavviso</strong> tramite email o avviso in app. Il proseguimento nell'utilizzo del servizio dopo la data di entrata in vigore costituisce accettazione delle modifiche.</p>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">8. Legge applicabile e foro competente</h2>
        <p>I presenti termini sono regolati dalla legge italiana. Per qualsiasi controversia derivante dall'utilizzo del servizio è competente in via esclusiva il Foro di Milano, salvo diversa disposizione inderogabile di legge a tutela del consumatore.</p>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">9. Contatti</h2>
        <p>Per qualsiasi domanda relativa ai presenti Termini di Servizio: <a href="mailto:support@etflens.app" className="text-blue-600 dark:text-blue-400 hover:underline">support@etflens.app</a>.</p>
      </section>

    </div>
  )
}

function TerminiEN() {
  return (
    <div className="space-y-6 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">1. Acceptance of Terms</h2>
        <p>By using ETF Lens you fully accept these Terms of Service and our <a href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</a>. If you do not agree to these terms, do not use the service.</p>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">2. Description of Service</h2>
        <p>ETF Lens is a free tool for managing and monitoring a multi-broker ETF portfolio. The service allows you to record purchases, view historical returns, and explore future projections based on customizable scenarios.</p>
        <p className="mt-2"><strong className="text-slate-700 dark:text-slate-200">ETF Lens is not a regulated investment service.</strong> It does not provide financial advice, investment recommendations, asset management, or any other service subject to MiFID II rules or oversight by financial authorities (Consob, Banca d'Italia, ESMA). All data, calculations and projections are for informational purposes only and do not constitute personalized financial advice under any circumstances.</p>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">3. Limitation of Liability</h2>
        <p>The service is provided "as is" and "as available", without warranties of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.</p>
        <p className="mt-2">The operator is not liable for:</p>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>Financial losses resulting from investment decisions made based on data shown by the application.</li>
          <li>Calculation inaccuracies due to data incorrectly entered by the user.</li>
          <li>Interruptions, malfunctions, or data loss caused by events outside the provider's control (infrastructure failures, cyberattacks, force majeure).</li>
          <li>Indirect, incidental, consequential damages or loss of profits of any nature.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">4. User Obligations and Responsibilities</h2>
        <p>The user agrees to:</p>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>Provide accurate data during registration and use of the service.</li>
          <li>Keep account credentials confidential and not share them with third parties.</li>
          <li>Immediately report any unauthorized access to their account.</li>
          <li>Not use the service for illegal, fraudulent, or third-party-harming purposes.</li>
          <li>Not attempt to compromise the security, integrity, or availability of the service.</li>
        </ul>
        <p className="mt-2">The user is solely responsible for their investment decisions and the accuracy of the data they enter.</p>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">5. User Data and Privacy</h2>
        <p>Portfolio data entered is exclusively owned by the user. You can export it in JSON format or delete it at any time from the dashboard. The processing of personal data is governed by our <a href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</a>, drafted in compliance with Regulation (EU) 2016/679 (GDPR).</p>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">6. Intellectual Property</h2>
        <p>The ETF Lens source code is released as open-source software. The name, logo, and trademark "ETF Lens" are the property of the service operator. Their use for commercial purposes without written authorization is prohibited.</p>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">7. Changes to the Service and Terms</h2>
        <p>We reserve the right to modify or discontinue the service. For material changes to these Terms, registered users will be notified at least <strong className="text-slate-700 dark:text-slate-200">14 days in advance</strong> by email or in-app notice. Continued use of the service after the effective date constitutes acceptance of the changes.</p>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">8. Governing Law and Jurisdiction</h2>
        <p>These terms are governed by Italian law. Any dispute arising from the use of the service shall be subject to the exclusive jurisdiction of the Court of Milan, unless mandatory consumer protection law provides otherwise.</p>
      </section>

      <section>
        <h2 className="text-slate-900 dark:text-white font-semibold text-base mb-2">9. Contact</h2>
        <p>For any questions regarding these Terms of Service: <a href="mailto:support@etflens.app" className="text-blue-600 dark:text-blue-400 hover:underline">support@etflens.app</a>.</p>
      </section>

    </div>
  )
}

export default function Termini() {
  const { t, lingua } = useLocale()

  useEffect(() => {
    const isLight = localStorage.getItem('lightMode') === 'true'
    document.documentElement.classList.toggle('dark', !isLight)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/privacy" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">← {lingua === 'it' ? 'Privacy Policy' : 'Privacy Policy'}</a>
          <LinguaToggle />
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{t('termini_title')}</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-8">{lingua === 'it' ? 'Ultimo aggiornamento: 31 marzo 2026' : 'Last updated: March 31, 2026'}</p>
        {lingua === 'it' ? <TerminiIT /> : <TerminiEN />}
      </main>
    </div>
  )
}
