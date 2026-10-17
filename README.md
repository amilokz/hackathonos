# HackathonOS

The free operating system for hackathons — run events end to end: registrations,
team management, project submissions, AI-assisted judging, live leaderboards,
verifiable certificates, and sponsor visibility.

Built by [AKCLNT](https://akclnt.com).

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **SQLite** via `better-sqlite3` (zero-config, file at `./data/hackathonos.db`)
- `bcryptjs` password hashing, HMAC-signed cookie sessions (`src/lib/auth.ts`)
- `zod` for input validation, `uuid` for ids, `qrcode` for certificate QR codes

## How to run

```bash
npm install
cp .env.example .env.local   # then set SESSION_SECRET
npm run dev                  # http://localhost:3000
```

The SQLite database and all tables are created automatically on first boot
(`migrate()` in `src/lib/db.ts`). Check `/api/health` for `{ ok: true }`.

## Env vars

| Var | Required | Purpose |
| --- | -------- | ------- |
| `SESSION_SECRET` | yes | Signs organizer session cookies — set a long random string |
| `GROQ_API_KEY` | later | Powers AI-assisted judging (Phase 3) |

## Project phases roadmap

1. **Events + Registrations** — organizer auth, create/edit events, public event pages, team registration
2. **Submissions** — teams submit projects (title, description, demo/repo links, pitch)
3. **Judging + AI** — judging criteria with weights, judge scoring panel, AI pre-scores via Groq, leaderboard
4. **Certificates** — one-click generation, QR-code verification page, bulk issue per event
5. **Monetization** — entry fees, sponsor tiers/slots, white-label per-event branding
6. **Handover** — docs, deployment guide (own server + domain), data export, client training

## Project layout

```
src/
  app/
    page.tsx            # landing page
    api/health/route.ts # health check (also runs DB migrations)
  lib/
    db.ts               # better-sqlite3 connection + migrate()
    auth.ts             # password hashing + signed cookie sessions
data/                   # sqlite db lives here (git-ignored)
```
