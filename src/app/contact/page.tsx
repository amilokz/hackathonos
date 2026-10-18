import type { Metadata } from 'next';
import Link from 'next/link';
import { Container, BrandFooter } from '@/components/ui';
import PublicNav from '@/components/PublicNav';
import ContactForm from './ContactForm';

export const metadata: Metadata = {
  title: 'Contact | HackathonOS',
  description:
    'Get in touch with the HackathonOS team — questions, feedback, or help running your hackathon. Built by AKCLNT.',
};

const SOCIALS = [
  {
    label: 'X',
    href: 'https://x.com/OkzKomil',
    path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z',
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/komil-hassan',
    path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
  {
    label: 'GitHub',
    href: 'https://github.com/amilokz',
    path: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@akclntfuturelab',
    path: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  },
];

const FAQS = [
  {
    q: 'Is HackathonOS really free?',
    a: 'Yes. HackathonOS was built by AKCLNT as a gift for TechKhwa, and it is free for organizers — no paid tiers, no feature gates, no catch.',
  },
  {
    q: 'How does AI judging work?',
    a: 'AI-assisted scoring and feedback helps judges evaluate projects more consistently across criteria. Judges always make the final call — the AI assists, it doesn\u2019t decide.',
  },
  {
    q: 'How do certificates verify?',
    a: 'Every certificate carries a QR code and a verification code. Anyone can check a certificate on the /verify page — no account needed.',
  },
  {
    q: 'Can sponsors be featured?',
    a: 'Yes — organizers can showcase sponsors on their event pages, so partners get visible credit for supporting the event.',
  },
];

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

/** Pure-CSS hero illustration: envelope + chat bubble + paper plane. */
function HeroIllustration() {
  return (
    <div className="relative mx-auto hidden h-56 w-full max-w-sm sm:block lg:h-64" aria-hidden="true">
      <div className="absolute left-8 top-10 h-40 w-40 rounded-full border-[18px] border-violet-200/50" />
      <div className="absolute bottom-2 right-10 h-24 w-24 rounded-full bg-indigo-200/60 blur-xl" />
      {/* envelope */}
      <div className="absolute left-10 top-6 rotate-[-8deg] rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-5 shadow-xl shadow-indigo-600/30 transition hover:rotate-0">
        <svg viewBox="0 0 24 24" className="h-10 w-10 text-white" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      </div>
      {/* chat bubble */}
      <div className="absolute bottom-8 left-24 rotate-[5deg] rounded-2xl bg-white p-4 shadow-lg shadow-indigo-600/15 transition hover:rotate-0">
        <div className="space-y-1.5">
          <div className="h-2 w-20 rounded-full bg-indigo-200" />
          <div className="h-2 w-14 rounded-full bg-slate-200" />
          <div className="h-2 w-16 rounded-full bg-violet-200" />
        </div>
      </div>
      {/* paper plane */}
      <div className="absolute right-6 top-14 rotate-[12deg] rounded-2xl bg-slate-900 p-4 shadow-xl transition hover:rotate-0">
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-white" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </svg>
      </div>
      {/* dots */}
      <div className="absolute bottom-4 right-24 h-3 w-3 rounded-full bg-violet-400" />
      <div className="absolute left-4 top-2 h-2 w-2 rounded-full bg-indigo-400" />
      <div className="absolute right-16 bottom-16 h-4 w-4 rounded-full bg-indigo-300/70" />
    </div>
  );
}

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <PublicNav />

      {/* ——— Hero ——— */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-violet-50/70 to-white">
        <div aria-hidden="true" className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-indigo-200/50 blur-3xl" />
        <div aria-hidden="true" className="absolute right-0 top-16 h-80 w-80 rounded-full bg-violet-200/60 blur-3xl" />
        <div aria-hidden="true" className="absolute -right-16 top-8 h-72 w-72 rounded-full border-[24px] border-violet-200/30" />

        <Container className="relative py-14 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100/80 px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-700">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" aria-hidden="true" />
                Get in touch
              </p>
              <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                Let&rsquo;s build something amazing together
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-600">
                Have a question, partnership idea, or need support? We&rsquo;d love to hear
                from you. Reach out and we&rsquo;ll get back to you as soon as possible.
              </p>
            </div>
            <div className="relative">
              <HeroIllustration />
              <div className="absolute -top-2 right-4 rotate-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-center shadow-xl shadow-slate-900/25 transition hover:rotate-0 sm:right-10">
                <p className="text-sm font-extrabold leading-tight text-white">
                  We&rsquo;re here
                  <br />
                  to help
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Container className="py-12 sm:py-16">
        {/* ——— Two-column: info + form ——— */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Contact information */}
          <section
            aria-label="Contact information"
            className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9"
          >
            <p className="inline-flex rounded-full bg-indigo-100/80 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-700">
              Contact us
            </p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
              Contact information
            </h2>
            <p className="mt-2 text-sm text-slate-500">Choose the best way to reach us.</p>

            <ul className="mt-7 space-y-6">
              <li className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                  <MailIcon />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">Email us</p>
                  <a
                    href="mailto:info@akclnt.com"
                    className="mt-0.5 block break-all text-sm font-semibold text-indigo-600 hover:underline"
                  >
                    info@akclnt.com
                  </a>
                  <p className="mt-0.5 text-xs text-slate-500">We usually reply within 24 hours.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                  <DashboardIcon />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">Already organizing?</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Manage events, judging, and check-ins from your{' '}
                    <Link href="/dashboard" className="font-semibold text-indigo-600 hover:underline">
                      dashboard
                    </Link>
                    .
                  </p>
                </div>
              </li>
            </ul>

            <div className="mt-8 border-t border-slate-100 pt-6">
              <p className="text-sm font-bold text-slate-900">Follow us</p>
              <div className="mt-3 flex gap-2.5">
                {SOCIALS.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:-translate-y-0.5 hover:bg-indigo-600 hover:text-white"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                      <path d={s.path} />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          </section>

          {/* Form */}
          <section
            aria-label="Send us a message"
            className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9"
          >
            <p className="inline-flex rounded-full bg-indigo-100/80 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-700">
              Send a message
            </p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
              Drop us a line
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Fill out the form below and we&rsquo;ll get back to you soon.
            </p>
            <div className="mt-6">
              <ContactForm />
            </div>
          </section>
        </div>

        {/* ——— FAQ ——— */}
        <section aria-label="Frequently asked questions" className="mt-12 sm:mt-16">
          <div className="rounded-3xl bg-indigo-50/60 p-7 sm:p-10">
            <p className="inline-flex rounded-full bg-indigo-100/80 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-700">
              Common questions
            </p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Before you reach out
            </h2>
            <p className="mt-2 text-sm text-slate-500">You might find your answer here.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {FAQS.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-600/5"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-slate-900 [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 transition-transform duration-200 group-open:rotate-45">
                      <PlusIcon />
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ——— CTA banner ——— */}
        <section aria-label="Get started" className="mt-12 sm:mt-16">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-950 px-8 py-12 text-center sm:px-12 sm:py-14">
            <div aria-hidden="true" className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/25 blur-3xl" />
            <div aria-hidden="true" className="absolute -bottom-20 -right-12 h-72 w-72 rounded-full bg-violet-500/25 blur-3xl" />
            <div className="relative">
              <p className="inline-flex rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-200">
                Start your journey
              </p>
              <h2 className="mx-auto mt-4 max-w-xl text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Ready to organize your next hackathon?
              </h2>
              <p className="mx-auto mt-3 max-w-md text-indigo-200">
                It&rsquo;s free, fast, and built for builders.
              </p>
              <div className="mt-8">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-indigo-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-50"
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
