# MoneyGrowth — ETF Lens

![version](https://img.shields.io/badge/version-1.0.0-blue)

**Live:** [etflens.app](https://etflens.app)

Web dashboard for managing and monitoring a **multi-broker ETF portfolio**: purchases, performance indicators, and future projections across customisable scenarios.

---

## Features

- **ETF management** — add up to 5 ETFs, update current price via JustETF API, archive inactive ones
- **Multi-broker** — associate each purchase with a broker (Degiro, Trade Republic, FINECO…); filter indicators and chart by broker
- **Purchase entry** — multi-ETF form with a single date and broker for all instruments; fractional shares calculated automatically
- **Historical chart** — real portfolio value over time, per ETF and aggregated
- **Future scenarios** — projection up to 20 years with monthly compound interest; customisable name, return rate and colour
- **Indicators** — ROI, net return, months active, CAGR, TWRR, ATWRR

---

## Tech Stack

| Role | Technology |
|---|---|
| Framework | React + Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Dates | date-fns |
| Auth & DB | Supabase (Auth + PostgreSQL) |
| Deploy | Vercel |

---

## Quick Start

### Prerequisites

- Node.js ≥ 18
- A [Supabase](https://supabase.com) project with tables initialised (see [`docs/model.md`](docs/model.md))

### Install

```bash
git clone https://github.com/AlfonsoGangemi/MoneyGrowth.git
cd MoneyGrowth/pac-dashboard
npm install
```

### Environment variables

Create a `.env.local` file inside `pac-dashboard/`:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

### Run

```bash
npm run dev
```

---

## Deploy on Vercel

1. Connect the repository to [Vercel](https://vercel.com)
2. Set the **Root Directory** to `pac-dashboard`
3. Add the environment variables in the Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Every push to `main` triggers an automatic deployment

---

## Documentation

| File | Contents |
|---|---|
| [`docs/function.md`](docs/function.md) | Detailed feature specifications |
| [`docs/model.md`](docs/model.md) | DB schema, RLS and frontend data model |
| [`docs/details.md`](docs/details.md) | Implementation details (auth, persistence) |
| [`docs/deploy.md`](docs/deploy.md) | Vercel deploy guide |

---

## License

[MIT](LICENSE)
