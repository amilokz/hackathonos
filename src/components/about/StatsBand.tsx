/**
 * Stats band for the About page. Renders ONLY real database counts
 * (events / teams / projects). When the database is empty or unreachable,
 * shows a tasteful placeholder instead of invented numbers.
 */

export type PlatformStats = { events: number; teams: number; projects: number } | null;

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center sm:text-left">
      <p className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
}

export default function StatsBand({ stats }: { stats: PlatformStats }) {
  const hasData =
    stats !== null && (stats.events > 0 || stats.teams > 0 || stats.projects > 0);

  return (
    <section aria-label="Platform stats" className="mt-16 sm:mt-20">
      <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-8 sm:p-12">
        <div
          aria-hidden="true"
          className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-200/40 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-indigo-200/40 blur-3xl"
        />
        <div className="relative">
          <p className="inline-flex rounded-full bg-indigo-100/80 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-700">
            Why it matters
          </p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Real people. Real impact.
          </h2>
          <p className="mt-3 max-w-2xl text-slate-600">
            Every hackathon we power creates opportunities — for students, developers,
            and dreamers. We&rsquo;re not just building a platform; we&rsquo;re building a
            stronger tech ecosystem for Pakistan and beyond.
          </p>

          {hasData ? (
            <div className="mt-8 grid grid-cols-1 gap-8 border-t border-indigo-100 pt-8 sm:grid-cols-3">
              <Stat value={String(stats!.events)} label="Hackathons" />
              <Stat value={String(stats!.teams)} label="Teams" />
              <Stat value={String(stats!.projects)} label="Projects" />
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-indigo-200 bg-white/70 px-6 py-8 text-center">
              <p className="text-lg font-bold text-slate-800">Growing with every hackathon</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                These numbers fill in as organizers run events on the platform — no vanity
                metrics, just the real count.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
