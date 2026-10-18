import { notFound } from 'next/navigation';
import { getDb, migrate } from '@/lib/db';
import { ensureAnnouncementColumns } from '@/lib/announcement-columns';
import { computeResults } from '@/lib/results';
import LiveCommandCenter, { type LiveData } from '@/components/LiveCommandCenter';

export const dynamic = 'force-dynamic';

/**
 * Normalize a deadline into an ISO string the client can parse.
 * Bare "YYYY-MM-DD" end dates (the standard format in this app) count as
 * end-of-day local time, since submissions close when the day ends.
 */
function toDeadlineIso(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T23:59:59`;
  const ms = Date.parse(s);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

export default async function LivePage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { kiosk?: string };
}) {
  await migrate();
  await ensureAnnouncementColumns();
  const db = getDb();

  const event = (await db
    .prepare('SELECT id, name, slug, status, end_date FROM events WHERE slug = ?')
    .get(params.slug)) as
    | { id: string; name: string; slug: string; status: string; end_date: string }
    | undefined;
  // Only published/closed events have a public live page (same visibility as /e/[slug]).
  if (!event || (event.status !== 'published' && event.status !== 'closed')) notFound();

  const eventId = event.id;

  const teamsCount = (
    (await db
      .prepare("SELECT COUNT(*) AS c FROM teams WHERE event_id = ? AND approval_status = 'approved'")
      .get(eventId)) as { c: number }
  ).c;

  const projectsCount = (
    (await db
      .prepare(
        'SELECT COUNT(*) AS c FROM projects p JOIN teams t ON t.id = p.team_id WHERE t.event_id = ?'
      )
      .get(eventId)) as { c: number }
  ).c;

  const checkinsCount = (
    (await db.prepare('SELECT COUNT(*) AS c FROM checkins WHERE event_id = ?').get(eventId)) as {
      c: number;
    }
  ).c;

  const judgesCount = (
    (await db.prepare('SELECT COUNT(*) AS c FROM judges WHERE event_id = ?').get(eventId)) as {
      c: number;
    }
  ).c;

  // A "score cell" = one judge's verdict on one project (any criterion row counts).
  const scoredCells = (
    (await db
      .prepare(
        `SELECT COUNT(DISTINCT s.project_id || '|' || s.judge_name) AS c
         FROM scores s
         JOIN projects p ON p.id = s.project_id
         JOIN teams t ON t.id = p.team_id
         WHERE t.event_id = ?`
      )
      .get(eventId)) as { c: number }
  ).c;

  const totalCells = projectsCount * judgesCount;
  const judgingPct = totalCells > 0 ? Math.min(100, Math.round((scoredCells / totalCells) * 100)) : 0;

  // Pinned first so important broadcasts always hit the ticker; type='deadline'
  // items are lifted into the alert banner by LiveCommandCenter.
  const announcements = (await db
    .prepare(
      'SELECT id, title, type, pinned, message, created_at FROM announcements WHERE event_id = ? ORDER BY pinned DESC, created_at DESC, rowid DESC LIMIT 8'
    )
    .all(eventId)) as {
    id: string;
    title: string;
    type: string;
    pinned: number;
    message: string;
    created_at: string;
  }[];

  const sponsors = (await db
    .prepare(
      'SELECT name, logo_url, tier FROM sponsors WHERE event_id = ? ORDER BY CASE tier WHEN \'platinum\' THEN 0 WHEN \'gold\' THEN 1 ELSE 2 END, name'
    )
    .all(eventId)) as { name: string; logo_url: string; tier: string }[];

  let podium: LiveData['podium'] = null;
  if (event.status === 'closed') {
    const results = await computeResults(eventId);
    const top3 = results.filter((r) => r.human_total !== null).slice(0, 3);
    if (top3.length > 0) {
      podium = top3.map((r) => ({
        team_name: r.team_name,
        title: r.title,
        score: Math.round(r.human_total as number),
        breakdown: r.criterion_averages.map((ca) => ({
          criterion: ca.criterion,
          average: ca.average,
        })),
      }));
    }
  }

  const data: LiveData = {
    eventName: event.name,
    eventSlug: event.slug,
    status: event.status,
    deadlineIso: toDeadlineIso(event.end_date),
    teamsCount,
    projectsCount,
    checkinsCount,
    judgingPct,
    scoredCells,
    totalCells,
    announcements,
    podium,
    sponsors,
  };

  return <LiveCommandCenter data={data} kiosk={searchParams.kiosk === '1'} />;
}
