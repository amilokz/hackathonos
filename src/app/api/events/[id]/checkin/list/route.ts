import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ownedCheckinEvent, parseMembers } from '@/lib/checkin-auth';

/**
 * GET /api/events/[id]/checkin/list (organizer)
 * All check-ins for the event with team names, newest first, plus
 * attendance totals (checked-in members vs registered members).
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await ownedCheckinEvent(req, params.id);
  if (result.error) return result.error;
  const { event } = result;

  const db = getDb();
  const checkins = (await db
    .prepare(
      `SELECT c.id, c.member_name, c.checked_in_at, c.checked_in_by,
              t.id AS team_id, t.name AS team_name
       FROM checkins c
       JOIN teams t ON t.id = c.team_id
       WHERE c.event_id = ?
       ORDER BY c.checked_in_at DESC`,
    )
    .all(event.id)) as Array<{
    id: string;
    member_name: string;
    checked_in_at: string;
    checked_in_by: string;
    team_id: string;
    team_name: string;
  }>;

  const teamRows = (await db
    .prepare('SELECT id, name, members_json FROM teams WHERE event_id = ? ORDER BY name ASC')
    .all(event.id)) as Array<{ id: string; name: string; members_json: string }>;

  const totalMembers = teamRows.reduce((sum, t) => sum + parseMembers(t.members_json).length, 0);

  return NextResponse.json({
    checkins,
    stats: {
      teams: teamRows.length,
      total_members: totalMembers,
      checked_in: checkins.length,
    },
  });
}
