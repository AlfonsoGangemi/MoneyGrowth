# ETF Lens MCP — Guida al Client Python

Documentazione completa per implementare un client Python indipendente che si connette al server MCP di ETF Lens e interroga i dati del portafoglio.

---

## Indice

1. [Panoramica](#1-panoramica)
2. [Autenticazione — API Key (percorso rapido)](#2-autenticazione--api-key-percorso-rapido)
3. [Autenticazione — OAuth 2.1 + PKCE (percorso standard)](#3-autenticazione--oauth-21--pkce-percorso-standard)
4. [Protocollo MCP su HTTP](#4-protocollo-mcp-su-http)
5. [Resources disponibili](#5-resources-disponibili)
6. [Tools disponibili](#6-tools-disponibili)
7. [Client Python completo](#7-client-python-completo)
8. [Esempi d'uso](#8-esempi-duso)
9. [Gestione degli errori](#9-gestione-degli-errori)
10. [Variabili d'ambiente](#10-variabili-dambiente)

---

## 1. Panoramica

### Endpoint principale

```
POST https://etflens.app/api/mcp
```

Il server implementa il protocollo **MCP (Model Context Protocol)** su trasporto **Streamable HTTP stateless** (spec MCP 2024-11-05). Non usa SSE né session ID.

Ogni richiesta è indipendente: nessuno stato lato server tra chiamate consecutive.

### Autenticazione supportata

| Metodo | Header | Quando usarlo |
|---|---|---|
| **API Key** | `Authorization: Bearer pac_<64hex>` | Script, automazioni, ambienti CI |
| **OAuth 2.1 + PKCE** | `Authorization: Bearer <JWT>` | Applicazioni interattive, utenti finali |

### Dipendenze Python richieste

```bash
pip install httpx  # HTTP client (supporta sia sync che async)
# oppure: pip install requests  # alternativa sync-only
```

Per il flusso OAuth è necessario anche:

```bash
pip install cryptography  # per PKCE code_challenge S256
```

---

## 2. Autenticazione — API Key (percorso rapido)

### 2.1 Ottenere una API Key

Le chiavi si generano dall'interfaccia web di ETF Lens:

1. Accedi a `https://etflens.app`
2. Apri il pannello **"Accesso API"** (icona chiave nell'header)
3. Clicca su **"Genera chiave"** nella sezione collapsible
4. Copia la chiave **immediatamente** — non viene più mostrata

La chiave ha il formato: `pac_` seguito da 64 caratteri esadecimali.

```
pac_a1b2c3d4e5f6...  (68 caratteri totali)
```

**Limiti:**
- Max 2 chiavi attive per utente
- TTL: 90 giorni dalla creazione
- Max 5 creazioni nelle ultime 24h

### 2.2 Uso della chiave

Includi la chiave in ogni richiesta nell'header `Authorization`:

```python
headers = {
    "Authorization": "Bearer pac_la_tua_chiave_qui",
    "Content-Type": "application/json",
}
```

---

## 3. Autenticazione — OAuth 2.1 + PKCE (percorso standard)

Questo flusso non richiede all'utente di copiare chiavi. Il token viene ottenuto automaticamente tramite browser.

### 3.1 Endpoint OAuth

| Endpoint | URL |
|---|---|
| Discovery | `GET https://etflens.app/.well-known/oauth-authorization-server` |
| Protected Resource | `GET https://etflens.app/.well-known/oauth-protected-resource` |
| Registration | `POST https://etflens.app/api/oauth/register` |
| Authorization | `POST https://etflens.app/api/oauth/authorize` |
| Token | `POST https://etflens.app/api/oauth/token` |

### 3.2 Flusso completo PKCE

```
Client Python                    ETF Lens AS                Browser Utente
     |                                |                            |
     |-- GET /.well-known/... ------->|                            |
     |<-- metadata (endpoints) -------|                            |
     |                                |                            |
     |-- POST /api/oauth/register --->|                            |
     |<-- { client_id } --------------|                            |
     |                                |                            |
     | genera code_verifier (random)  |                            |
     | calcola code_challenge = S256  |                            |
     | avvia server locale su :8888   |                            |
     |                                |                            |
     |-- apre browser con URL ------->|-----> utente vede login -->|
     |                                |<---- utente si autentica --|
     |                                |<---- POST /authorize -------|
     |                                |-- redirect ?code=... ------>|
     |<-- GET /callback?code=... ------------------------------------|
     |                                |                            |
     |-- POST /api/oauth/token ------>|                            |
     |   { code, code_verifier }      |                            |
     |<-- { access_token, ... } ------|                            |
     |                                |                            |
     | usa access_token per MCP       |                            |
```

### 3.3 Generazione PKCE

```python
import os
import hashlib
import base64

def generate_pkce_pair():
    code_verifier = base64.urlsafe_b64encode(os.urandom(32)).rstrip(b'=').decode()
    digest = hashlib.sha256(code_verifier.encode()).digest()
    code_challenge = base64.urlsafe_b64encode(digest).rstrip(b'=').decode()
    return code_verifier, code_challenge
```

### 3.4 Discovery metadata

```python
import httpx

BASE_URL = "https://etflens.app"

def fetch_metadata():
    r = httpx.get(f"{BASE_URL}/.well-known/oauth-authorization-server")
    r.raise_for_status()
    return r.json()
```

Risposta:

```json
{
  "issuer": "https://etflens.app",
  "authorization_endpoint": "https://etflens.app/api/oauth/authorize",
  "token_endpoint": "https://etflens.app/api/oauth/token",
  "registration_endpoint": "https://etflens.app/api/oauth/register",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"],
  "token_endpoint_auth_methods_supported": ["none"]
}
```

### 3.5 Dynamic Client Registration

Prima di autorizzare, registra il tuo client (una sola volta, puoi cachearlo):

```python
def register_client(redirect_uri: str) -> str:
    r = httpx.post(
        f"{BASE_URL}/api/oauth/register",
        json={
            "client_name": "etflens-python-client",
            "redirect_uris": [redirect_uri],
        }
    )
    r.raise_for_status()
    return r.json()["client_id"]
```

### 3.6 Authorization con callback locale

```python
import threading
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler

CALLBACK_PORT = 8888
CALLBACK_URI = f"http://localhost:{CALLBACK_PORT}/callback"

received_code = None

class CallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        global received_code
        params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        received_code = params.get("code", [None])[0]
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(b"<h1>Autenticazione completata. Puoi chiudere questa finestra.</h1>")

    def log_message(self, *args):
        pass  # silenzia i log del server HTTP


def wait_for_code() -> str:
    server = HTTPServer(("localhost", CALLBACK_PORT), CallbackHandler)
    server.handle_request()  # blocca fino al primo GET
    return received_code
```

### 3.7 Apertura del browser e scambio token

```python
import webbrowser
import httpx

def oauth_login(supabase_access_token: str) -> dict:
    code_verifier, code_challenge = generate_pkce_pair()
    state = base64.urlsafe_b64encode(os.urandom(16)).rstrip(b'=').decode()

    client_id = register_client(CALLBACK_URI)

    # costruisce l'URL di autorizzazione
    # NOTA: il server ETF Lens accetta POST /api/oauth/authorize con JSON body
    # il browser viene usato solo per l'autenticazione Supabase dell'utente;
    # il codice autorizzativo viene restituito via redirect al callback locale.
    #
    # Flusso alternativo per script non-interattivi: vedi sezione 3.8

    # per client interattivi: apri browser, attendi callback
    auth_params = {
        "client_id": client_id,
        "redirect_uri": CALLBACK_URI,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
        "state": state,
        "scope": "portfolio:read",
        "response_type": "code",
    }
    auth_url = f"{BASE_URL}/oauth/authorize?" + urllib.parse.urlencode(auth_params)
    webbrowser.open(auth_url)

    # attendi il codice nel callback
    code = wait_for_code()
    if not code:
        raise RuntimeError("Autorizzazione fallita: nessun codice ricevuto")

    # scambia il codice con un access token
    r = httpx.post(
        f"{BASE_URL}/api/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "code_verifier": code_verifier,
            "redirect_uri": CALLBACK_URI,
            "client_id": client_id,
        }
    )
    r.raise_for_status()
    return r.json()
    # { access_token, token_type, expires_in, refresh_token, scope }
```

### 3.8 Refresh del token

L'`access_token` ha TTL di **1 ora**. Il `refresh_token` dura **30 giorni** ed è a rotazione: ogni refresh ne genera uno nuovo.

```python
def refresh_access_token(refresh_token: str, client_id: str) -> dict:
    r = httpx.post(
        f"{BASE_URL}/api/oauth/token",
        data={
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": client_id,
        }
    )
    r.raise_for_status()
    return r.json()
    # { access_token, token_type, expires_in, refresh_token, scope }
```

---

## 4. Protocollo MCP su HTTP

### 4.1 Struttura di una richiesta

Ogni chiamata è un **POST** a `/api/mcp` con body JSON-RPC 2.0:

```python
def mcp_request(method: str, params: dict, token: str) -> dict:
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": method,
        "params": params,
    }
    r = httpx.post(
        "https://etflens.app/api/mcp",
        json=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        timeout=30.0,
    )
    r.raise_for_status()
    result = r.json()
    if "error" in result:
        raise RuntimeError(f"MCP error {result['error']['code']}: {result['error']['message']}")
    return result.get("result", {})
```

### 4.2 Handshake iniziale (initialize)

La prima chiamata deve essere `initialize` per negoziare la versione del protocollo:

```python
def mcp_initialize(token: str) -> dict:
    return mcp_request("initialize", {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {
            "name": "etflens-python-client",
            "version": "1.0.0",
        }
    }, token)
```

Risposta attesa:

```json
{
  "protocolVersion": "2024-11-05",
  "capabilities": {
    "resources": {},
    "tools": {}
  },
  "serverInfo": {
    "name": "etflens-mcp",
    "version": "1.0.0"
  }
}
```

### 4.3 Metodi disponibili

| Metodo JSON-RPC | Descrizione |
|---|---|
| `initialize` | Handshake iniziale |
| `resources/list` | Elenca le risorse disponibili |
| `resources/read` | Legge il contenuto di una risorsa |
| `tools/list` | Elenca i tool disponibili con schema parametri |
| `tools/call` | Esegue un tool con i parametri specificati |

---

## 5. Resources disponibili

Le risorse sono dati statici (o quasi-statici) leggibili via `resources/read`.

### 5.1 Elenco risorse

```python
def list_resources(token: str) -> list:
    result = mcp_request("resources/list", {}, token)
    return result.get("resources", [])
```

### 5.2 `portfolio://broker`

Lista dei broker configurati dall'utente con prezzi correnti degli ETF associati.

```python
def get_broker_resource(token: str) -> str:
    result = mcp_request("resources/read", {"uri": "portfolio://broker"}, token)
    return result["contents"][0]["text"]  # JSON string
```

Schema del contenuto (array di broker):

```json
[
  {
    "id": "uuid",
    "nome": "Directa",
    "etf": [
      {
        "id": "uuid",
        "nome": "Vanguard FTSE All-World",
        "isin": "IE00B3RBWM25",
        "ticker": "VWRL",
        "prezzo_attuale": 112.45,
        "valuta": "EUR",
        "asset_class": "Azionario Globale"
      }
    ]
  }
]
```

### 5.3 `portfolio://indici`

Lista degli indicatori finanziari calcolabili tramite il tool `get_calcoli`.

```python
def get_indici_resource(token: str) -> str:
    result = mcp_request("resources/read", {"uri": "portfolio://indici"}, token)
    return result["contents"][0]["text"]
```

Indicatori disponibili:

| Nome funzione | Descrizione |
|---|---|
| `totaleInvestito` | Capitale totale investito (importo + fees) |
| `totaleQuote` | Numero totale di quote accumulate |
| `valoreAttuale` | Valore portafoglio al prezzo corrente |
| `calcolaROI` | Rendimento percentuale (ROI) |
| `calcolaRendimentoNetto` | Rendimento netto in EUR |
| `calcolaDurataM` | Durata PAC in mesi dal primo acquisto |
| `calcolaCAGR` | Tasso di crescita annuale composto |
| `calcolaTWRR` | Time-Weighted Rate of Return |
| `calcolaATWRR` | TWRR annualizzato |
| `calcolaIRR` | Internal Rate of Return (XIRR, Newton-Raphson) |
| `serieStorica` | Serie storica con prezzi come proxy NAV |
| `serieStoricaAggregata` | Multi-ETF con timeline unificata |
| `serieStoricaDaPrezziStorici` | Serie mensile da `etf_prezzi_storici` (3 livelli fallback) |
| `calcolaMaxDrawdown` | Maximum drawdown percentuale |
| `calcolaVolatilità` | Volatilità annualizzata |
| `calcolaProiezione` | Proiezione futura con interesse composto |
| `indicatoriPortafoglio` | Aggregati portafoglio (tot, ROI, CAGR, fee) |
| `distribuzioneAssetClass` | Distribuzione % per asset class |

### 5.4 `portfolio://formulas/calcoli`

Codice sorgente completo di `calcoli.js` — la libreria di calcolo finanziario usata dall'app.

```python
def get_calcoli_source(token: str) -> str:
    result = mcp_request("resources/read", {"uri": "portfolio://formulas/calcoli"}, token)
    return result["contents"][0]["text"]  # sorgente JavaScript
```

---

## 6. Tools disponibili

I tool eseguono query su Supabase e restituiscono dati dell'utente autenticato. Ogni tool filtra automaticamente per `user_id` — non è possibile accedere a dati di altri utenti.

### 6.1 Elenco tool

```python
def list_tools(token: str) -> list:
    result = mcp_request("tools/list", {}, token)
    return result.get("tools", [])
```

### 6.2 `get_portafoglio`

Recupera l'intero portafoglio in un singolo payload. Il tool più completo.

**Parametri:** nessuno

```python
def get_portafoglio(token: str) -> dict:
    result = mcp_request("tools/call", {
        "name": "get_portafoglio",
        "arguments": {}
    }, token)
    import json
    return json.loads(result["content"][0]["text"])
```

**Schema risposta:**

```json
{
  "etf": [
    {
      "id": "uuid",
      "nome": "Vanguard FTSE All-World",
      "isin": "IE00B3RBWM25",
      "ticker": "VWRL",
      "prezzo_attuale": 112.45,
      "valuta": "EUR",
      "asset_class": "Azionario Globale",
      "broker_id": "uuid",
      "note": "ETF principale del PAC"
    }
  ],
  "acquisti": [
    {
      "id": "uuid",
      "etf_id": "uuid",
      "data": "2024-01-15",
      "quote": 5.5,
      "prezzo": 98.30,
      "importo": 540.65,
      "fees": 2.95
    }
  ],
  "prezzi_storici": [
    {
      "etf_id": "uuid",
      "isin": "IE00B3RBWM25",
      "mese": "2024-01",
      "prezzo": 102.10
    }
  ],
  "scenari": [
    {
      "id": "uuid",
      "nome": "Scenario base",
      "rata_mensile": 500,
      "anni": 20,
      "rendimento_atteso": 7.0
    }
  ],
  "broker": [
    {
      "id": "uuid",
      "nome": "Directa"
    }
  ]
}
```

### 6.3 `get_etf`

Restituisce gli ETF dell'utente, con filtro opzionale per broker.

**Parametri:**

| Parametro | Tipo | Obbligatorio | Descrizione |
|---|---|---|---|
| `broker_id` | `string` (UUID) | No | Filtra per broker specifico |

```python
def get_etf(token: str, broker_id: str = None) -> list:
    args = {}
    if broker_id:
        args["broker_id"] = broker_id
    result = mcp_request("tools/call", {
        "name": "get_etf",
        "arguments": args
    }, token)
    import json
    return json.loads(result["content"][0]["text"])
```

### 6.4 `get_prezzi_storici`

Prezzi storici mensili per un ISIN specifico. Verifica che l'ISIN appartenga al portafoglio dell'utente.

**Parametri:**

| Parametro | Tipo | Obbligatorio | Descrizione |
|---|---|---|---|
| `isin` | `string` | Sì | ISIN dell'ETF (es. `IE00B3RBWM25`) |

```python
def get_prezzi_storici(token: str, isin: str) -> list:
    result = mcp_request("tools/call", {
        "name": "get_prezzi_storici",
        "arguments": {"isin": isin}
    }, token)
    import json
    return json.loads(result["content"][0]["text"])
    # [{ "mese": "2024-01", "prezzo": 102.10 }, ...]
```

### 6.5 `get_acquisti`

Acquisti con filtri opzionali su ETF e range di date.

**Parametri:**

| Parametro | Tipo | Obbligatorio | Descrizione |
|---|---|---|---|
| `etf_id` | `string` (UUID) | No | Filtra per ETF |
| `da` | `string` (YYYY-MM-DD) | No | Data inizio range |
| `a` | `string` (YYYY-MM-DD) | No | Data fine range |

```python
def get_acquisti(token: str, etf_id: str = None, da: str = None, a: str = None) -> list:
    args = {}
    if etf_id:
        args["etf_id"] = etf_id
    if da:
        args["da"] = da
    if a:
        args["a"] = a
    result = mcp_request("tools/call", {
        "name": "get_acquisti",
        "arguments": args
    }, token)
    import json
    return json.loads(result["content"][0]["text"])
```

### 6.6 `get_storico`

Dati da `portafoglio_storico_annuale` — snapshot annuali del portafoglio.

**Parametri:**

| Parametro | Tipo | Obbligatorio | Descrizione |
|---|---|---|---|
| `anno` | `integer` | No | Anno specifico (es. `2024`); se omesso restituisce tutti gli anni |

```python
def get_storico(token: str, anno: int = None) -> list:
    args = {}
    if anno:
        args["anno"] = anno
    result = mcp_request("tools/call", {
        "name": "get_storico",
        "arguments": args
    }, token)
    import json
    return json.loads(result["content"][0]["text"])
```

### 6.7 `get_calcoli`

Estrae funzioni specifiche da `calcoli.js` oppure restituisce l'intera sorgente.

**Parametri:**

| Parametro | Tipo | Obbligatorio | Descrizione |
|---|---|---|---|
| `funzioni` | `array<string>` | No | Lista di nomi di funzioni da estrarre; se omesso restituisce tutto |

```python
def get_calcoli(token: str, funzioni: list = None) -> str:
    args = {}
    if funzioni:
        args["funzioni"] = funzioni
    result = mcp_request("tools/call", {
        "name": "get_calcoli",
        "arguments": args
    }, token)
    return result["content"][0]["text"]  # sorgente JavaScript
```

---

## 7. Client Python completo

File unico pronto all'uso. Supporta sia API Key che OAuth (refresh automatico).

```python
"""
etflens_client.py — Client MCP per ETF Lens
Richiede: pip install httpx
"""

import os
import json
import hashlib
import base64
import urllib.parse
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime, timezone
from pathlib import Path

import httpx

BASE_URL = "https://etflens.app"
CALLBACK_PORT = 8888
CALLBACK_URI = f"http://localhost:{CALLBACK_PORT}/callback"
TOKEN_CACHE_FILE = Path.home() / ".etflens_token.json"


# ---------------------------------------------------------------------------
# PKCE helpers
# ---------------------------------------------------------------------------

def _generate_pkce_pair():
    verifier = base64.urlsafe_b64encode(os.urandom(32)).rstrip(b"=").decode()
    digest = hashlib.sha256(verifier.encode()).digest()
    challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    return verifier, challenge


# ---------------------------------------------------------------------------
# OAuth callback server (locale, una richiesta)
# ---------------------------------------------------------------------------

class _CallbackHandler(BaseHTTPRequestHandler):
    received_code = None

    def do_GET(self):
        params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        _CallbackHandler.received_code = params.get("code", [None])[0]
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(
            b"<h1>Autenticazione completata.</h1>"
            b"<p>Puoi chiudere questa finestra.</p>"
        )

    def log_message(self, *args):
        pass


def _wait_for_callback_code() -> str:
    server = HTTPServer(("localhost", CALLBACK_PORT), _CallbackHandler)
    server.handle_request()
    return _CallbackHandler.received_code


# ---------------------------------------------------------------------------
# Token cache su disco
# ---------------------------------------------------------------------------

def _load_token_cache() -> dict:
    if TOKEN_CACHE_FILE.exists():
        try:
            return json.loads(TOKEN_CACHE_FILE.read_text())
        except Exception:
            pass
    return {}


def _save_token_cache(data: dict):
    TOKEN_CACHE_FILE.write_text(json.dumps(data, indent=2))
    TOKEN_CACHE_FILE.chmod(0o600)


def _is_token_expired(token_data: dict) -> bool:
    exp = token_data.get("expires_at")
    if not exp:
        return True
    return datetime.now(timezone.utc).timestamp() >= exp - 60  # 60s di margine


# ---------------------------------------------------------------------------
# Client principale
# ---------------------------------------------------------------------------

class EtfLensClient:
    """
    Client MCP per ETF Lens. Supporta autenticazione via API Key o OAuth.

    Uso con API Key:
        client = EtfLensClient(api_key="pac_...")
        portafoglio = client.get_portafoglio()

    Uso con OAuth (interattivo):
        client = EtfLensClient()
        client.login()
        portafoglio = client.get_portafoglio()
    """

    def __init__(self, api_key: str = None):
        self._api_key = api_key or os.environ.get("ETFLENS_API_KEY")
        self._access_token: str = None
        self._refresh_token: str = None
        self._client_id: str = None

        # carica token OAuth dalla cache se disponibile
        if not self._api_key:
            cache = _load_token_cache()
            if cache:
                self._access_token = cache.get("access_token")
                self._refresh_token = cache.get("refresh_token")
                self._client_id = cache.get("client_id")
                self._token_expires_at = cache.get("expires_at", 0)

    # -------------------------------------------------------------------------
    # Auth
    # -------------------------------------------------------------------------

    def login(self):
        """Avvia il flusso OAuth interattivo. Apre il browser per l'autenticazione."""
        if self._api_key:
            print("Usando API Key, login OAuth non necessario.")
            return

        cache = _load_token_cache()
        if cache and not _is_token_expired(cache):
            self._access_token = cache["access_token"]
            self._refresh_token = cache["refresh_token"]
            self._client_id = cache["client_id"]
            print("Token OAuth valido trovato in cache.")
            return

        if cache.get("refresh_token") and not _is_token_expired(cache):
            self._refresh(cache["refresh_token"], cache["client_id"])
            return

        self._oauth_flow()

    def _oauth_flow(self):
        # 1. registra client
        r = httpx.post(
            f"{BASE_URL}/api/oauth/register",
            json={"client_name": "etflens-python-client", "redirect_uris": [CALLBACK_URI]},
        )
        r.raise_for_status()
        self._client_id = r.json()["client_id"]

        # 2. genera PKCE
        verifier, challenge = _generate_pkce_pair()
        state = base64.urlsafe_b64encode(os.urandom(16)).rstrip(b"=").decode()

        # 3. apri browser
        params = urllib.parse.urlencode({
            "client_id": self._client_id,
            "redirect_uri": CALLBACK_URI,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "state": state,
            "scope": "portfolio:read",
            "response_type": "code",
        })
        webbrowser.open(f"{BASE_URL}/oauth/authorize?{params}")
        print(f"Browser aperto per autenticazione. In attesa del callback su porta {CALLBACK_PORT}...")

        # 4. attendi codice
        code = _wait_for_callback_code()
        if not code:
            raise RuntimeError("Nessun codice di autorizzazione ricevuto.")

        # 5. scambia codice con token
        r = httpx.post(
            f"{BASE_URL}/api/oauth/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "code_verifier": verifier,
                "redirect_uri": CALLBACK_URI,
                "client_id": self._client_id,
            },
        )
        r.raise_for_status()
        self._store_tokens(r.json())
        print("Autenticazione OAuth completata.")

    def _refresh(self, refresh_token: str, client_id: str):
        r = httpx.post(
            f"{BASE_URL}/api/oauth/token",
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": client_id,
            },
        )
        r.raise_for_status()
        self._store_tokens(r.json())

    def _store_tokens(self, token_response: dict):
        self._access_token = token_response["access_token"]
        self._refresh_token = token_response.get("refresh_token")
        expires_in = token_response.get("expires_in", 3600)
        expires_at = datetime.now(timezone.utc).timestamp() + expires_in
        cache = {
            "access_token": self._access_token,
            "refresh_token": self._refresh_token,
            "client_id": self._client_id,
            "expires_at": expires_at,
        }
        _save_token_cache(cache)

    def _get_auth_header(self) -> str:
        if self._api_key:
            return f"Bearer {self._api_key}"
        if not self._access_token:
            raise RuntimeError("Non autenticato. Chiama login() prima di usare il client.")
        cache = _load_token_cache()
        if _is_token_expired(cache) and self._refresh_token:
            self._refresh(self._refresh_token, self._client_id)
        return f"Bearer {self._access_token}"

    # -------------------------------------------------------------------------
    # Core MCP
    # -------------------------------------------------------------------------

    def _call(self, method: str, params: dict = None) -> dict:
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params or {},
        }
        r = httpx.post(
            f"{BASE_URL}/api/mcp",
            json=payload,
            headers={
                "Authorization": self._get_auth_header(),
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )
        if r.status_code == 401:
            raise PermissionError("Token non valido o scaduto. Esegui login() di nuovo.")
        r.raise_for_status()
        result = r.json()
        if "error" in result:
            raise RuntimeError(f"MCP {result['error']['code']}: {result['error']['message']}")
        return result.get("result", {})

    def initialize(self) -> dict:
        return self._call("initialize", {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "etflens-python-client", "version": "1.0.0"},
        })

    # -------------------------------------------------------------------------
    # Resources
    # -------------------------------------------------------------------------

    def _read_resource(self, uri: str) -> str:
        result = self._call("resources/read", {"uri": uri})
        return result["contents"][0]["text"]

    def get_broker_resource(self) -> list:
        return json.loads(self._read_resource("portfolio://broker"))

    def get_indici_resource(self) -> list:
        return json.loads(self._read_resource("portfolio://indici"))

    def get_calcoli_source(self) -> str:
        return self._read_resource("portfolio://formulas/calcoli")

    # -------------------------------------------------------------------------
    # Tools
    # -------------------------------------------------------------------------

    def _call_tool(self, name: str, arguments: dict = None) -> any:
        result = self._call("tools/call", {"name": name, "arguments": arguments or {}})
        text = result["content"][0]["text"]
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return text

    def get_portafoglio(self) -> dict:
        """Portafoglio completo: ETF, acquisti, prezzi storici, scenari, broker."""
        return self._call_tool("get_portafoglio")

    def get_etf(self, broker_id: str = None) -> list:
        """ETF dell'utente. Filtra per broker_id se specificato."""
        args = {}
        if broker_id:
            args["broker_id"] = broker_id
        return self._call_tool("get_etf", args)

    def get_prezzi_storici(self, isin: str) -> list:
        """Prezzi storici mensili per ISIN. Es: 'IE00B3RBWM25'"""
        return self._call_tool("get_prezzi_storici", {"isin": isin})

    def get_acquisti(self, etf_id: str = None, da: str = None, a: str = None) -> list:
        """Acquisti con filtri opzionali. Date in formato YYYY-MM-DD."""
        args = {}
        if etf_id:
            args["etf_id"] = etf_id
        if da:
            args["da"] = da
        if a:
            args["a"] = a
        return self._call_tool("get_acquisti", args)

    def get_storico(self, anno: int = None) -> list:
        """Snapshot annuali del portafoglio. Anno es: 2024."""
        args = {}
        if anno:
            args["anno"] = anno
        return self._call_tool("get_storico", args)

    def get_calcoli(self, funzioni: list = None) -> str:
        """Sorgente JS di calcoli.js. Filtra per nomi funzione se specificato."""
        args = {}
        if funzioni:
            args["funzioni"] = funzioni
        return self._call_tool("get_calcoli", args)
```

---

## 8. Esempi d'uso

### Con API Key (script)

```python
from etflens_client import EtfLensClient

client = EtfLensClient(api_key="pac_la_tua_chiave_qui")

# handshake (opzionale ma consigliato alla prima connessione)
client.initialize()

# leggi tutto il portafoglio
portafoglio = client.get_portafoglio()
print(f"ETF nel portafoglio: {len(portafoglio['etf'])}")
print(f"Acquisti totali: {len(portafoglio['acquisti'])}")

# calcola investimento totale
totale = sum(a["importo"] + a.get("fees", 0) for a in portafoglio["acquisti"])
print(f"Totale investito: €{totale:,.2f}")
```

### Con OAuth (interattivo)

```python
from etflens_client import EtfLensClient

client = EtfLensClient()
client.login()  # apre il browser la prima volta; riusa la cache nelle sessioni successive

portafoglio = client.get_portafoglio()
for etf in portafoglio["etf"]:
    print(f"{etf['ticker']} — {etf['nome']}: €{etf['prezzo_attuale']}")
```

### Prezzi storici di un ETF specifico

```python
storico = client.get_prezzi_storici("IE00B3RBWM25")
for mese in storico[-12:]:  # ultimi 12 mesi
    print(f"{mese['mese']}: €{mese['prezzo']}")
```

### Acquisti nell'ultimo anno

```python
acquisti = client.get_acquisti(da="2024-01-01", a="2024-12-31")
totale_anno = sum(a["importo"] for a in acquisti)
print(f"Investito nel 2024: €{totale_anno:,.2f}")
```

### Leggi una funzione specifica da calcoli.js

```python
sorgente = client.get_calcoli(funzioni=["calcolaCAGR", "calcolaTWRR"])
print(sorgente)  # codice JavaScript delle sole funzioni richieste
```

---

## 9. Gestione degli errori

### Codici di stato HTTP

| Codice | Significato | Soluzione |
|---|---|---|
| `401` | Token non valido o scaduto | Riesegui `login()` o rigenera la API Key |
| `403` | Accesso negato (ownership check) | L'ISIN/ETF non appartiene al tuo portafoglio |
| `429` | Rate limit superato | Attendi prima di riprovare |
| `500` | Errore server | Riprova; se persiste, controlla lo stato di Vercel |

### Errori JSON-RPC

| Codice | Significato |
|---|---|
| `-32700` | JSON non valido |
| `-32600` | Richiesta non valida |
| `-32601` | Metodo non trovato |
| `-32602` | Parametri non validi |
| `-32603` | Errore interno |

### Header di errore autenticazione

In caso di `401`, il server risponde con:

```
WWW-Authenticate: Bearer realm="etflens", error="invalid_token"
```

---

## 10. Variabili d'ambiente

Per non hardcodare la API Key nello script, usa variabili d'ambiente:

```bash
# Linux/macOS
export ETFLENS_API_KEY="pac_la_tua_chiave_qui"

# Windows PowerShell
$env:ETFLENS_API_KEY = "pac_la_tua_chiave_qui"
```

Il client la legge automaticamente se non passata nel costruttore:

```python
client = EtfLensClient()  # legge da ETFLENS_API_KEY
```

### Variabili d'ambiente riconosciute

| Variabile | Descrizione |
|---|---|
| `ETFLENS_API_KEY` | API Key in formato `pac_<64hex>` |

Il token OAuth viene salvato in `~/.etflens_token.json` con permessi `600` (leggibile solo dall'utente corrente).
