# HackathonOS — Handover Guide

HackathonOS is a complete hackathon/event management platform: events, team
registrations, project submissions, AI-assisted judging, live leaderboards,
QR-verified certificates, sponsors, and monetization settings. Built with
Next.js 14 (App Router), TypeScript, Tailwind CSS, SQLite (better-sqlite3),
and Groq AI (free tier) for judging.

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # http://localhost:3000
```

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `SESSION_SECRET` | Yes | HMAC secret signing organizer session cookies. Use a long random string. |
| `GROQ_API_KEY` | For AI judging | Free key from console.groq.com — powers the AI pre-score. |
| `NEXT_PUBLIC_BASE_URL` | Production | e.g. `https://hackathon.yourdomain.com`. Used for QR codes on certificates and verification links. Falls back to the request host when unset. |

## Build & production start

```bash
npm run build
npm start   # serves the production build on port 3000
```

## Database

- SQLite file: `data/hackathonos.db` (created automatically on first boot; `migrate()` in `src/lib/db.ts` creates all tables).
- Phase-C monetization columns (`payment_instructions`, `white_label`, `custom_footer_text` on `events`) are added idempotently by `ensureSettingsColumns()` in `src/lib/settings-columns.ts` — no manual migration needed.
- **Backup:** copy `data/hackathonos.db` (and `data/hackathonos.db-wal` if present). A nightly file copy is enough at this scale.

## Deploy on a VPS (Node 20)

```bash
# on the server
node -v   # need v20+
git clone <repo> && cd hackathonos
npm install
# create .env.local with SESSION_SECRET, GROQ_API_KEY, NEXT_PUBLIC_BASE_URL
npm run build
npm i -g pm2
pm2 start npm --name hackathonos -- start
pm2 save && pm2 startup   # restart on reboot
```

Put Nginx/Caddy in front as a reverse proxy to `localhost:3000` for HTTPS.

## Custom domain

1. Point the domain's A record at the VPS IP.
2. Configure the reverse proxy (Nginx/Caddy) for the domain with HTTPS (Caddy does this automatically).
3. Set `NEXT_PUBLIC_BASE_URL=https://yourdomain.com` in `.env.local` and restart (`pm2 restart hackathonos`) so certificate QR codes encode the public URL.

## Key routes

**Organizer (sign-in required):**
- `/login`, `/register` — organizer auth
- `/dashboard` — event list
- `/dashboard/events/[id]` — event overview
- `/dashboard/events/[id]/certificates` — generate certificates (bulk via textarea, `Name` or `Name,email` per line; types: participant/winner/judge/sponsor)
- `/dashboard/events/[id]/sponsors` — sponsor CRUD (tiers: platinum/gold/silver)
- `/dashboard/events/[id]/settings` — entry fee, payment instructions (Sadapay/bank), white-label toggle + custom footer

**Public:**
- `/e/[slug]` — public event page (built by events team)
- `/e/[slug]/register`, `/e/[slug]/submit` — team registration & project submission
- `/cert/[code]` — printable certificate with QR code (links to `/verify/[code]`)
- `/verify/[code]` — certificate validity check

**APIs (organizer session cookie required unless noted):**
- `GET/POST /api/events/[id]/certificates`
- `GET/POST /api/events/[id]/sponsors`, `PATCH/DELETE /api/events/[id]/sponsors/[sponsorId]`
- `GET/PUT /api/events/[id]/settings`
- `GET /api/events/[id]` — event detail (organizer). **Note for the public event page:** this route currently returns `{ event }` only. Sponsors for the public page should be fetched from `GET /api/events/[id]/sponsors` (same shape: `{ sponsors: [{ id, name, logo_url, tier, website }] }`), or the public `/api/e/[slug]` route should embed `sponsors: [...]` in that same shape.

## For TechKhwa — what to configure

1. **Branding:** event logo + description per event; footer default is "Powered by HackathonOS · Built by AKCLNT".
2. **Payments:** per event, set the entry fee and paste Sadapay/bank details into *Settings → Payment instructions*. Team payments are verified manually.
3. **Sponsors:** add sponsor logos under *Sponsors* — they render on the public event page by tier.
4. **Certificates:** after the event, paste the participant list into *Certificates* and print. Every certificate carries a QR code anyone can scan to verify.
5. **White label:** licensing the platform to another organizer? Enable *white label* in event settings and set custom footer text — the AKCLNT line is replaced for that event.
6. **AI judging:** needs `GROQ_API_KEY` (free). Without it, manual judge scoring still works fully.

## Revenue streams this enables

- **Sponsor slots** — logo placement on the event page, live leaderboard and certificates.
- **Paid entries** — entry fees with manual payment verification.
- **White-label licensing** — run the platform for other organizers/universities with their branding.
