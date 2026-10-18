import { formatDate } from '@/lib/format';
import type { EventRow } from '@/lib/types';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 ring-gray-200',
  published: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  closed: 'bg-slate-200 text-slate-600 ring-slate-300',
};

const STATUS_DOT: Record<string, string> = {
  draft: 'bg-gray-400',
  published: 'bg-emerald-500',
  closed: 'bg-slate-400',
};

/** "Oct 20, 2026 – Oct 22, 2026", a single day when equal, or "Dates TBA". */
function formatDateRange(start: string | null | undefined, end: string | null | undefined): string {
  const s = formatDate(start);
  const e = formatDate(end);
  if (s && e) return s === e ? s : `${s} – ${e}`;
  return s || e || 'Dates TBA';
}

/**
 * Professional event card for the organizer dashboard.
 * Cover: event.cover_url, otherwise an indigo→violet gradient with the
 * event's initial letter (never an external placeholder image).
 */
export default function EventCard({
  event,
  teams,
  projects,
  pendingTeams = 0,
}: {
  event: EventRow;
  teams: number;
  projects: number;
  pendingTeams?: number;
}) {
  const cover = (event.cover_url ?? '').trim();
  const initial = (event.name || '?').trim().charAt(0).toUpperCase();
  const manageHref = `/dashboard/events/${event.id}`;
  const statusStyle = STATUS_STYLES[event.status] ?? STATUS_STYLES.draft;
  const statusDot = STATUS_DOT[event.status] ?? STATUS_DOT.draft;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
      {/* Cover */}
      <div className="relative h-40 w-full overflow-hidden">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800"
            aria-hidden="true"
          >
            <span className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10" />
            <span className="absolute -bottom-10 -left-10 h-44 w-44 rounded-full bg-white/[0.07]" />
            <span className="relative text-7xl font-extrabold tracking-tight text-white/90 drop-shadow-sm">
              {initial}
            </span>
          </div>
        )}
        {/* Status badge overlaid on cover */}
        <span
          className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold capitalize shadow-sm ring-1 ring-inset ${statusStyle}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} aria-hidden="true" />
          {event.status}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold leading-snug text-slate-900">{event.name}</h3>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500">
          <span aria-hidden="true">📅</span>
          <span className="font-medium text-slate-700">
            {formatDateRange(event.start_date, event.end_date)}
          </span>
        </p>
        <p className="mt-0.5 font-mono text-xs text-slate-400">/e/{event.slug}</p>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true">👥</span>
            <strong className="text-slate-900">{teams.toLocaleString()}</strong> teams
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true">🚀</span>
            <strong className="text-slate-900">{projects.toLocaleString()}</strong> projects
          </span>
          {pendingTeams > 0 && (
            <a
              href={`${manageHref}#teams`}
              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 ring-1 ring-inset ring-amber-200 transition hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              title="Teams awaiting approval"
            >
              {pendingTeams} pending
            </a>
          )}
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <a
            href={manageHref}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(79,70,229,0.35)] transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
          >
            ⚙️ Manage event
          </a>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <a
              href={`${manageHref}/analytics`}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              📊 Analytics
            </a>
            <a
              href={`/e/${event.slug}/live`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              🖥️ Live
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
