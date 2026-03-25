# Funzionalità

## Gestione ETF
- Aggiunta di fino a **9 ETF** (inclusi gli archiviati); gli ETF **non possono essere eliminati**
- Campi configurabili: nome, ISIN (solo in fase di creazione, non modificabile), emittente, importo fisso mensile PAC, prezzo corrente
- L'**emittente** viene visualizzato come sottotitolo nella card
- L'**ISIN** è un link cliccabile alla pagina JustETF dell'ETF (`https://www.justetf.com/it/etf-profile.html?isin={ISIN}#panoramica`), si apre in una nuova tab
- Accanto al prezzo corrente è presente un pulsante **aggiorna** (icona refresh) che recupera il prezzo tramite l'API pubblica di JustETF:
  - Endpoint: `https://www.justetf.com/api/etfs/:ISIN/quote?currency=EUR&locale=it`
  - Risposta JSON; il prezzo è prezzo = `data?.latestQuote?.raw`
  - Nessuna API key richiesta
  - Gestisce gli stati visivi: caricamento (icona rotante) ed errore (icona rossa + label "Errore" per 3 s)
- Un ETF può essere **archiviato**: scompare dalla dashboard (indicatori, grafico, lista acquisti) senza essere eliminato; può essere riattivato tramite il pannello "ETF archiviati"
- Ogni ETF ha un pulsante **modifica** (✏️) che apre una modale con tutti i campi modificabili eccetto ISIN, e un pulsante **archivia** (🗄) per nasconderlo

## Gestione Broker
- Ogni acquisto è associato a un **broker** (es. Degiro, Trade Republic, FINECO)
- Al primo accesso viene creato automaticamente un broker **"Default"** se nessun broker esiste
- La modale **"Gestisci broker…"** (sempre visibile in dashboard) permette di:
  - Aggiungere un nuovo broker con nome e colore personalizzabile
  - **Archiviare** un broker (nascosto dai filtri attivi, non eliminabile se ha acquisti associati)
  - **Eliminare** un broker (solo se non ha acquisti collegati — vincolo `ON DELETE RESTRICT`)
- Con più broker attivi compare una barra di **filtro chip**: "Tutti" oppure selezione multipla per broker
  - Il filtro agisce su indicatori, grafico e card ETF (gli acquisti degli altri broker sono esclusi dal calcolo)
  - Il filtro selezionato è persistito in Supabase (`config.broker_filtro`)

## Inserimento Acquisti
- Il form è **multi-ETF**: un singolo acquisto PAC ha un'unica data e può includere più strumenti contemporaneamente
- Il **broker** è selezionabile dalla lista dei broker attivi (sempre visibile anche con un solo broker)
- Per ogni ETF attivo compare una riga con checkbox; spuntando l'ETF si espandono:
  - **Importo** (€) — pre-compilato dall'ultimo acquisto; modificabile
  - **Fee** (€) — pre-compilata dall'ultimo acquisto; modificabile
  - **Prezzo unitario** (€) — pre-compilato dal prezzo corrente; modificabile
  - **Quote frazionate** — calcolate automaticamente (`importo / prezzo`); non editabili
- Default data: oggi

## Grafico
- **Asse X**: tempo (storico + futuro fino a 10 anni)
- **Asse Y**: valore del portafoglio in €
- **Serie storica**: valore reale del portafoglio nel tempo
- Grafici separati per singolo ETF e portafoglio aggregato
- Mostra solo gli ETF **non archiviati**

## Scenari Futuri
- Personalizzabili dall'utente: nome, % rendimento annuo, colore linea
- Il **rendimento annuo** è modificabile inline direttamente dal chip dello scenario (click sul valore percentuale)
- Orizzonte temporale: da 1 a 10 anni (configurabile)
- Importo PAC futuro: uguale all'ultimo importo fisso configurato per ogni ETF attivo
- Calcolo con capitalizzazione composta mensile

## Indicatori di Portafoglio

| Indicatore | Descrizione |
|---|---|
| **ROI** | `(Valore attuale - Totale investito) / Totale investito × 100` |
| **Rendimento netto** | `Valore attuale - Totale investito` (in €) |
| **Durata mesi** | Mesi dal primo acquisto a oggi |
| **CAGR** | Tasso di crescita annuo composto sul totale portafoglio |
| **TWRR** | Approssimato sui giorni di acquisto PAC (non NAV giornaliero) |
| **ATWRR** | Media geometrica annualizzata del TWRR |

Gli indicatori considerano solo gli ETF **non archiviati**.

## Persistenza & Backup
- **Supabase** come storage primario (sync automatico ad ogni mutazione)
- **Export JSON**: scarica tutti i dati in un file `.json`
- **Import JSON**: ripristina i dati da file (sovrascrive i dati su Supabase)

## Landing Page
- Mostrata agli utenti non autenticati che non hanno mai effettuato il login (flag `pac_returning` assente in localStorage)
- Contiene sezione hero, KPI animati, feature highlights, FAQ e footer
- CTA "Accedi" e "Inizia gratis" aprono l'`AuthForm` rispettivamente in modalità login e registrazione
- Gli utenti returning (hanno già fatto login in passato) vengono inviati direttamente all'`AuthForm`
- Dall'`AuthForm`, un link "Torna alla home" consente agli utenti returning di tornare alla landing (rimuove il flag `pac_returning`)

## Internazionalizzazione
- Interfaccia disponibile in **Italiano** e **Inglese**
- Toggle lingua visibile nell'header della Dashboard e nella LandingPage
- Preferenza persistita in `localStorage('lingua')`

---