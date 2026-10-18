# HackathonOS — Handover Guide

> **Status (2026-10-18):** All three phases complete, production audit done, build
> green, everything committed locally. Live site: **https://hackathonos-znwk.vercel.app**
> (Vercel project `hackathonos-znwk`). Push the committed code to
> `amilokz/hackathonos` (remote `origin` is already configured) and verify the
> live site picks it up. **Env-var checklist for the Vercel project** (Production
> + Preview, then redeploy): `SESSION_SECRET` ✅ must be set (login was broken
> without it on 2026-10-18); `GROQ_API_KEY` ✅ added by Komil on 2026-10-18
> (needs a redeploy to take effect); `RESEND_API_KEY` ⏳ still needs to be added —
> until then email notifications log as "skipped".

HackathonOS is a complete hackathon/event management platform, built for TechKhwa.
What it covers:

- **Events** — create, brand, publish/unpublish; public event pages with prizes,
  schedule, FAQ, sponsors, highlight video; `/past` for closed events with
  winners spotlight.
- **Participants** — public team registration (optional organizer approval),
  Team Finder (solo participants match into teams), Participant Portal
  (`/p/signup`) with its own dashboard.
- **Judging** — Judge Portal (judge login, per-criteria scoring rubric,
  auto-totals), AI pre-score + AI Feedback Assistant (Groq, free tier; judges
  decide — recommendations only).
- **Event day** — Live Command Center (`/e/[slug]/live`: countdown, teams,
  submissions, announcements, judging progress, animated winners podium,
  sponsors) for the stage projector; QR Check-in with digital team passes.
- **Mentors** — add mentors, set slots, teams book sessions (double-booking blocked).
- **Emails** — registration confirmations, deadline reminders, winner
  announcements, broadcast emails (Resend).
- **Organizer tools** — Organizer Command Center (registration analytics, pending
  approvals, CSV export, quick actions), Announcements Center, About/Contact
  pages with organizer inbox, newsletter signup.
- **Certificates** — QR-verified, printable, bulk generation.

Organizer signup is **invite-only**: the first (Komil's) account is the bootstrap
account; new organizers join via invite codes generated in the dashboard's
"Organizer invite codes" section.

Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, **libsql**
(`@libsql/client`; SQLite-compatible, file DB locally / Turso in production),
Groq AI (free tier) for judging, and Resend for email.

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # http://localhost:3000
```

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `SESSION_SECRET` | Yes | HMAC secret signing organizer/judge/participant session cookies. Use a long random string. **Must be set on the `hackathonos-znwk` Vercel project** (Production + Preview) — login/registration breaks without it. |
| `GROQ_API_KEY` | For AI judging | Free key from console.groq.com — powers the AI pre-score (`/api/ai/score`) and AI Feedback Assistant (`/api/ai/feedback`). Without it, manual judge scoring still works fully. Redeploy after adding. |
| `RESEND_API_KEY` | For email notifications | Powers registration confirmations, deadline reminders, winner announcements and broadcast emails (`/api/events/[id]/emails/*`). Sends from `HackathonOS <noreply@akclnt.com>` (akclnt.com already sends via Resend for outreach). **Without it, emails are logged as "skipped"** (visible in the email log) — nothing crashes. |
| `DATABASE_URL` | Production | Turso DB URL (`libsql://…`). Without it, Vercel runs on an ephemeral `/tmp` file — data is lost on redeploy. See "Production database" below. |
| `TURSO_AUTH_TOKEN` | With DATABASE_URL | Auth token for the Turso database. |
| `NEXT_PUBLIC_BASE_URL` | Production | e.g. `https://hackathon.yourdomain.com`. Used for QR codes on certificates and verification links. Falls back to the request host when unset. |

## Production database

The app uses `@libsql/client`, which speaks the SQLite dialect everywhere:

- **Local dev:** `./data/hackathonos.db` (file, created automatically; `migrate()` creates all tables).
- **Vercel without `DATABASE_URL`:** `/tmp/hackathonos.db` — works, but **ephemeral** (each deploy/instance starts empty). Fine for a demo, not for real events.
- **Vercel with Turso (recommended, free tier):**
  1. Create a free database at turso.tech (or `turso db create hackathonos`).
  2. Get the URL (`turso db show hackathonos --url`) and a token (`turso db tokens create hackathonos`).
  3. Set `DATABASE_URL` and `TURSO_AUTH_TOKEN` on the Vercel project (production + preview).
  4. Redeploy. Tables are created automatically on first request.

## Deploy to Vercel

1. The code lives in `~/workspace/hackathonos` (branch `master`, committed).
   The GitHub repo `amilokz/hackathonos` exists with remote `origin` configured —
   push and Vercel auto-deploys (the `hackathonos-znwk` project is connected to it).
2. After pushing, open the `hackathonos-znwk` project → Settings → Environment
   Variables and confirm: `SESSION_SECRET` ✅ set; `GROQ_API_KEY` ✅ set (Komil
   added 2026-10-18 — redeploy needed); `RESEND_API_KEY` ⏳ add when ready;
   `DATABASE_URL` + `TURSO_AUTH_TOKEN` recommended before any real event (see
   "Production database" above); `NEXT_PUBLIC_BASE_URL` once the domain is known.
3. Redeploy and verify: homepage loads and `/api/health` returns
   `{"ok":true,"db":true}`. Then sign in as organizer — if login fails, the
   first thing to check is `SESSION_SECRET` (it was missing once on this
   project and broke all logins).

> **Note:** `better-sqlite3` was replaced with `@libsql/client` during integration
> because native modules don't work on Vercel serverless. All queries were
> converted to async/await; table schemas are unchanged.

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
- `/login` — organizer sign-in. `/register` — organizer registration is
  **invite-only**; codes are generated in the dashboard's "Organizer invite
  codes" section (Komil's first account is the bootstrap account).
- `/dashboard` — event list
- `/dashboard/events/[id]` — event overview + **Organizer Command Center**
  (registration analytics, pending team approvals, CSV export, quick actions)
- `/dashboard/events/[id]/certificates` — generate certificates (bulk via textarea, `Name` or `Name,email` per line; types: participant/winner/judge/sponsor)
- `/dashboard/events/[id]/sponsors` — sponsor CRUD (tiers: platinum/gold/silver)
- `/dashboard/events/[id]/settings` — entry fee, payment instructions (Sadapay/bank), white-label toggle + custom footer

**Public:**
- `/e/[slug]` — public event page (prizes, schedule, FAQ, sponsors, highlight video)
- `/e/[slug]/register`, `/e/[slug]/submit`, `/e/[slug]/teams`, `/e/[slug]/join` — team registration, project submission, team list, join-by-code
- `/e/[slug]/leaderboard` — live public leaderboard (judge names hidden; draft events excluded)
- `/e/[slug]/live` — **Live Command Center**: projector screen with countdown, registered teams, submitted projects, announcements, judging progress, animated winners podium, sponsor logos
- `/e/[slug]/mentors` — mentor booking for teams; `/e/[slug]/pass` — digital team passes / QR check-in display
- `/e/[slug]/announcements` — public announcements feed
- `/past` — past hackathons with "has ended" banners + winners spotlight
- `/p/signup`, `/p/login` — **Participant Portal** (own dashboard UX)
- `/judge/login`, `/judge/score` — **Judge Portal** (scoring rubric, auto-totals; AI pre-score + AI Feedback recommendations — "human judges decide")
- `/cert/[code]` — printable certificate with QR code (links to `/verify/[code]`)
- `/verify/[code]` — certificate validity check (invalid codes → proper 404)
- `/about`, `/contact` — About page + contact form with organizer inbox

**APIs (organizer session cookie required unless noted):**
- `GET/POST /api/events/[id]/certificates`
- `GET/POST /api/events/[id]/sponsors`, `PATCH/DELETE /api/events/[id]/sponsors/[sponsorId]`
- `GET/PUT /api/events/[id]/settings`
- `GET /api/events/[id]` — event detail (organizer). **Note for the public event page:** this route currently returns `{ event }` only. Sponsors for the public page should be fetched from `GET /api/events/[id]/sponsors` (same shape: `{ sponsors: [{ id, name, logo_url, tier, website }] }`), or the public `/api/e/[slug]` route should embed `sponsors: [...]` in that same shape.

## For TechKhwa — what to configure

1. **Organizer access:** Kashif Ali (or his team) needs an organizer account — generate an invite code in the dashboard's "Organizer invite codes" section and share it with him (signup is invite-only, so no strangers can create organizer accounts).
2. **Branding:** event logo + description per event; footer default is "Powered by HackathonOS · Built by AKCLNT".
3. **Payments:** per event, set the entry fee and paste Sadapay/bank details into *Settings → Payment instructions* — payment instructions now show on the public register page. Team payments are verified manually.
4. **Sponsors:** add sponsor logos under *Sponsors* — they render on the public event page by tier, and sponsor website links are clickable.
5. **Mentors:** add mentors + slots in *Mentors* — teams book sessions themselves (double-booking blocked).
6. **Emails:** add `RESEND_API_KEY` on the Vercel project to enable registration confirmations, deadline reminders, winner announcements and broadcast emails — until then they're logged as "skipped".
7. **Certificates:** after the event, paste the participant list into *Certificates* and print. Every certificate carries a QR code anyone can scan to verify.
8. **White label:** licensing the platform to another organizer? Enable *white label* in event settings and set custom footer text — the AKCLNT line is replaced for that event.
9. **AI judging:** needs `GROQ_API_KEY` (free). Without it, manual judge scoring still works fully.

## Revenue streams this enables

- **Sponsor slots** — logo placement on the event page, live leaderboard and certificates.
- **Paid entries** — entry fees with manual payment verification.
- **White-label licensing** — run the platform for other organizers/universities with their branding.

## Integration test report (2026-10-17)

End-to-end tested against `npm run dev` with the libsql file DB. All passing:

- Organizer register → login (session cookie) → create event (5 default criteria auto-seeded) → publish
- Team registration (public) + duplicate-name 409 rejection
- Project submission (public) + resubmit updates existing
- Judge scores: batch submit, resubmit overwrites (upsert), invalid score 400, unknown project 400
- AI pre-score without `GROQ_API_KEY` → clean 400 "not configured" (correct behavior)
- Public leaderboard API + page (judge names hidden), public event page
- Certificates: bulk create → `/cert/[code]` (QR + print) → `/verify/[code]` shows "Certificate verified"
- Results API math verified (weighted 0–100 totals, ranks)
- Landing page, `/api/health` → `{"ok":true,"db":true}`
- Test data deleted after the run (FK cascades verified working)

## What's left

1. **Verify the live push** — latest commits (Phase 3: mentor booking, AI feedback,
   email notifications; production audit fixes) are committed locally on
   `master`; confirm they deployed to https://hackathonos-znwk.vercel.app and
   log in as organizer to confirm auth works.
2. **Turso database** — recommended before any real event (see "Production database"). On Vercel without it, data lives in an ephemeral `/tmp` file and is lost on redeploy.
3. **Resend API key** — add `RESEND_API_KEY` on the Vercel project so emails actually send (registration confirmations, deadline reminders, broadcasts).
4. **Demo for sir (TechKhwa)** — suggested flow: organizer dashboard → Organizer
   Command Center (analytics, approvals, CSV export) → create/publish event →
   public page `/e/[slug]` → team registration → project submission → Judge
   Portal scoring (with AI pre-score) → Live Command Center on projector
   (`/e/[slug]/live`) → QR check-in → certificates with QR verification.
5. **Handover to TechKhwa** — give them the repo + this guide; they set their own
   `SESSION_SECRET`, domain, `NEXT_PUBLIC_BASE_URL`, and their own
   `GROQ_API_KEY`/`RESEND_API_KEY`. His choice: their server or Komil's server,
   their domain when ready (Komil's plan, 2026-10-18).
