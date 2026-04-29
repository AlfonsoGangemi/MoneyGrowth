export default {
  faq_titolo: 'Frequently asked questions',

  // --- General ---
  faq_1_q: 'What is an ETF?',
  faq_1_a: 'An ETF (Exchange Traded Fund) is an investment fund traded on a stock exchange that tracks the performance of an index (e.g. MSCI World, S&amp;P 500). It allows portfolio diversification at very low management costs compared to traditional funds.',
  faq_2_q: 'What are the main characteristics of an ETF?',
  faq_2_a: 'ETFs combine the advantages of mutual funds with those of stocks. Their main characteristics are: <strong>instant diversification</strong> (a single ETF can hold hundreds of securities), <strong>low management costs</strong> (TER often below 0.20% per year), <strong>liquidity</strong> (bought and sold on the exchange during market hours), <strong>transparency</strong> (holdings are public and updated daily) and <strong>accessibility</strong> (you can start with small amounts, even with a monthly PAC from just a few tens of euros).',
  faq_3_q: 'How do you buy an ETF?',
  faq_3_a: 'To buy an ETF you need a brokerage account (e.g. Directa, Fineco, DEGIRO, Scalable Capital). You search for the ETF by its <strong>ISIN</strong> code or ticker, set the quantity or amount, and place a <strong>market order</strong> (executed immediately at the current price) or a <strong>limit order</strong> (executed only at the desired price). Trading is available during European exchange hours, typically from 9:00 to 17:30.',
  faq_4_q: 'What is a PAC (savings accumulation plan)?',
  faq_4_a: 'A PAC is an investment strategy that involves periodic contributions — monthly or quarterly — into one or more ETFs, regardless of market price. It reduces the impact of volatility through cost averaging.',

  // --- Platform ---
  faq_5_q: 'Why is it important to analyse your ETF portfolio?',
  faq_5_a: "Monitoring your portfolio helps you understand whether you are truly on track to meet your financial goals. Without accurate data it is hard to assess whether the real return justifies the risk, whether diversification is adequate, or whether it is time to rebalance. Regular analysis helps you make informed decisions rather than emotional ones.",
  faq_6_q: 'Does ETF Lens have a cost?',
  faq_6_a: 'ETF Lens offers a free plan that includes up to 9 ETFs, 4 brokers, and 100 recorded purchases. For those who want to remove these limits, the Plus plan is available. The source code is and will remain open source. There are no ads or data sales.',
  faq_7_q: 'Can I use ETF Lens with multiple brokers?',
  faq_7_a: 'Yes. You can record purchases from different brokers — Directa, Fineco, DEGIRO, Scalable Capital, Trading 212 and others — and view the portfolio both aggregated and broken down by broker.',
  faq_8_q: 'Can I import my data from a CSV or another tool?',
  faq_8_a: 'Yes. If you already have a JSON file exported from ETF Lens, you can re-import it directly from the dashboard to restore all your ETFs and purchases. If your data is in CSV format (broker export, Excel, Google Sheets), you can use the "Import from CSV with AI" feature: it generates a ready-made prompt to paste into ChatGPT or Claude, which will convert your CSV into the correct format. You can also export your entire portfolio at any time as a JSON backup.',

  // --- AI Integration ---
  faq_9_q: 'Can I analyse my portfolio with Claude or another AI?',
  faq_9_a: 'Yes. ETF Lens supports the MCP (Model Context Protocol): Claude Code and Claude Desktop can connect directly to your data and answer questions in natural language.<br><br>The recommended method is <strong>OAuth 2.1 with PKCE</strong>: simply add the server URL (<code>https://etflens.app/api/mcp</code>) to the MCP settings of your AI client — no credentials required. The client automatically starts the authorisation flow: you will be asked to log in to ETF Lens and grant consent. The access token expires after 1 hour and is refreshed in the background by the client.<br><br>Alternatively, you can use a <strong>Bearer API key</strong> generated from the dashboard (Settings → API key): useful for AI clients that do not yet support OAuth.',
  faq_10_q: 'What can I ask Claude when connected to ETF Lens?',
  faq_10_a: '<strong>Portfolio composition</strong>: allocation by asset class (equity, bonds, money market), distribution by issuer (Vanguard, iShares, Xtrackers), percentage weight of each ETF, breakdown by broker.<br><br><strong>Performance</strong>: realised return per ETF and total, comparison of average cost price vs current price, portfolio value over time using monthly historical prices, annualised return per position.<br><br><strong>Purchase analysis</strong>: PAC frequency and consistency, average amount invested per period, dollar-cost averaging (weighted average price) per ETF.<br><br><strong>Future projections</strong>: estimated future value using pessimistic (3%), moderate (6%) and optimistic (9%) scenarios, simulation with periodic contributions.<br><br><strong>Risk and diversification</strong>: implicit geographic concentration (e.g. US weight via S&amp;P 500), ETF overlap (e.g. FTSE All-World vs S&amp;P 500), equity/bond/money market balance.<br><br><strong>Broker analysis</strong>: capital invested and current value, historical performance, fees paid per broker.',

  // --- Security ---
  faq_11_q: 'Is my data secure?',
  faq_11_a: 'Data is stored on Supabase with secure authentication and Row Level Security (RLS): no other user can read your data. You can export or delete it at any time from the dashboard.',
  faq_12_q: 'What technical measures protect my data?',
  faq_12_a: "ETF Lens uses a multi-layer security approach. All communications are encrypted with <strong>TLS 1.3</strong>. Data at rest is encrypted with <strong>AES-256</strong> on Supabase's infrastructure (AWS). Authentication uses <strong>bcrypt</strong> for passwords — even in the event of a database breach, passwords are never recoverable in plaintext.<br><br>JWT tokens for MCP integration are signed with <strong>HMAC-SHA256</strong> and expire automatically. API keys are stored only as <strong>SHA-256</strong> hashes: once generated, not even the system can retrieve the original value.<br><br>Data isolation is enforced by <strong>Row Level Security (RLS)</strong> at the PostgreSQL level — every query is bound to the authenticated user, structurally preventing access to other users' records. AI connections via MCP use <strong>OAuth 2.1 with PKCE</strong>, eliminating the need to manage credentials manually.",
}
