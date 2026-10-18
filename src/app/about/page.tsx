import type { Metadata } from 'next';
import { Container, Card, PageHeader, Breadcrumb, LinkButton, BrandFooter } from '@/components/ui';
import PublicNav from '@/components/PublicNav';

export const metadata: Metadata = {
  title: 'About | HackathonOS',
  description:
    'HackathonOS is the complete hackathon management platform — registrations, teams, judging, AI assistance, QR check-in, live command center and certificates. Built by AKCLNT, free for organizers.',
};

const FEATURES = [
  {
    icon: '📝',
    title: 'Registrations',
    text: 'Branded event pages with registration forms, deadlines, and team-based sign-ups.',
  },
  {
    icon: '🤝',
    title: 'Team formation',
    text: 'A Team Finder where solo participants discover skills and join open teams.',
  },
  {
    icon: '🚀',
    title: 'Project submissions',
    text: 'Structured submissions with demos, repos, and review-ready presentation views.',
  },
  {
    icon: '⚖️',
    title: 'Judging',
    text: 'Criteria-based scoring with a judge portal and fair, auditable results.',
  },
  {
    icon: '🤖',
    title: 'AI assistance',
    text: 'AI-assisted scoring and feedback to help judges evaluate more consistently.',
  },
  {
    icon: '📱',
    title: 'QR check-in',
    text: 'QR codes for every team and participant — fast entry scanning on event day.',
  },
  {
    icon: '🖥️',
    title: 'Live command center',
    text: 'A real-time operations screen: countdowns, announcements, and live standings.',
  },
  {
    icon: '🎓',
    title: 'Certificates',
    text: 'QR-verified certificates participants can share and anyone can verify.',
  },
];

const AUDIENCE = [
  {
    icon: '🏫',
    title: 'Tech communities',
    text: 'Student and tech communities running recurring hackathons with volunteers.',
  },
  {
    icon: '🏢',
    title: 'Companies',
    text: 'Organizations running internal hackathons, hiring challenges, or innovation days.',
  },
  {
    icon: '👥',
    title: 'Independent organizers',
    text: 'Anyone with a hackathon idea who wants professional tooling without the build cost.',
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <PublicNav />
      <Container className="py-10 sm:py-14">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'About' }]} />

        {/* Intro */}
        <section className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">About</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Everything you need to run a hackathon, in one place
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            HackathonOS is a complete hackathon management platform. It takes you from
            announcing your event to handing out certificates — registrations, team
            formation, project submissions, judging, AI assistance, QR check-in, a live
            command center, and verified certificates, all under one roof.
          </p>
          <p className="mt-4 text-slate-600">
            It was built by{' '}
            <a href="https://akclnt.com" className="font-semibold text-indigo-600 hover:underline">
              AKCLNT
            </a>{' '}
            for TechKhwa, the tech community founded by{' '}
            <span className="font-semibold text-slate-800">Kashif Ali</span>, to run their
            hackathons without stitching together spreadsheets, forms, and chat groups.
            It&rsquo;s available to any organizer — and it&rsquo;s{' '}
            <span className="font-semibold text-slate-800">free for organizers</span>.
          </p>
        </section>

        {/* What it does */}
        <section className="mt-12" aria-label="Features">
          <PageHeader
            title="What HackathonOS does"
            subtitle="One platform covering the full lifecycle of a hackathon."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <Card key={f.title} className="p-5 transition hover:shadow-md">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-2xl"
                  aria-hidden="true"
                >
                  {f.icon}
                </span>
                <h3 className="mt-3 font-bold text-slate-900">{f.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{f.text}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Who it's for */}
        <section className="mt-12" aria-label="Who it's for">
          <PageHeader
            title="Who it's for"
            subtitle="If you organize hackathons, this was built for you."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {AUDIENCE.map((a) => (
              <Card key={a.title} className="p-6">
                <span className="text-3xl" aria-hidden="true">
                  {a.icon}
                </span>
                <h3 className="mt-3 font-bold text-slate-900">{a.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{a.text}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* How we think about it */}
        <section className="mt-12" aria-label="How we think about it">
          <Card className="overflow-hidden">
            <div className="grid md:grid-cols-2">
              <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-8 text-white sm:p-10">
                <p className="text-sm font-bold uppercase tracking-widest text-indigo-200">
                  Our approach
                </p>
                <h2 className="mt-2 text-2xl font-extrabold">
                  Run the event, not the spreadsheet
                </h2>
                <p className="mt-3 text-indigo-100">
                  Hackathons fail operationally before they fail creatively: lost
                  registrations, confused teams, judging arguments, certificates that never
                  arrive. HackathonOS exists so organizers spend their energy on the
                  experience — the tooling is the boring part, and boring is good.
                </p>
              </div>
              <div className="p-8 sm:p-10">
                <p className="text-sm font-bold uppercase tracking-widest text-slate-400">
                  Honest positioning
                </p>
                <ul className="mt-3 space-y-3 text-sm text-slate-600">
                  <li className="flex gap-2">
                    <span className="text-emerald-600" aria-hidden="true">✓</span>
                    Free for organizers — no paid tiers, no feature gates.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-600" aria-hidden="true">✓</span>
                    Built by a working software studio (AKCLNT), battle-tested on real events.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-600" aria-hidden="true">✓</span>
                    Your event data stays yours — white-label footers and exportable records.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-600" aria-hidden="true">✓</span>
                    Open to every organizer, from student communities to companies.
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </section>

        {/* Tech note */}
        <section className="mt-12" aria-label="Technology">
          <Card className="p-6 sm:p-8">
            <p className="text-sm font-bold uppercase tracking-widest text-slate-400">
              Under the hood
            </p>
            <p className="mt-3 text-sm text-slate-600">
              HackathonOS is built with Next.js, TypeScript, and Tailwind CSS, backed by a
              relational database (SQLite locally, Turso in production) with email
              delivery via Resend. It&rsquo;s fast, dependency-light, and designed to keep
              running even when the venue Wi-Fi doesn&rsquo;t.
            </p>
          </Card>
        </section>

        {/* CTA */}
        <section className="mt-12 text-center" aria-label="Get started">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Ready to run your hackathon?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            Create an account, publish your event page, and share the link — registrations
            are handled for you.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <LinkButton href="/register">Get started free</LinkButton>
            <LinkButton href="/contact" variant="secondary">
              Talk to us
            </LinkButton>
          </div>
        </section>
      </Container>
      <BrandFooter />
    </main>
  );
}
