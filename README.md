# Czech Price Hunter (MVP)

Starter project for comparing advertised products from Lidl, Kaufland, Billa, Albert and Penny in Czechia.

## Important limitation
This starter is a working application shell, database/API, scheduled Worker and data-import pipeline.
It does **not** yet automatically extract product names/prices from every retailer's flyers. Each retailer
needs a verified source adapter (official feed/page/PDF) and, where necessary, PDF/OCR processing.
The demo rows in `worker/src/demo-data.js` are explicitly fictional examples.

## Architecture
- `public/`: static website for GitHub Pages.
- `worker/`: Cloudflare Worker API, D1 schema, scheduled job.
- Cloudflare D1: stores flyers and normalized offer records.
- Cron: runs Wednesday and Friday at 06:00 Europe/Prague (Cloudflare cron uses UTC; DST needs attention).

## 1. Create the D1 database
```bash
cd worker
npm install
npx wrangler login
npx wrangler d1 create czech-price-hunter
```
Copy the database ID into `wrangler.toml` (replace `PUT_YOUR_D1_DATABASE_ID_HERE`).

Apply schema:
```bash
npx wrangler d1 migrations apply czech-price-hunter --remote
```

## 2. Set Worker secrets
Generate a long random token and set:
```bash
npx wrangler secret put ADMIN_TOKEN
```
Optional:
```bash
npx wrangler secret put ALLOWED_ORIGIN
```
Set it to your GitHub Pages origin, e.g. `https://YOURNAME.github.io`.

## 3. Deploy API
```bash
npx wrangler deploy
```
Copy the deployed Worker URL, e.g. `https://czech-price-hunter-api.YOURSUBDOMAIN.workers.dev`.

## 4. Configure the frontend
Edit `public/config.js` and set `API_BASE` to the Worker URL.
For local testing, run a static server from `public`:
```bash
python -m http.server 8000
```
Open http://localhost:8000.

## 5. Publish GitHub Pages
Create a GitHub repository named `czech-price-hunter`.
Copy the contents of `public/` into the repository root (or configure Pages to use `/public`).
In GitHub: Settings -> Pages -> Deploy from a branch -> main -> /(root).

## 6. Import offer data
Prepare a JSON file following `worker/src/import-example.json`:
```json
{
  "flyer": {
    "store": "Lidl",
    "region": "Zlínský kraj",
    "valid_from": "2026-11-19",
    "valid_to": "2026-11-25",
    "source_url": "https://example.com/official-flyer"
  },
  "offers": [
    {
      "name": "Mléko polotučné 1 l",
      "brand": "Example",
      "price": 17.9,
      "unit": "1 l",
      "old_price": 22.9,
      "valid_from": "2026-11-19",
      "valid_to": "2026-11-25",
      "loyalty_required": false
    }
  ]
}
```
Upload JSON through the app's Admin import section, using the ADMIN_TOKEN.
The import API validates and stores normalized records. Do not enter guessed prices; only use values
verified in the actual flyer or retailer source.

## 7. Scheduled collection
The Worker has a Wednesday/Friday cron entry. At present it creates a collection-run record and
reports which stores need checking. It intentionally does not pretend to download/extract offers.
The next implementation step is to build and test five source adapters, one retailer at a time:
1. Lidl
2. Kaufland
3. Billa
4. Albert
5. Penny

For each adapter, verify whether the retailer offers an official feed, flyer page, PDF, structured data,
or permitted public endpoint. Respect site terms, robots rules and rate limits. If only PDF/image flyers
are available, add a dedicated PDF/OCR pipeline and human review before publishing offers.

## API routes
- `GET /api/health`
- `GET /api/stores`
- `GET /api/search?q=maslo&store=Lidl&region=Zl%C3%ADnsk%C3%BD%20kraj`
- `GET /api/flyers?region=Zl%C3%ADnsk%C3%BD%20kraj`
- `POST /api/import` (Bearer ADMIN_TOKEN)
- `POST /api/collection-run` (Bearer ADMIN_TOKEN; manual trigger)

## Dates
Store dates as ISO `YYYY-MM-DD`. The frontend displays dates in Czech format.

## Themes
The frontend includes separate light and dark CSS themes. The switch is in the header; the selection is saved in localStorage on the user's device. On first visit, the app follows the device's preferred color scheme.
