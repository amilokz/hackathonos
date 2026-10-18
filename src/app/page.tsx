import type { Metadata } from "next";
import { getDb, migrate } from "@/lib/db";
import { BrandFooter } from "@/components/ui";

export const metadata: Metadata = {
  title: "HackathonOS — Run Hackathons End to End",
  description:
    "The free operating system for hackathons: registrations, team management, project submissions, AI-assisted judging, live leaderboards, and verifiable certificates.",
};

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

async function getPastEvents() {
  await migrate();
  const db = getDb();
  return (await db
    .prepare(
      `SELECT e.*, (SELECT COUNT(*) FROM teams t WHERE t.event_id = e.id AND t.approval_status = 'approved') AS team_count
       FROM events e WHERE e.status = 'closed'
       ORDER BY e.end_date DESC, e.created_at DESC LIMIT 3`
    )
    .all()) as Array<{
    id: string;
    name: string;
    slug: string;
    cover_url: string;
    start_date: string;
    end_date: string;
    team_count: number;
  }>;
}

async function getLiveEvents() {
  await migrate();
  const db = getDb();
  return (await db
    .prepare(
      `SELECT e.id, e.name, e.slug, e.cover_url, e.description, e.start_date, e.end_date,
              (SELECT COUNT(*) FROM teams t WHERE t.event_id = e.id AND t.approval_status = 'approved') AS team_count
       FROM events e WHERE e.status = 'published'
       ORDER BY e.start_date ASC, e.created_at DESC`
    )
    .all()) as Array<{
    id: string;
    name: string;
    slug: string;
    cover_url: string;
    description: string;
    start_date: string;
    end_date: string;
    team_count: number;
  }>;
}

async function getStats() {
  await migrate();
  const db = getDb();
  const events = (
    (await db
      .prepare(`SELECT COUNT(*) AS c FROM events WHERE status IN ('published','closed')`)
      .get()) as { c: number }
  ).c;
  const teams = ((await db.prepare(`SELECT COUNT(*) AS c FROM teams`).get()) as { c: number }).c;
  const projects = ((await db.prepare(`SELECT COUNT(*) AS c FROM projects`).get()) as { c: number }).c;
  const certificates = (
    (await db.prepare(`SELECT COUNT(*) AS c FROM certificates`).get()) as { c: number }
  ).c;
  return { events, teams, projects, certificates };
}

const FEATURES = [
  {
    title: "Events & Registrations",
    desc: "Create a hackathon in minutes. Custom event pages, team registrations, and participant management — no spreadsheets.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    ),
  },
  {
    title: "Project Submissions",
    desc: "Teams submit builds with demo links, repos, and pitch notes. Everything lands in one organized judging queue.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    ),
  },
  {
    title: "AI-Assisted Judging",
    desc: "Every project gets an AI pre-score across your criteria — innovation, execution, impact — so judges spend minutes, not hours.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    ),
  },
  {
    title: "Live Leaderboard",
    desc: "Real-time rankings on the big screen. Keep the audience engaged while judges deliberate.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    ),
  },
  {
    title: "Verifiable Certificates",
    desc: "One-click certificates for every participant and winner, with QR-code verification that lives in portfolios forever.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
      />
    ),
  },
  {
    title: "Sponsor Visibility",
    desc: "Give sponsors measurable branding on leaderboards, certificates, and event pages — the reason sponsors keep coming back.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
      />
    ),
  },
];

const STEPS = [
  {
    n: "1",
    title: "Create your event",
    desc: "Name it, set dates, share the public link. Teams register themselves — no manual entry.",
  },
  {
    n: "2",
    title: "Collect & judge",
    desc: "Projects flow into one queue. Judges score against your criteria; AI pre-scores every submission.",
  },
  {
    n: "3",
    title: "Celebrate & certify",
    desc: "Go live with the leaderboard, then issue QR-verified certificates to everyone in one click.",
  },
];

function MockDashboard() {
  const rows = [
    { medal: "🥇", name: "NeuroPark", team: "Team Binary", score: 94, w: "94%" },
    { medal: "🥈", name: "MediQueue", team: "CodeCraft", score: 89, w: "89%" },
    { medal: "🥉", name: "AgriSense", team: "PixelPioneers", score: 86, w: "86%" },
    { medal: "#4", name: "EduAR", team: "LogicLords", score: 81, w: "81%" },
  ];
  return (
    <div className="relative">
      {/* floating badges */}
      <div className="absolute -left-4 top-8 z-10 hidden rotate-[-6deg] rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl sm:block">
        <p className="text-xs font-semibold text-slate-500">AI PRE-SCORE</p>
        <p className="text-2xl font-extrabold text-indigo-600">94<span className="text-sm text-slate-400">/100</span></p>
      </div>
      <div className="absolute -right-3 bottom-10 z-10 hidden rotate-[5deg] rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl sm:block">
        <p className="text-xs font-semibold text-slate-500">CERTIFICATES</p>
        <p className="text-2xl font-extrabold text-emerald-600">✓ 240</p>
        <p className="text-[11px] text-slate-400">QR-verified</p>
      </div>

      {/* main mock card */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
          <span className="h-3 w-3 rounded-full bg-rose-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
          <span className="ml-3 rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
            hackathonos / live-leaderboard
          </span>
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> LIVE
          </span>
        </div>
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">KP Tech Hackathon 2026</p>
              <h3 className="mt-1 text-xl font-extrabold text-slate-900">Live Leaderboard</h3>
            </div>
            <p className="text-xs text-slate-400">refreshes every 30s</p>
          </div>
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.name} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5">
                <span className="w-10 text-center text-xl font-bold text-slate-700">{r.medal}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold text-slate-900">{r.name}</p>
                    <p className="text-lg font-extrabold text-indigo-600">{r.score}</p>
                  </div>
                  <p className="text-xs text-slate-500">{r.team}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: r.w }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PastHackathons({ events }: { events: Awaited<ReturnType<typeof getPastEvents>> }) {
  return (
    <section id="past" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
      <p className="text-center text-sm font-bold uppercase tracking-widest text-indigo-600">Hall of fame</p>
      <h2 className="mx-auto mt-3 max-w-2xl text-center text-3xl font-extrabold tracking-tight sm:text-4xl text-balance">
        Hackathons powered by HackathonOS
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-center text-slate-600">
        Real events, real teams, real winners. Yours could be next.
      </p>

      {events.length === 0 ? (
        <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 p-10 text-center">
          <p className="text-4xl">🏁</p>
          <p className="mt-3 font-bold text-slate-800">The first story hasn&apos;t been written yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Past hackathons will be showcased here once events wrap up. Run yours and claim this spot.
          </p>
          <a
            href="/register"
            className="mt-5 inline-block rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Run your hackathon
          </a>
        </div>
      ) : (
        <>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => {
              const dates = [formatDate(e.start_date), formatDate(e.end_date)].filter(Boolean).join(" → ");
              return (
                <a
                  key={e.id}
                  href="/past"
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  {e.cover_url?.trim() ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.cover_url} alt={`${e.name} cover`} className="h-40 w-full object-cover" />
                  ) : (
                    <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-indigo-100 via-violet-100 to-sky-100">
                      <span className="text-4xl">🏆</span>
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="font-bold text-slate-900 transition group-hover:text-indigo-700">{e.name}</h3>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {dates && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">📅 {dates}</span>
                      )}
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                        👥 {e.team_count} teams
                      </span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
          <div className="mt-8 text-center">
            <a href="/past" className="text-sm font-semibold text-indigo-600 transition hover:text-indigo-800">
              View all past hackathons →
            </a>
          </div>
        </>
      )}
    </section>
  );
}

const EVENT_PHOTOS = [
  { src: "/images/event-1.jpg", alt: "Speaker presenting at a TechKhwa community tech meetup" },
  { src: "/images/event-2.jpg", alt: "Attendees at a TechKhwa community tech meetup" },
  { src: "/images/event-3.jpg", alt: "Participants at a TechKhwa community tech meetup" },
  { src: "/images/event-4.jpg", alt: "Team photo at a TechKhwa community tech meetup" },
  { src: "/images/event-5.jpg", alt: "Kashif Ali presenting on stage at a tech meetup" },
  { src: "/images/event-6.jpg", alt: "Speaker on stage at NIC Peshawar tech meetup" },
];

function EventGallery() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
      <p className="text-center text-sm font-bold uppercase tracking-widest text-indigo-600">In the field</p>
      <h2 className="mx-auto mt-3 max-w-2xl text-center text-3xl font-extrabold tracking-tight sm:text-4xl text-balance">
        Real events. Real energy.
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-center text-slate-600">
        Moments from TechKhwa community meetups — the same stages and crowds your hackathon will fill.
      </p>
      <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {EVENT_PHOTOS.map((p, i) => (
          <div
            key={p.src}
            className={`group relative overflow-hidden rounded-2xl border border-slate-200 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
              i === 0 ? "col-span-2 lg:col-span-1" : ""
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.src}
              alt={p.alt}
              loading="lazy"
              className="h-56 w-full object-cover transition duration-500 group-hover:scale-105 sm:h-64"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/30 to-transparent opacity-0 transition group-hover:opacity-100" />
          </div>
        ))}
      </div>
    </section>
  );
}

function OrganizerSpotlight() {
  return (
    <section className="border-y border-slate-200/70 bg-slate-50/70">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[auto_1fr] lg:gap-14">
        <div className="relative mx-auto">
          <div aria-hidden className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-indigo-200 via-violet-200 to-sky-200 blur-xl" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/kashif-ali.jpg"
            alt="Kashif Ali, Founder & CEO of TechKhwa"
            className="relative h-52 w-52 rounded-[1.75rem] border-4 border-white object-cover shadow-2xl sm:h-64 sm:w-64"
          />
          <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg">
            🏆 Pride of KP Award
          </span>
        </div>
        <div className="text-center lg:text-left">
          <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">Built for organizers</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl text-balance">
            Made for TechKhwa — by people who run hackathons
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
            HackathonOS was crafted for <strong className="text-slate-900">Kashif Ali</strong>, Founder &amp; CEO of{" "}
            <strong className="text-slate-900">TechKhwa</strong> — judge at national hackathons including AI Seekho
            Builders Day at NIC Islamabad, and speaker at youth summits across Pakistan. Every feature exists because
            real organizers asked for it.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">🎤 Hackathon judge</span>
            <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">🌍 Youth summit speaker</span>
            <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">💡 Tech community builder</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function LiveNow({ events }: { events: Awaited<ReturnType<typeof getLiveEvents>> }) {
  if (events.length === 0) return null;
  return (
    <section className="border-b border-slate-200/70 bg-gradient-to-b from-indigo-50/60 to-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <p className="flex items-center justify-center gap-2 text-center text-sm font-bold uppercase tracking-widest text-emerald-600">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
          Live now
        </p>
        <h2 className="mx-auto mt-3 max-w-2xl text-center text-3xl font-extrabold tracking-tight sm:text-4xl text-balance">
          Hackathons accepting teams right now
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-slate-600">
          Registrations are open. Pick your event, gather your team, and start building.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => {
            const dates = [formatDate(e.start_date), formatDate(e.end_date)].filter(Boolean).join(" → ");
            return (
              <div
                key={e.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                {e.cover_url?.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.cover_url} alt={`${e.name} cover`} className="h-44 w-full object-cover" />
                ) : (
                  <div className="flex h-44 w-full items-center justify-center bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600">
                    <span className="text-4xl">⚡</span>
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-lg font-bold text-slate-900">{e.name}</h3>
                  {e.description && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">{e.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {dates && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">📅 {dates}</span>
                    )}
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                      👥 {e.team_count} {e.team_count === 1 ? "team" : "teams"} in
                    </span>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2 pt-1">
                    <a
                      href={`/e/${e.slug}/register`}
                      className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                      Register now →
                    </a>
                    <a
                      href={`/e/${e.slug}`}
                      className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
                    >
                      View event
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StatsBand({ stats }: { stats: Awaited<ReturnType<typeof getStats>> }) {
  const items = [
    { value: stats.events, label: "Hackathons run" },
    { value: stats.teams, label: "Teams registered" },
    { value: stats.projects, label: "Projects submitted" },
    { value: stats.certificates, label: "Certificates issued" },
  ];
  if (items.every((i) => i.value === 0)) return null;
  return (
    <section className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-4 py-14 sm:px-6 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i.label} className="text-center">
            <p className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              {i.value.toLocaleString()}
            </p>
            <p className="mt-2 text-sm font-medium uppercase tracking-widest text-indigo-200">{i.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const FAQS = [
  {
    q: "Is HackathonOS really free?",
    a: "Yes — creating events, team registrations, project submissions, judging, leaderboards and certificates are all free for organizers. There are no credit-card walls and no team limits.",
  },
  {
    q: "Do I need to install anything?",
    a: "No. HackathonOS runs entirely in the browser — for you as the organizer, for judges scoring projects, and for teams registering and submitting. Share a link and you're live.",
  },
  {
    q: "How does AI judging work?",
    a: "Every submitted project can get an AI pre-score across your own judging criteria (innovation, execution, impact…). Add a free Groq API key in your settings to enable it. Judges always have the final say — the AI score is a starting point, not a verdict.",
  },
  {
    q: "Who owns my event data?",
    a: "You do. Your teams, projects, scores and certificates belong to your organization. Nothing is sold, shared, or used to train models.",
  },
  {
    q: "Can sponsors be featured?",
    a: "Yes. Add sponsors in tiers (platinum, gold, silver, bronze) with their logos, and they appear on your event page, the live leaderboard and even on certificates — real, measurable visibility.",
  },
  {
    q: "How do certificates verify?",
    a: "Every certificate carries a unique QR code that links to a public verification page. Anyone — employers, universities — can scan it and confirm the certificate is genuine, forever.",
  },
];

function FaqSection() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6">
      <p className="text-center text-sm font-bold uppercase tracking-widest text-indigo-600">FAQ</p>
      <h2 className="mx-auto mt-3 max-w-2xl text-center text-3xl font-extrabold tracking-tight sm:text-4xl text-balance">
        Questions, answered honestly
      </h2>
      <div className="mt-10 space-y-3">
        {FAQS.map((f) => (
          <details
            key={f.q}
            className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition open:border-indigo-200 open:shadow-md"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
              {f.q}
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-lg font-bold text-indigo-600 transition group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export default async function Home() {
  const pastEvents = await getPastEvents();
  const liveEvents = await getLiveEvents();
  const stats = await getStats();
  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="text-xl font-extrabold tracking-tight">
            Hackathon<span className="text-indigo-600">OS</span>
          </a>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="transition hover:text-indigo-600">Features</a>
            <a href="#how" className="transition hover:text-indigo-600">How it works</a>
            <a href="/past" className="transition hover:text-indigo-600">Past hackathons</a>
            <a href="#cta" className="transition hover:text-indigo-600">Get started</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="/login" className="text-sm font-semibold text-slate-600 transition hover:text-indigo-600">
              Sign in
            </a>
            <a
              href="/register"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Get started free
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* gradient mesh background */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-200/60 via-violet-200/40 to-transparent blur-3xl" />
          <div className="absolute -right-40 top-40 h-[380px] w-[380px] rounded-full bg-gradient-to-br from-violet-200/50 to-transparent blur-3xl" />
          <div className="absolute -left-40 top-64 h-[380px] w-[380px] rounded-full bg-gradient-to-br from-sky-200/50 to-transparent blur-3xl" />
          {/* dotted grid */}
          <svg className="absolute inset-0 h-full w-full opacity-[0.35]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1.5" fill="#c7d2fe" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" mask="url(#fade)" />
            <defs>
              <radialGradient id="fade" cx="50%" cy="30%" r="65%">
                <stop offset="0%" stopColor="white" stopOpacity="1" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>
        </div>

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:pt-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-semibold text-indigo-700">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              Free for organizers · No credit card
            </p>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Run hackathons{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                end&nbsp;to&nbsp;end
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-600">
              Registrations, submissions, AI-assisted judging, live leaderboards,
              and verifiable certificates. Everything a hackathon needs — in one
              free platform.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="/register"
                className="rounded-xl bg-indigo-600 px-7 py-3.5 font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700"
              >
                Create your hackathon
              </a>
              <a
                href="#features"
                className="rounded-xl border border-slate-300 bg-white px-7 py-3.5 font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
              >
                See how it works
              </a>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><span className="text-emerald-500">✓</span> Team registrations</span>
              <span className="flex items-center gap-1.5"><span className="text-emerald-500">✓</span> AI judging</span>
              <span className="flex items-center gap-1.5"><span className="text-emerald-500">✓</span> Certificates</span>
            </div>
          </div>
          <MockDashboard />
        </div>
      </section>

      {/* Live now — published events accepting registrations */}
      {/* DEBUG-MARKER: liveEvents={liveEvents.length} names={liveEvents.map((e) => e.slug).join(',')} */}
      <LiveNow events={liveEvents} />

      {/* Event photo gallery */}
      <EventGallery />

      {/* Features */}
      <section id="features" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <p className="text-center text-sm font-bold uppercase tracking-widest text-indigo-600">Features</p>
        <h2 className="mx-auto mt-3 max-w-2xl text-center text-3xl font-extrabold tracking-tight sm:text-4xl text-balance">
          Everything after the idea
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-slate-600">
          Stop juggling spreadsheets, forms, and group chats. HackathonOS handles the operations so you can focus on the builders.
        </p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">{f.icon}</svg>
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-slate-200/70 bg-slate-50/70">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <p className="text-center text-sm font-bold uppercase tracking-widest text-indigo-600">How it works</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-center text-3xl font-extrabold tracking-tight sm:text-4xl text-balance">
            From idea to awards in three steps
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-lg font-extrabold text-white">
                  {s.n}
                </span>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats band */}
      <StatsBand stats={stats} />

      {/* Organizer spotlight */}
      <OrganizerSpotlight />

      {/* Past hackathons preview */}
      <PastHackathons events={pastEvents} />

      {/* FAQ */}
      <FaqSection />

      {/* CTA */}
      <section id="cta" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 px-6 py-16 text-center shadow-2xl sm:px-12">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          </div>
          <h2 className="relative mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl text-balance">
            Organizing a hackathon? Launch it today.
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-indigo-100">
            Free for organizers. Set up your event in minutes, invite teams, and let HackathonOS handle the rest.
          </p>
          <div className="relative mt-8">
            <a
              href="/register"
              className="inline-block rounded-xl bg-white px-8 py-3.5 font-bold text-indigo-700 shadow-lg transition hover:bg-indigo-50"
            >
              Get started free
            </a>
          </div>
        </div>
      </section>

      <BrandFooter />
    </main>
  );
}
