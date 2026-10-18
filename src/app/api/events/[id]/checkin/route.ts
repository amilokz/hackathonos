import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { ownedCheckinEvent, findTeamByCode } from '@/lib/checkin-auth';

const CheckInSchema = z.object({
  code: z.string().trim().min(1).max(20),
  member_name: z.string().trim().min(1).max(80),
  checked_in_by: z.string().trim().max(80).default(''),
});

/**
 * POST /api/events/[id]/checkin (organizer)
 * Body: { code, member_name, checked_in_by? }
 * Duplicate (event, team, member) → 409 with the original timestamp.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await ownedCheckinEvent(req, params.id);
  if (result.error) return result.error;
  const { event } = result;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = CheckInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Check-in code and member name are required' }, { status: 400 });
  }
  const data = parsed.data;

  const team = await findTeamByCode(event.id, data.code);
  if (!team) return NextResponse.json({ error: 'Invalid check-in code' }, { status: 404 });

  const db = getDb();
  const existing = (await db
    .prepare(
      `SELECT checked_in_at FROM checkins
       WHERE event_id = ? AND team_id = ? AND member_name = ?`,
    )
    .get(event.id, team.id, data.member_name)) as { checked_in_at: string } | undefined;

  if (existing) {
    return NextResponse.json(
      { error: 'already checked in', checked_in_at: existing.checked_in_at },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  try {
    await db
      .prepare(
        `INSERT INTO checkins (id, event_id, team_id, member_name, checked_in_at, checked_in_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(uuid(), event.id, team.id, data.member_name, now, data.checked_in_by);
  } catch {
    // Race: another scan checked this member in first — report it as a duplicate.
    const raced = (await db
      .prepare(
        `SELECT checked_in_at FROM checkins
         WHERE event_id = ? AND team_id = ? AND member_name = ?`,
      )
      .get(event.id, team.id, data.member_name)) as { checked_in_at: string } | undefined;
    return NextResponse.json(
      { error: 'already checked in', checked_in_at: raced?.checked_in_at ?? now },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    team: { id: team.id, name: team.name },
    member_name: data.member_name,
    checked_in_at: now,
  });
}
