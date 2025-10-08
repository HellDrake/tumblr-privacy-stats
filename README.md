Tumblr Privacy‑First Country Stats (Visits + Asks)

Overview
- Server: Node.js/Express. Resolves country from IP on the server, then discards the IP immediately. Stores only aggregated counters by country and day. No raw IPs written to disk or logs.
- Widget: Small embeddable JS (<=100KB) for Tumblr that (a) posts a minimal event to `/collect`, (b) shows a tiny banner with top countries from `/stats`, and (c) provides a link to delete the short‑lived session cookie or opt‑out locally.

Key Privacy Properties
- No IPs persisted: IPs are used only in memory for GeoIP lookup and then dropped. No IPs in logs or storage.
- Aggregated only: Storage is daily aggregates by country and event type (views, asks) — no per‑user data.
- Optional short session cookie: Random UUID to deduplicate bursts and optionally correlate an ask with the same session. Cookie is httpOnly, short‑lived, and not stored server‑side beyond in‑memory dedup. Clearing link provided.
- Retention: Configurable daily aggregates retention (default 90 days).

Project Structure
- `src/app.js`: Express app, endpoints, privacy logic
- `src/server.js`: Bootstraps HTTP server
- `src/geo.js`: Country lookup using `geoip-lite`
- `src/store.js`: JSON file aggregate store with pruning
- `public/widget.js`: Embeddable widget for Tumblr
- `tests/server.test.js`: Basic tests with country override

Setup
1) Install dependencies
   npm install

2) Configure environment (optional)
   - `PORT`: default 3000
   - `TRUST_PROXY=true` if behind a proxy (so `X-Forwarded-For` is trusted)
   - `ALLOWED_ORIGINS`: comma‑separated list, e.g. `https://yourblog.tumblr.com,https://yourdomain` (use `*` for all during testing)
   - `COOKIE_SECURE=true` in production (served over HTTPS)
   - `COOKIE_SAMESITE=None` (default) to allow third‑party contexts
   - `RETENTION_DAYS=90` data retention for aggregates
   - `DATA_FILE` path for aggregates JSON (default `data/aggregates.json`)

3) Run
   npm run dev

Endpoints
- `POST /collect`: minimal payload `{ type?: 'view'|'ask', page?: string, vp?: {w,h} }`. The server obtains IP from the connection or `X-Forwarded-For`, resolves country via GeoIP, then immediately discards the IP. Updates aggregated counters per country and day. Returns `204`.
- `GET /stats`: JSON `{ updatedAt, periods: { day, week, month } }`, each with `{ views: {CC:count}, asks: {CC:count} }`.
- `GET /session/clear`: clears the short‑lived httpOnly session cookie.
- `GET /health`: liveness check.

Embed in Tumblr
1) Host this service under your domain with HTTPS (e.g., `https://stats.yourdomain.com`).
2) In Tumblr dashboard → Edit appearance → Edit theme → Edit HTML:
   - Paste before `</head>` or anywhere before `</body>`:
     <script defer src="https://stats.yourdomain.com/widget.js" data-endpoint="https://stats.yourdomain.com"></script>
3) Save. The widget:
   - Sends a `view` event on page load.
   - Attempts to detect ask form submissions and sends an `ask` event on submit.
   - Shows a small “Estadísticas agregadas (privadas)” panel with top countries for Today and Week.
   - Includes a link “Eliminar cookie de sesión” (calls `/session/clear`) and an opt‑in/out local toggle.

Testing
- Run unit tests:
  npm test
  Tests use `X-Country-Override` header with `ALLOW_COUNTRY_OVERRIDE=true` to avoid relying on MaxMind data.

Security & GDPR Notes
- Data minimization: Only aggregates by day and country are stored. No IP addresses, no user identifiers.
- Session cookie: Random UUID, httpOnly, short TTL (default 30 minutes), used only for in‑memory dedup; link provided to clear it.
- Retention: Configure `RETENTION_DAYS` (e.g., 90). Aggregates older than retention are pruned automatically.
- Transparency: Banner clearly explains collection, and includes cookie removal and opt‑out control.
- Lawful basis: Likely legitimate interest for anonymous, aggregated analytics. Confirm with local counsel. Provide privacy policy mention and contact for requests.
- DPA/International transfers: If hosting in specific regions, disclose region and processor terms.

Production Recommendations
- Serve over HTTPS with `COOKIE_SECURE=true`.
- Set `ALLOWED_ORIGINS` to your Tumblr blog origin(s).
- Optionally replace `geoip-lite` with a regularly updated MaxMind DB via the `maxmind` npm package; ensure database files are loaded in memory and not logging queries. Keep same privacy guarantees.
- Consider rate limiting and basic abuse protections if exposed publicly.

