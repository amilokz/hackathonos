import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureSettingsColumns } from '@/lib/settings-columns';
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
  const event = await getDb().prepare('SELECT id, name, slug, description, status, white_label, custom_footer_text FROM events WHERE slug = ?').get(
    params.slug
  ) as { id: string; name: string; slug: string; description: string; status: string; white_label: number | null; custom_footer_text: string | null } | undefined;

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const results = (await computeResults(event.id)).map((r) => ({
    rank: r.rank,
    title: r.title,
    team_name: r.team_name,
    judges: r.judges,
    human_total: r.human_total,
    ai_overall: r.ai_overall,
  }));

  return NextResponse.json(
    {
      event: {
        name: event.name,
        slug: event.slug,
        description: event.description,
        status: event.status,
        white_label: Boolean(event.white_label),
        custom_footer_text: event.custom_footer_text ?? '',
      },
      results,
      updated_at: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
