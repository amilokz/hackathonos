import type { ReactNode } from 'react';
import NewsletterForm from './NewsletterForm';

export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-5xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Button({
  children,
  type = 'button',
  variant = 'primary',
  disabled,
  onClick,
  className = '',
}: {
  children: ReactNode;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const styles =
    variant === 'primary'
      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
      : variant === 'danger'
        ? 'bg-red-600 text-white hover:bg-red-700'
        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50';
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function LinkButton({ href, children, variant = 'primary', className = '' }: { href: string; children: ReactNode; variant?: 'primary' | 'secondary'; className?: string }) {
  const styles =
    variant === 'primary'
      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50';
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${styles} ${className}`}
    >
      {children}
    </a>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100';

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>
  );
}

export function SuccessNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
  );
}

function SocialIcon({ href, label, path }: { href: string; label: string; path: string }) {
  return (
    <a
      href={href}
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:text-indigo-600"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <path d={path} />
      </svg>
    </a>
  );
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <a href={href} className="text-sm text-slate-500 transition hover:text-indigo-600">
        {children}
      </a>
    </li>
  );
}

/**
 * Footer variant used on white-labeled event pages: suppresses all
 * HackathonOS/AKCLNT branding. The organizer's custom footer text (from
 * event settings) replaces it; nothing renders when no custom text is set.
 */
export function BrandFooter({
  whiteLabel = false,
  customText = '',
}: {
  whiteLabel?: boolean;
  customText?: string | null;
}) {
  if (whiteLabel) {
    const text = (customText ?? '').trim();
    if (!text) return null;
    return (
      <footer className="mt-16 border-t border-slate-200 py-8 text-center">
        <p className="text-xs text-slate-400">{text}</p>
      </footer>
    );
  }
  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-50">
      <Container className="py-12 sm:py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-lg font-extrabold tracking-tight text-slate-900">
              Hackathon<span className="text-indigo-600">OS</span>
            </p>
            <p className="mt-3 max-w-xs text-sm text-slate-500">
              The all-in-one platform to run hackathons — registrations, project submissions, judging and certificates.
            </p>
            <div className="mt-4 flex gap-2">
              <SocialIcon
                href="https://x.com/OkzKomil"
                label="X"
                path="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z"
              />
              <SocialIcon
                href="https://www.linkedin.com/in/komil-hassan"
                label="LinkedIn"
                path="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
              />
              <SocialIcon
                href="https://github.com/amilokz"
                label="GitHub"
                path="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
              />
              <SocialIcon
                href="https://www.youtube.com/@akclntfuturelab"
                label="YouTube"
                path="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
              />
            </div>
          </div>

          <nav aria-label="Product">
            <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Product</p>
            <ul className="mt-4 space-y-2.5">
              <FooterLink href="/#features">Features</FooterLink>
              <FooterLink href="/past">Past hackathons</FooterLink>
            </ul>
          </nav>

          <nav aria-label="Resources">
            <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Resources</p>
            <ul className="mt-4 space-y-2.5">
              <FooterLink href="/about">About</FooterLink>
              <FooterLink href="/contact">Contact</FooterLink>
              <FooterLink href="/#how">Help / FAQ</FooterLink>
              <FooterLink href="/verify/demo">Verify certificate</FooterLink>
            </ul>
          </nav>

          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Stay in the loop</p>
            <p className="mt-4 text-sm text-slate-500">Get hackathon tips and product updates.</p>
            <div className="mt-3">
              <NewsletterForm />
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-slate-200 pt-6 text-xs text-slate-400 sm:flex-row">
          <p>© 2026 HackathonOS. All rights reserved.</p>
          {!whiteLabel && (
            <p>
              Built by{' '}
              <a href="https://akclnt.com" className="font-semibold text-slate-500 hover:text-indigo-600">
                AKCLNT
              </a>
            </p>
          )}
        </div>
      </Container>
    </footer>
  );
}

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-slate-300">›</span>}
            {item.href ? (
              <a href={item.href} className="transition hover:text-indigo-600 hover:underline">
                {item.label}
              </a>
            ) : (
              <span className="font-medium text-slate-500">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function TopNav({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <a href="/" className="text-lg font-extrabold tracking-tight text-slate-900">
          Hackathon<span className="text-indigo-600">OS</span>
        </a>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-500 sm:block">{title}</span>
          {right}
        </div>
      </Container>
    </header>
  );
}
