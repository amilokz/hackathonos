'use client';

import CopyLinkButton from '@/components/CopyLinkButton';

/**
 * Public-link list for the event manage page, with per-link copy buttons.
 * Links stay visible for published AND closed events (closed events still
 * have a public page + leaderboard); drafts get the disabled notice.
 */
export default function QuickLinks({ slug, status }: { slug: string; status: string }) {
  if (status === 'draft') {
    return (
      <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
        ⚠️ Event is in <strong>Draft</strong> — public links are disabled. Set Status to{' '}
        <strong>Published</strong> above and save to activate them.
      </p>
    );
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const links = [
    { label: 'Public event page', path: `/e/${slug}` },
    { label: 'Leaderboard', path: `/e/${slug}/leaderboard` },
    { label: 'Team registration', path: `/e/${slug}/register` },
    { label: 'Project submission', path: `/e/${slug}/submit` },
  ];

  return (
    <div className="mt-3">
      {status === 'closed' && (
        <p className="mb-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          🏁 Event is <strong>closed</strong> — the public page and leaderboard stay live, but
          registration/submission links show an “event ended” note.
        </p>
      )}
      <ul className="space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.path} className="flex items-center justify-between gap-2">
            <a className="min-w-0 truncate text-indigo-600 hover:underline" href={l.path} title={l.path}>
              {l.label}
            </a>
            <CopyLinkButton url={`${origin}${l.path}`} label={l.label} />
          </li>
        ))}
      </ul>
    </div>
  );
}
