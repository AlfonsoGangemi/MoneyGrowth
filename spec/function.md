# Funzionalità

## Gestione ETF
- Aggiunta di fino a **5 ETF** (inclusi gli archiviati); gli ETF **non possono essere eliminati**
- Campi configurabili: nome, ISIN (solo in fase di creazione, non modificabile), emittente, importo fisso mensile PAC, prezzo corrente
- L'**emittente** viene visualizzato come sottotitolo nella card
- L'**ISIN** è un link cliccabile alla pagina JustETF dell'ETF (`https://www.justetf.com/it/etf-profile.html?isin={ISIN}#panoramica`), si apre in una nuova tab
- Accanto al prezzo corrente è presente un pulsante **aggiorna** (icona refresh) che recupera il prezzo tramite l'API pubblica di JustETF:
  - Endpoint: `GET https://www.justetf.com/api/etfs/cards?locale=it&currency=EUR&isin={ISIN}`
  - Risposta XML; il prezzo è estratto con XPath `/ETFCardsResponse/etfs/etfs/latestQuote/localized`
  - Il valore è in formato europeo (virgola decimale) e viene convertito in `number` prima del salvataggio
  - Nessuna API key richiesta
  - Gestisce gli stati visivi: caricamento (icona rotante) ed errore (icona rossa + label "Errore" per 3 s)
- Un ETF può essere **archiviato**: scompare dalla dashboard (indicatori, grafico, lista acquisti) senza essere eliminato; può essere riattivato tramite il pannello "ETF archiviati"
- Ogni ETF ha un pulsante **modifica** (✏️) che apre una modale con tutti i campi eccetto ISIN, e un pulsante **archivia** (🗄) per nasconderlo

## Inserimento Acquisti
- Il form è **multi-ETF**: un singolo acquisto PAC ha un'unica data e può includere più strumenti contemporaneamente
- Per ogni ETF attivo compare una riga con checkbox; spuntando l'ETF si espandono:
  - **Importo** (€) — pre-compilato dall'ultimo acquisto; modificabile
  - **Prezzo unitario** (€) — pre-compilato dal prezzo corrente; modificabile
  - **Quote frazionate** — calcolate automaticamente (`importo / prezzo`); non editabili
- Default data: oggi

## Grafico
- **Asse X**: tempo (storico + futuro fino a 10 anni)
- **Asse Y**: valore del portafoglio in €
- **Serie storica**: valore reale del portafoglio nel tempo
- **Serie proiezione**: una linea per ogni scenario configurato
- Grafici separati per singolo ETF e portafoglio aggregato
- Possibilità di escludere la proiezione
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

---