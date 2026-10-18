import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ownedCheckinEvent, findTeamByCode, parseMembers } from '@/lib/checkin-auth';

/**
 * GET /api/events/[id]/checkin/roster?code=CHK-XXXXXX (organizer)
 * Validates the team's check-in code and returns the roster plus who has
 * already checked in.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await ownedCheckinEvent(req, params.id);
  if (result.error) return result.error;
  const { event } = result;

  const code = req.nextUrl.searchParams.get('code') ?? '';
  const team = await findTeamByCode(event.id, code);
  if (!team) return NextResponse.json({ error: 'Invalid check-in code' }, { status: 404 });

  const db = getDb();
  const teamRow = (await db
    .prepare('SELECT members_json FROM teams WHERE id = ?')
    .get(team.id)) as { members_json: string } | undefined;
  const members = parseMembers(teamRow?.members_json);

  const alreadyCheckedIn = (await db
    .prepare(
      `SELECT member_name, checked_in_at FROM checkins
       WHERE event_id = ? AND team_id = ? ORDER BY checked_in_at ASC`,
    )
    .all(event.id, team.id)) as Array<{ member_name: string; checked_in_at: string }>;

  return NextResponse.json({
    team: { id: team.id, name: team.name },
    members,
    already_checked_in: alreadyCheckedIn,
  });
}
