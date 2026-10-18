import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ownedCheckinEvent } from '@/lib/checkin-auth';

function csvCell(value: string | null | undefined): string {
  const s = String(value ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * GET /api/events/[id]/checkin/export (organizer)
 * Downloads the check-in log as CSV: {slug}-checkins-{YYYY-MM-DD}.csv
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await ownedCheckinEvent(req, params.id);
  if (result.error) return result.error;
  const { event } = result;

  const db = getDb();
  const rows = (await db
    .prepare(
      `SELECT c.member_name, t.name AS team_name, c.checked_in_at, c.checked_in_by
       FROM checkins c
       JOIN teams t ON t.id = c.team_id
       WHERE c.event_id = ?
       ORDER BY c.checked_in_at DESC`,
    )
    .all(event.id)) as Array<{
    member_name: string;
    team_name: string;
    checked_in_at: string;
    checked_in_by: string;
  }>;

  const header = ['member_name', 'team', 'checked_in_at', 'checked_in_by'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [r.member_name, r.team_name, r.checked_in_at, r.checked_in_by].map(csvCell).join(','),
    );
  }
  const csv = '\uFEFF' + lines.join('\r\n') + '\r\n'; // BOM so Excel shows UTF-8 names correctly

  const date = new Date().toISOString().slice(0, 10);
  const safeSlug = (event.slug || 'event').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
  const filename = `${safeSlug}-checkins-${date}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
