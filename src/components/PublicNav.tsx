import Link from 'next/link';

/**
 * Shared public navbar — same on every public page (homepage, about,
 * contact, verify, past). Anchor links use /# so they work from any page.
 */
export default function PublicNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          Hackathon<span className="text-indigo-600">OS</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <Link href="/#features" className="transition hover:text-indigo-600">
            Features
          </Link>
          <Link href="/#how" className="transition hover:text-indigo-600">
            How it works
          </Link>
          <Link href="/past" className="transition hover:text-indigo-600">
            Past hackathons
          </Link>
          <Link href="/about" className="transition hover:text-indigo-600">
            About
          </Link>
          <Link href="/contact" className="transition hover:text-indigo-600">
            Contact
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-semibold text-slate-600 transition hover:text-indigo-600"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            Get started free
          </Link>
        </div>
      </div>
    </header>
  );
}
