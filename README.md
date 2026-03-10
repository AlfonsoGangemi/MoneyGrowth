# MoneyGrowth — PAC Dashboard

Dashboard web per la gestione e il monitoraggio di un **Piano di Accumulo Capitale (PAC)** su più ETF. 

Traccia gli acquisti, calcola gli indicatori di rendimento e proietta la crescita futura del portafoglio su scenari personalizzabili.

---

## Funzionalità principali

- **Gestione ETF** — aggiungi fino a 5 ETF, aggiorna il prezzo corrente via API JustETF, archivia quelli non più attivi
- **Inserimento acquisti** — form multi-ETF con una sola data per tutti gli strumenti; quote frazionate calcolate automaticamente
- **Grafico storico** — andamento reale del portafoglio nel tempo, per singolo ETF e aggregato
- **Scenari futuri** — proiezione fino a 10 anni con capitalizzazione composta mensile; scenari personalizzabili per nome, rendimento e colore
- **Indicatori** — ROI, rendimento netto, durata mesi, CAGR, TWRR, ATWRR

---

## Stack tecnologico

| Ruolo | Tecnologia |
|---|---|
| Framework | React + Vite |
| Styling | Tailwind CSS |
| Grafici | Recharts |
| Date | date-fns |
| Auth & DB | Supabase (Auth + PostgreSQL) |
| Deploy | Vercel |

---

## Setup locale

### Prerequisiti

- Node.js ≥ 18
- Un progetto [Supabase](https://supabase.com) con le tabelle inizializzate (vedi [`spec/model.md`](spec/model.md))

### Installazione

```bash
git clone https://github.com/AlfonsoGangemi/MoneyGrowth.git
cd MoneyGrowth/pac-dashboard
npm install
```

### Variabili d'ambiente

Crea un file `.env.local` nella cartella `pac-dashboard/`:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

### Avvio

```bash
npm run dev
```

---

## Deploy su Vercel

1. Collega il repository a [Vercel](https://vercel.com)
2. Imposta la **Root Directory** su `pac-dashboard`
3. Aggiungi le variabili d'ambiente nel pannello Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Il deploy avviene automaticamente ad ogni push su `main`

---

## Documentazione

| File | Contenuto |
|---|---|
| [`spec/function.md`](spec/function.md) | Funzionalità dettagliate |
| [`spec/model.md`](spec/model.md) | Schema DB, RLS e modello dati frontend |
| [`spec/details.md`](spec/details.md) | Dettagli implementativi (auth, persistenza) |
| [`spec/deploy.md`](spec/deploy.md) | Deploy su Vercel |

---

## Licenza

[MIT](LICENSE)
