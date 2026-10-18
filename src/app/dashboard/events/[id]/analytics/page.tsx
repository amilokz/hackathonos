import { redirect, notFound } from 'next/navigation';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizer, getOwnedEvent } from '@/lib/require-organizer';
import OrganizerShell from '@/components/OrganizerShell';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export const dynamic = 'force-dynamic';

interface ActivityItem {
  kind: string;
  text: string;
  created_at: string;
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

function StatTile({ label, value, delta }: { label: string; value: number; delta: number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <div className="mt-2 flex items-end justify-between">
        <p className="text-4xl font-extrabold text-white">{value.toLocaleString()}</p>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${delta > 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
          +{delta} today
        </span>
      </div>
    </div>
  );
}

export default async function AnalyticsPage({ params }: { params: { id: string } }) {
  const org = await requireOrganizer();
  if (!org) redirect('/login');

  await migrate();
  const db = getDb();
  const event = await getOwnedEvent(params.id, org.id);
  if (!event) notFound();
  const eventId = event.id;

  // ---- headline counts + today deltas ----
  const teams = (await db.prepare("SELECT COUNT(*) AS c FROM teams WHERE event_id = ? AND approval_status = 'approved'").get(eventId) as { c: number }).c;
  const teamsToday = (await db.prepare("SELECT COUNT(*) AS c FROM teams WHERE event_id = ? AND approval_status = 'approved' AND date(created_at) = date('now')").get(eventId) as { c: number }).c;

  const projects = (await db.prepare("SELECT COUNT(*) AS c FROM projects WHERE team_id IN (SELECT id FROM teams WHERE event_id = ? AND approval_status = 'approved')").get(eventId) as { c: number }).c;
  const projectsToday = (await db.prepare("SELECT COUNT(*) AS c FROM projects p JOIN teams t ON t.id = p.team_id WHERE t.event_id = ? AND t.approval_status = 'approved' AND date(p.created_at) = date('now')").get(eventId) as { c: number }).c;

  const scores = (await db.prepare("SELECT COUNT(*) AS c FROM scores s JOIN projects p ON p.id = s.project_id JOIN teams t ON t.id = p.team_id WHERE t.event_id = ? AND t.approval_status = 'approved'").get(eventId) as { c: number }).c;
  const scoresToday = (await db.prepare("SELECT COUNT(*) AS c FROM scores s JOIN projects p ON p.id = s.project_id JOIN teams t ON t.id = p.team_id WHERE t.event_id = ? AND t.approval_status = 'approved' AND date(s.created_at) = date('now')").get(eventId) as { c: number }).c;

  const checkins = (await db.prepare('SELECT COUNT(*) AS c FROM checkins WHERE event_id = ?').get(eventId) as { c: number }).c;
  const checkinsToday = (await db.prepare("SELECT COUNT(*) AS c FROM checkins WHERE event_id = ? AND date(checked_in_at) = date('now')").get(eventId) as { c: number }).c;

  // ---- live activity feed (latest 15) ----
  const feed = (await db.prepare(`
    SELECT kind, text, created_at FROM (
      SELECT 'team' AS kind, 'Team "' || name || '" registered' AS text, created_at
      FROM teams WHERE event_id = ? AND approval_status = 'approved'
      UNION ALL
      SELECT 'project' AS kind, 'Project "' || p.title || '" submitted by ' || t.name AS text, p.created_at
      FROM projects p JOIN teams t ON t.id = p.team_id
      WHERE t.event_id = ? AND t.approval_status = 'approved'
      UNION ALL
      SELECT 'score' AS kind, s.judge_name || ' scored "' || p.title || '"' AS text, s.created_at
      FROM scores s JOIN projects p ON p.id = s.project_id JOIN teams t ON t.id = p.team_id
      WHERE t.event_id = ? AND t.approval_status = 'approved'
      UNION ALL
      SELECT 'checkin' AS kind, c.member_name || ' checked in (' || t.name || ')' AS text, c.checked_in_at AS created_at
      FROM checkins c JOIN teams t ON t.id = c.team_id
      WHERE c.event_id = ?
    ) ORDER BY created_at DESC LIMIT 15
  `).all(eventId, eventId, eventId, eventId)) as ActivityItem[];

  // ---- funnel: teams -> projects -> fully scored ----
  const scoredProjects = (await db.prepare(`
    SELECT COUNT(DISTINCT s.project_id) AS c FROM scores s
    JOIN projects p ON p.id = s.project_id
    JOIN teams t ON t.id = p.team_id
    WHERE t.event_id = ? AND t.approval_status = 'approved'
  `).get(eventId) as { c: number }).c;
  const unscoredProjects = projects - scoredProjects;
  const funnel = [
    { label: 'Teams', count: teams, pct: 100, color: 'bg-indigo-500' },
    { label: 'Projects', count: projects, pct: teams > 0 ? Math.round((projects / teams) * 100) : 0, color: 'bg-violet-500' },
    { label: 'Fully scored', count: scoredProjects, pct: projects > 0 ? Math.round((scoredProjects / projects) * 100) : 0, color: 'bg-emerald-500' },
  ];

  // ---- team size distribution ----
  const memberRows = (await db.prepare("SELECT members_json FROM teams WHERE event_id = ? AND approval_status = 'approved'").all(eventId)) as { members_json: string }[];
  const sizes = [0, 0, 0, 0, 0]; // 1, 2, 3, 4, 5+
  for (const r of memberRows) {
    let n = 0;
    try {
      n = (JSON.parse(r.members_json || '[]') as unknown[]).length;
    } catch { n = 0; }
    if (n <= 1) sizes[0] += 1;
    else if (n === 2) sizes[1] += 1;
    else if (n === 3) sizes[2] += 1;
    else if (n === 4) sizes[3] += 1;
    else sizes[4] += 1;
  }
  const maxSize = Math.max(1, ...sizes);

  // ---- registrations over time (last 14 days) ----
  const regRows = (await db.prepare(`
    SELECT date(created_at) AS d, COUNT(*) AS c FROM teams
    WHERE event_id = ? AND approval_status = 'approved' AND date(created_at) >= date('now', '-13 days')
    GROUP BY d
  `).all(eventId)) as { d: string; c: number }[];
  const regByDay = new Map(regRows.map((r) => [r.d, r.c]));
  const days: { label: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ label: d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }), count: regByDay.get(key) ?? 0 });
  }
  const maxReg = Math.max(1, ...days.map((d) => d.count));

  // ---- judging progress per judge ----
  const judgeNames = ((await db.prepare('SELECT name FROM judges WHERE event_id = ? ORDER BY name').all(eventId)) as { name: string }[]).map((j) => j.name);
  const scorerNames = (await db.prepare(`
    SELECT DISTINCT s.judge_name AS name FROM scores s
    JOIN projects p ON p.id = s.project_id
    JOIN teams t ON t.id = p.team_id
    WHERE t.event_id = ? AND t.approval_status = 'approved'
  `).all(eventId)) as { name: string }[];
  const allJudges = Array.from(new Set(judgeNames.concat(scorerNames.map((s) => s.name)))).sort((a, b) => a.localeCompare(b));
  const judgeProgress: { name: string; scored: number }[] = [];
  for (const name of allJudges) {
    const scored = (await db.prepare(`
      SELECT COUNT(DISTINCT s.project_id) AS c FROM scores s
      JOIN projects p ON p.id = s.project_id
      JOIN teams t ON t.id = p.team_id
      WHERE t.event_id = ? AND t.approval_status = 'approved' AND s.judge_name = ?
    `).get(eventId, name) as { c: number }).c;
    judgeProgress.push({ name, scored });
  }

  // ---- donut geometry ----
  const donutPct = projects > 0 ? scoredProjects / projects : 0;
  const R = 54;
  const CIRC = 2 * Math.PI * R;

  const KIND_DOT: Record<string, string> = {
    team: 'bg-indigo-400',
    project: 'bg-violet-400',
    score: 'bg-emerald-400',
    checkin: 'bg-amber-400',
  };

  return (
    <OrganizerShell organizer={org} active="events" dark>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 text-slate-100">
        {/* header */}
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: event.name, href: `/dashboard/events/${eventId}` },
            { label: 'Analytics' },
          ]}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-extrabold tracking-tight text-white">
            Mission Control <span className="text-slate-500">· {event.name}</span>
          </h1>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> LIVE
          </span>
        </div>
        {/* stat tiles */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Teams" value={teams} delta={teamsToday} />
          <StatTile label="Projects" value={projects} delta={projectsToday} />
          <StatTile label="Scores" value={scores} delta={scoresToday} />
          <StatTile label="Check-ins" value={checkins} delta={checkinsToday} />
        </section>

        {/* exports */}
        <section className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Export</span>
          <a href={`/api/events/${eventId}/export/teams`} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-indigo-500 hover:text-white">⬇ Teams CSV</a>
          <a href={`/api/events/${eventId}/export/projects`} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-indigo-500 hover:text-white">⬇ Projects CSV</a>
          <a href={`/api/events/${eventId}/export/scores`} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-indigo-500 hover:text-white">⬇ Scores matrix CSV</a>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* live activity */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="font-bold text-white">⚡ Live activity</h2>
            <p className="mt-0.5 text-xs text-slate-500">Latest 15 events across teams, projects, scores and check-ins.</p>
            {feed.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">Nothing yet — activity appears here in real time.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {feed.map((f, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${KIND_DOT[f.kind] ?? 'bg-slate-500'}`} />
                    <div className="min-w-0">
                      <p className="truncate text-slate-200">{f.text}</p>
                      <p className="text-xs text-slate-500">{timeAgo(f.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* funnel */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="font-bold text-white">🔻 Submissions funnel</h2>
            <p className="mt-0.5 text-xs text-slate-500">Conversion from registered teams to scored projects.</p>
            <div className="mt-5 space-y-5">
              {funnel.map((f) => (
                <div key={f.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-200">{f.label}</span>
                    <span className="text-slate-400">
                      <strong className="text-white">{f.count}</strong> · {f.pct}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-slate-800">
                    <div className={`h-full rounded-full ${f.color}`} style={{ width: `${Math.max(2, f.pct)}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* donut: projects by status */}
            <div className="mt-8 flex items-center gap-6">
              <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
                <circle cx="70" cy="70" r={R} fill="none" stroke="#1e293b" strokeWidth="16" />
                <circle
                  cx="70"
                  cy="70"
                  r={R}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeDasharray={`${CIRC * donutPct} ${CIRC}`}
                />
                <text x="70" y="70" textAnchor="middle" dy=".35em" transform="rotate(90 70 70)" className="fill-white text-2xl font-extrabold">
                  {projects}
                </text>
              </svg>
              <div className="text-sm">
                <p className="font-bold text-white">Projects by status</p>
                <p className="mt-2 flex items-center gap-2 text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Scored — {scoredProjects}
                </p>
                <p className="mt-1.5 flex items-center gap-2 text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-700" /> Unscored — {unscoredProjects}
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* team size distribution */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="font-bold text-white">👥 Team size distribution</h2>
            <p className="mt-0.5 text-xs text-slate-500">Members per approved team.</p>
            <div className="mt-5 flex h-36 items-end gap-3">
              {['1', '2', '3', '4', '5+'].map((label, i) => (
                <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-300">{sizes[i]}</span>
                  <div
                    className="w-full rounded-t-lg bg-indigo-500/80"
                    style={{ height: `${Math.max(4, (sizes[i] / maxSize) * 100)}%` }}
                  />
                  <span className="text-xs text-slate-500">{label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* registrations over time */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="font-bold text-white">📈 Registrations — last 14 days</h2>
            <p className="mt-0.5 text-xs text-slate-500">Approved teams per day.</p>
            <div className="mt-5 flex h-36 items-end gap-1.5">
              {days.map((d) => (
                <div key={d.label} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${d.label}: ${d.count}`}>
                  <div
                    className="w-full rounded-t bg-violet-500/80"
                    style={{ height: `${Math.max(3, (d.count / maxReg) * 100)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-slate-500">
              <span>{days[0]?.label}</span>
              <span>{days[13]?.label}</span>
            </div>
          </section>
        </div>

        {/* judging progress per judge */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-bold text-white">🧑‍⚖️ Judging progress</h2>
          <p className="mt-0.5 text-xs text-slate-500">Projects scored per judge (of {projects} total).</p>
          {judgeProgress.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No judges or scores yet.</p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {judgeProgress.map((j) => {
                const pct = projects > 0 ? Math.round((j.scored / projects) * 100) : 0;
                return (
                  <div key={j.name} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate font-semibold text-slate-200">{j.name}</span>
                      <span className="text-slate-400">
                        <strong className="text-white">{j.scored}</strong>/{projects}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </OrganizerShell>
  );
}
