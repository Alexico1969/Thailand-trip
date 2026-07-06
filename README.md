# Bangkok Buddy

A mobile-first personal trip companion for a Bangkok trip. Six tools in one app: a dashboard with weather/rates/checklists, a photo price converter, a BTS/MRT route finder, a street food passport, a day planner, and a Thai menu decoder. Built as a static site + Netlify Functions so it can be installed on your phone and used on the street with one bar of signal.

## Setup (~30 min total)

1. **Install the Netlify CLI** (~3 min)
   ```
   npm i -g netlify-cli
   ```
2. **Log in and link the project** (~5 min)
   ```
   netlify login
   netlify init
   ```
   Choose "Create & configure a new site" (or link an existing one). Accept the detected build settings — `netlify.toml` already points at `public/` and `netlify/functions/`.
3. **Set your Anthropic API key** (~2 min)
   ```
   netlify env:set ANTHROPIC_API_KEY sk-ant-...
   ```
   The key is only ever read inside `netlify/functions/claude.js` — it never reaches the browser.
4. **Run it locally** (~5 min)
   ```
   netlify dev
   ```
   Open http://localhost:8888. The first launch asks for your trip dates and hotel/area — you can change these later from the ⚙️ gear in the header.
5. **Deploy** (~5 min)
   ```
   netlify deploy --prod
   ```
6. **Install it on your phone** (~2 min)
   Open the deployed URL in Chrome (Android) or Safari (iOS) and choose "Add to Home Screen." It'll launch full-screen like a native app.

## Cost

Each vision or web-search call to Claude costs a fraction of a cent to a few cents. Even heavy use across a whole trip (menus, receipts, routes, a plan every day) should land in the dollars, not tens of dollars.

## Where your data lives

Everything is stored in your phone's `localStorage` — trip dates, checklists, food passport progress and photos, route/plan history, cached exchange rates. Nothing is synced to a server. Clearing your browser's site data (or uninstalling the PWA) wipes it for good, so export your food diary (Food tab → "Export diary") before you do that if you want to keep it.

## What works offline

Once you've loaded the app online at least once:
- Dashboard checklists and to-dos
- The manual ฿ → $/€ quick-convert (uses the last cached rate)
- Street Food Passport (browsing, marking dishes eaten, ratings/notes/photos)
- Route Buddy falls back to a seeded "nearest station" guess for a handful of common destinations, clearly marked "offline — verify"

Photo-based tools (price photos, menu photos) and the Day Planner require a live connection to reach Claude.
