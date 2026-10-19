import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureSettingsColumns } from '@/lib/settings-columns';
import { ensureBrandingColumns } from '@/lib/branding-columns';
import { ensureOrganizerColumns } from '@/lib/organizer-columns';
import { eventWhiteLabelActive } from '@/lib/white-label';
import { computeResults } from '@/lib/results';

/**
 * PUBLIC leaderboard data for an event (no auth).
 * Judge names are never exposed — only totals and the AI score.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  await ensureSettingsColumns();
  await ensureBrandingColumns();
  await ensureOrganizerColumns();
  const event = await getDb().prepare(
    `SELECT e.id, e.name, e.slug, e.description, e.status, e.white_label, e.custom_footer_text,
            e.brand_color, e.brand_name, e.brand_logo_url,
            o.plan AS organizer_plan, o.white_label_granted AS organizer_white_label_granted
     FROM events e JOIN organizers o ON o.id = e.organizer_id WHERE e.slug = ?`
  ).get(
    params.slug
  ) as { id: string; name: string; slug: string; description: string; status: string; white_label: number | null; custom_footer_text: string | null; brand_color: string | null; brand_name: string | null; brand_logo_url: string | null; organizer_plan: string | null; organizer_white_label_granted: number | null } | undefined;

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  // Leaderboard is public only for published/closed events — drafts stay private.
  if (event.status !== 'published' && event.status !== 'closed') {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const db = getDb();

  const results = (await computeResults(event.id)).map((r) => ({
    rank: r.rank,
    title: r.title,
    team_name: r.team_name,
    judges: r.judges,
    human_total: r.human_total,
    ai_overall: r.ai_overall,
    // Per-criterion average judge score (0-10 scale). Safe to expose publicly —
    // no judge names are included; the rows are averages only.
    criterion_averages: r.criterion_averages.map((ca) => ({
      criterion: ca.criterion,
      average: ca.average,
    })),
  }));

  // Judging progress: distinct (project × judge) cells with at least one score
  // vs all (approved projects × registered judges). Same math as /live.
  const projectsCount = (
    (await db
      .prepare(
        "SELECT COUNT(*) AS c FROM projects p JOIN teams t ON t.id = p.team_id WHERE t.event_id = ? AND t.approval_status = 'approved'"
      )
      .get(event.id)) as { c: number }
  ).c;
  const judgesCount = (
    (await db.prepare('SELECT COUNT(*) AS c FROM judges WHERE event_id = ?').get(event.id)) as {
      c: number;
    }
  ).c;
  const scoredCells = (
    (await db
      .prepare(
        `SELECT COUNT(DISTINCT s.project_id || '|' || s.judge_name) AS c
         FROM scores s
         JOIN projects p ON p.id = s.project_id
         JOIN teams t ON t.id = p.team_id
         WHERE t.event_id = ? AND t.approval_status = 'approved'`
      )
      .get(event.id)) as { c: number }
  ).c;
  const totalCells = projectsCount * judgesCount;
  const judgingPct = totalCells > 0 ? Math.min(100, Math.round((scoredCells / totalCells) * 100)) : 0;

  return NextResponse.json(
    {
      event: {
        name: event.name,
        slug: event.slug,
        description: event.description,
        status: event.status,
        // Paid feature: white label renders only when the event toggle is on
        // AND the organizer's plan (or manual grant) allows it.
        white_label: eventWhiteLabelActive(event, {
          plan: event.organizer_plan,
          white_label_granted: event.organizer_white_label_granted,
        }),
        custom_footer_text: event.custom_footer_text ?? '',
        brand_color: event.brand_color ?? '#4F46E5',
        brand_name: event.brand_name ?? '',
        brand_logo_url: event.brand_logo_url ?? '',
      },
      results,
      judging_progress: { scored: scoredCells, total: totalCells, pct: judgingPct },
      updated_at: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
