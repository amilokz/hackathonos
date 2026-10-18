import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Container, BrandFooter } from '@/components/ui';
import PublicNav from '@/components/PublicNav';
import { getDb, migrate } from '@/lib/db';
import HeroVisual from '@/components/about/HeroVisual';
import StatsBand, { type PlatformStats } from '@/components/about/StatsBand';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'About | HackathonOS',
  description:
    'HackathonOS is the all-in-one platform to run hackathons — registrations, project submissions, AI-assisted judging, live leaderboards and verifiable certificates. Built by AKCLNT, free for organizers, made for TechKhwa.',
};

/** Real platform counts from the database. Never invent numbers. */
async function getStats(): Promise<PlatformStats> {
  try {
    await migrate();
    const db = getDb();
    const [e, t, p] = await Promise.all([
      db.prepare('SELECT COUNT(*) AS c FROM events').get(),
      db.prepare('SELECT COUNT(*) AS c FROM teams').get(),
      db.prepare('SELECT COUNT(*) AS c FROM projects').get(),
    ]);
    return {
      events: Number(e?.c ?? 0),
      teams: Number(t?.c ?? 0),
      projects: Number(p?.c ?? 0),
    };
  } catch {
    return null;
  }
}

const VALUES = [
  {
    label: 'Better opportunities for builders',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
      </svg>
    ),
  },
  {
    label: 'Stronger tech communities',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
        <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" />
        <path d="M18.6 14.3c2 .9 3.4 2.7 3.4 5.2" />
      </svg>
    ),
  },
  {
    label: 'More innovation and real impact',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
        <path d="M9 18h6" />
        <path d="M10 22h4" />
      </svg>
    ),
  },
  {
    label: 'A fair and transparent process',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    ),
  },
];

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export default async function AboutPage() {
  const stats = await getStats();

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <PublicNav />

      {/* ——— Hero ——— */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-violet-50/70 to-white">
        <div aria-hidden="true" className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-indigo-200/50 blur-3xl" />
        <div aria-hidden="true" className="absolute right-0 top-24 h-80 w-80 rounded-full bg-violet-200/60 blur-3xl" />
        <div aria-hidden="true" className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-indigo-100/60 blur-3xl" />
        {/* subtle rings */}
        <div aria-hidden="true" className="absolute -right-16 top-10 h-72 w-72 rounded-full border-[24px] border-violet-200/30" />
        <div aria-hidden="true" className="absolute -left-20 bottom-6 h-56 w-56 rounded-full border-[20px] border-indigo-200/30" />

        <Container className="relative py-14 sm:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100/80 px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-700">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" aria-hidden="true" />
                About HackathonOS
              </p>
              <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                Powering the next generation of builders
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-600">
                HackathonOS is the all-in-one platform to run hackathons — from
                registrations and project submissions to AI-assisted judging, live
                leaderboards and verifiable certificates.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-indigo-200 bg-white/80 px-3 py-1.5 text-xs font-bold text-slate-700">
                  Built by <a href="https://akclnt.com" className="text-indigo-700 hover:underline">AKCLNT</a>
                </span>
                <span className="rounded-full border border-indigo-200 bg-white/80 px-3 py-1.5 text-xs font-bold text-slate-700">
                  Free for organizers
                </span>
                <span className="rounded-full border border-indigo-200 bg-white/80 px-3 py-1.5 text-xs font-bold text-slate-700">
                  Made for TechKhwa
                </span>
              </div>
            </div>
            <HeroVisual />
          </div>
        </Container>
      </section>

      <Container>
        {/* ——— Our story ——— */}
        <section aria-label="Our story" className="mt-16 sm:mt-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-indigo-200/60 to-violet-200/40 blur-2xl"
              />
              <div className="relative overflow-hidden rounded-3xl shadow-xl shadow-indigo-600/10">
                <Image
                  src="/images/kashif-ali.jpg"
                  alt="Kashif Ali, Founder and CEO of TechKhwa"
                  width={400}
                  height={400}
                  className="aspect-square w-full object-cover"
                  priority
                />
                <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-2xl bg-slate-900/85 px-4 py-3 shadow-lg backdrop-blur">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-sm font-extrabold text-white">
                    KA
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-white">Kashif Ali</span>
                    <span className="block text-xs text-slate-300">Founder &amp; CEO of TechKhwa</span>
                  </span>
                </div>
              </div>
            </div>
            <div>
              <p className="inline-flex rounded-full bg-indigo-100/80 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-700">
                Our story
              </p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Built for TechKhwa, by people who run hackathons
              </h2>
              <p className="mt-5 leading-relaxed text-slate-600">
                HackathonOS was built by{' '}
                <a href="https://akclnt.com" className="font-semibold text-indigo-600 hover:underline">
                  AKCLNT
                </a>
                , the software studio of Komil Hassan, as a gift for TechKhwa — the tech
                community founded by Kashif Ali. TechKhwa brings new builders into tech
                through real events; this platform exists so running one doesn&rsquo;t mean
                stitching together spreadsheets, forms, and chat groups.
              </p>
              <p className="mt-4 leading-relaxed text-slate-600">
                It&rsquo;s available to any organizer — and it&rsquo;s{' '}
                <span className="font-semibold text-slate-800">free for organizers</span>.
                Registrations, teams, judging, check-ins, and certificates, all under one
                roof, so organizers can spend their energy on the experience instead of
                the tooling.
              </p>
            </div>
          </div>
        </section>

        {/* ——— Values ——— */}
        <section aria-label="What we stand for" className="mt-16 sm:mt-24">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v) => (
              <div
                key={v.label}
                className="group rounded-2xl border border-slate-200 bg-white p-6 text-center transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-600/10"
              >
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                  {v.icon}
                </span>
                <p className="mt-4 text-sm font-bold leading-snug text-slate-800">{v.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ——— Mission & Vision ——— */}
        <section aria-label="Mission and vision" className="mt-16 sm:mt-24">
          <p className="inline-flex rounded-full bg-indigo-100/80 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-700">
            Our mission &amp; vision
          </p>
          <h2 className="mt-4 max-w-xl text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            A bigger vision for a stronger tech future
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-7 transition hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-600/10 sm:p-8">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="5" />
                  <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
                </svg>
              </span>
              <h3 className="mt-4 text-lg font-extrabold text-slate-900">Our Mission</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                To make hackathons simple, accessible, and impactful — empowering
                individuals, communities, and organizations to build real solutions for a
                better tomorrow.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-7 transition hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-600/10 sm:p-8">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </span>
              <h3 className="mt-4 text-lg font-extrabold text-slate-900">Our Vision</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                To become the leading hackathon platform in Pakistan and beyond —
                connecting talent, innovation, and opportunity, and helping shape the
                future of technology.
              </p>
            </div>
          </div>
        </section>

        {/* ——— Stats band (real DB counts only) ——— */}
        <StatsBand stats={stats} />

        {/* ——— CTA banner ——— */}
        <section aria-label="Get started" className="mt-16 sm:mt-20">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-950 px-8 py-12 text-center sm:px-12 sm:py-16">
            <div aria-hidden="true" className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/25 blur-3xl" />
            <div aria-hidden="true" className="absolute -bottom-20 -right-12 h-72 w-72 rounded-full bg-violet-500/25 blur-3xl" />
            <div aria-hidden="true" className="absolute left-1/2 top-0 h-40 w-[36rem] -translate-x-1/2 rounded-full bg-indigo-400/15 blur-3xl" />
            <div className="relative">
              <p className="inline-flex rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-200">
                Join the movement
              </p>
              <h2 className="mx-auto mt-4 max-w-xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Ready to run your next hackathon?
              </h2>
              <p className="mx-auto mt-3 max-w-md text-indigo-200">
                It&rsquo;s free, fast, and built for builders.
              </p>
              <div className="mt-8">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-950/40 transition hover:-translate-y-0.5 hover:bg-indigo-500"
                >
                  Get started free
                  <ArrowIcon />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </Container>

      <BrandFooter />
    </main>
  );
}
