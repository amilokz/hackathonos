import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { getDb, migrate } from '@/lib/db';
import { getParticipantFromRequest } from '@/lib/participant-auth';
import { isAlreadyOnTeam } from '@/lib/team-finder';

export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  message: z.string().trim().max(500).default(''),
});

/**
 * POST /api/teams/[teamId]/join-requests — a signed-in participant asks to
 * join an open, approved team. 409 when they already requested or are already
 * on the team.
 */
export async function POST(req: NextRequest, { params }: { params: { teamId: string } }) {
  const participant = await getParticipantFromRequest(req);
  if (!participant) {
    return NextResponse.json(
      { error: 'Log in as a participant to request to join a team', loginUrl: '/p/login' },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  await migrate();
  const db = getDb();
  const team = (await db
    .prepare('SELECT id, name, is_open, approval_status FROM teams WHERE id = ?')
    .get(params.teamId)) as
    | { id: string; name: string; is_open: number | null; approval_status: string | null }
    | undefined;
  if (!team || team.approval_status !== 'approved') {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  }
  if (!team.is_open) {
    return NextResponse.json({ error: 'This team is not accepting new members right now' }, { status: 403 });
  }

  if (await isAlreadyOnTeam(team.id, participant)) {
    return NextResponse.json({ error: 'You are already on this team' }, { status: 409 });
  }

  const existing = (await db
    .prepare('SELECT id, status FROM join_requests WHERE team_id = ? AND participant_id = ?')
    .get(team.id, participant.id)) as { id: string; status: string } | undefined;
  if (existing) {
    return NextResponse.json(
      { error: existing.status === 'pending' ? 'You already have a pending request for this team' : 'You already requested to join this team' },
      { status: 409 },
    );
  }

  const id = uuid();
  await db
    .prepare(
      'INSERT INTO join_requests (id, team_id, participant_id, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(id, team.id, participant.id, parsed.data.message, 'pending', new Date().toISOString());

  return NextResponse.json({ ok: true, id, team: team.name }, { status: 201 });
}
