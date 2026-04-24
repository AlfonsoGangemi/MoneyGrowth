export default {
  faq_titolo: 'Domande frequenti',

  // --- Generale ---
  faq_1_q: "[Generale] Cos'è un ETF?",
  faq_1_a: "Un ETF (Exchange Traded Fund) è un fondo di investimento quotato in borsa che replica l'andamento di un indice (es. MSCI World, S&amp;P 500). Permette di diversificare il portafoglio con costi di gestione molto ridotti rispetto ai fondi tradizionali.",
  faq_2_q: '[Generale] Quali sono le principali caratteristiche di un ETF?',
  faq_2_a: "Gli ETF combinano i vantaggi dei fondi comuni con quelli delle azioni. Le caratteristiche principali sono: <strong>diversificazione immediata</strong> (un singolo ETF può contenere centinaia di titoli), <strong>bassi costi di gestione</strong> (TER spesso inferiore allo 0,20% annuo), <strong>liquidità</strong> (acquistabili e vendibili in borsa durante le ore di mercato), <strong>trasparenza</strong> (la composizione è pubblica e aggiornata quotidianamente) e <strong>accessibilità</strong> (si può iniziare con importi ridotti, anche con un PAC mensile da poche decine di euro).",
  faq_3_q: "[Generale] Come si acquista un ETF?",
  faq_3_a: "Per acquistare un ETF è necessario un conto titoli presso un broker (es. Directa, Fineco, DEGIRO, Scalable Capital). Si cerca l'ETF tramite il suo codice <strong>ISIN</strong> o ticker, si imposta la quantità o l'importo e si invia un <strong>ordine di mercato</strong> (eseguito subito al prezzo corrente) o un <strong>ordine limite</strong> (eseguito solo al prezzo desiderato). L'acquisto è possibile durante gli orari di apertura delle borse europee, tipicamente dalle 9:00 alle 17:30.",
  faq_4_q: "[Generale] Cos'è un PAC (Piano di Accumulo Capitale)?",
  faq_4_a: "Un PAC è una strategia di investimento che prevede versamenti periodici — mensili o trimestrali — in uno o più ETF, indipendentemente dal prezzo di mercato. Riduce l'impatto della volatilità grazie al cost averaging.",

  // --- Piattaforma ---
  faq_5_q: '[Piattaforma] Perché è importante analizzare il proprio portafoglio ETF?',
  faq_5_a: "Monitorare il portafoglio permette di capire se stai davvero raggiungendo i tuoi obiettivi finanziari. Senza dati precisi è difficile valutare se il rendimento reale giustifica il rischio, se la diversificazione è adeguata o se è il momento di ribilanciare. Un'analisi regolare aiuta a prendere decisioni consapevoli anziché emotive.",
  faq_6_q: '[Piattaforma] ETF Lens ha un costo?',
  faq_6_a: 'ETF Lens offre un piano gratuito che include fino a 9 ETF, 4 broker e 100 acquisti registrati. Per chi vuole rimuovere questi limiti è disponibile il piano Plus. Il codice sorgente è e rimarrà open source. Non esistono pubblicità né vendita di dati.',
  faq_7_q: '[Piattaforma] Posso usare ETF Lens con più broker?',
  faq_7_a: 'Sì. Puoi registrare acquisti da broker diversi — Directa, Fineco, DEGIRO, Scalable Capital, Trading 212 e altri — e visualizzare il portafoglio sia aggregato che separato per broker.',
  faq_8_q: '[Piattaforma] Posso importare i miei dati da un CSV o da un altro strumento?',
  faq_8_a: "Sì. Se hai già un file JSON esportato da ETF Lens, puoi reimportarlo direttamente dalla dashboard per ripristinare tutti gli ETF e gli acquisti. Se i tuoi dati sono in formato CSV (export da broker, Excel, Google Sheets), puoi usare la funzione \"Importa da CSV con AI\": genera un prompt pronto da incollare in ChatGPT o Claude, che convertirà il tuo CSV nel formato corretto. Puoi anche esportare l'intero portafoglio in qualsiasi momento come backup JSON.",

  // --- Integrazione AI ---
  faq_9_q: '[Integrazione AI] Posso analizzare il mio portafoglio con Claude o un altro AI?',
  faq_9_a: "Sì. ETF Lens supporta il protocollo MCP (Model Context Protocol): Claude Code e Claude Desktop possono connettersi direttamente ai tuoi dati e rispondere in linguaggio naturale. Dopo aver generato un'API key dalla dashboard (Impostazioni → API key), aggiungi il server nelle impostazioni MCP del client AI.",
  faq_10_q: '[Integrazione AI] Cosa posso chiedere a Claude collegato a ETF Lens?',
  faq_10_a: '<strong>Composizione del portafoglio</strong>: allocazione per asset class (azionario, obbligazionario, monetario), distribuzione per emittente (Vanguard, iShares, Xtrackers), peso percentuale di ciascun ETF, ripartizione per broker.<br><br><strong>Performance</strong>: rendimento realizzato per ETF e totale, confronto prezzo medio di carico vs prezzo corrente, evoluzione del valore nel tempo con i prezzi storici mensili, rendimento annualizzato per ciascuna posizione.<br><br><strong>Analisi degli acquisti</strong>: cadenza e consistenza del PAC, importo medio investito per periodo, prezzo medio ponderato (dollar-cost averaging) per ETF.<br><br><strong>Proiezioni future</strong>: stima del valore futuro con scenari pessimistico (3%), moderato (6%) e ottimistico (9%), simulazione con contributi periodici.<br><br><strong>Rischio e diversificazione</strong>: concentrazione geografica implicita (es. peso USA tramite S&amp;P 500), sovrapposizione tra ETF (es. FTSE All-World vs S&amp;P 500), bilanciamento azionario/obbligazionario/monetario.<br><br><strong>Analisi per broker</strong>: capitale investito e valore attuale, performance storica, fee pagate per broker.',

  // --- Sicurezza ---
  faq_11_q: '[Sicurezza] I miei dati sono al sicuro?',
  faq_11_a: "I dati sono archiviati su Supabase con autenticazione sicura e Row Level Security (RLS): nessun altro utente può leggere i tuoi dati. Puoi esportarli o cancellarli in qualsiasi momento dalla dashboard.",
  faq_12_q: '[Sicurezza] Quali misure tecniche proteggono i miei dati?',
  faq_12_a: "ETF Lens adotta una difesa a più livelli. Le comunicazioni avvengono esclusivamente via <strong>TLS 1.3</strong>. I dati a riposo sono cifrati con <strong>AES-256</strong> nell'infrastruttura Supabase (AWS). L'autenticazione sfrutta <strong>bcrypt</strong> per le password: anche in caso di violazione del database, le password non sono mai recuperabili in chiaro.<br><br>I token JWT per l'integrazione MCP sono firmati con <strong>HMAC-SHA256</strong> e hanno scadenza automatica. Le API key vengono salvate solo come hash <strong>SHA-256</strong>: una volta generate, nemmeno il sistema può risalire al valore originale.<br><br>L'isolamento dei dati è garantito da <strong>Row Level Security (RLS)</strong> a livello PostgreSQL: ogni query è vincolata all'utente autenticato, impedendo strutturalmente l'accesso ai record altrui. Le connessioni AI tramite MCP usano <strong>OAuth 2.1 con PKCE</strong>, eliminando la necessità di gestire credenziali manualmente.",
}
