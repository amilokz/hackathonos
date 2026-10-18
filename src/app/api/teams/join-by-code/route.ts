import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, migrate } from '@/lib/db';
import { getParticipantFromRequest } from '@/lib/participant-auth';
import {
  TEAM_SIZE_CAP,
  teamHeadcount,
  isAlreadyOnTeam,
  addParticipantToTeam,
} from '@/lib/team-finder';

export const dynamic = 'force-dynamic';

const JoinSchema = z.object({
  code: z.string().trim().min(1).max(20),
});

/**
 * POST /api/teams/join-by-code — a signed-in participant joins a team
 * directly with its human-readable invite code (e.g. "TEAM-X7K2P").
 * The team must be open and under the 5-member cap.
 */
export async function POST(req: NextRequest) {
  const participant = await getParticipantFromRequest(req);
  if (!participant) {
    return NextResponse.json(
      { error: 'Log in as a participant to join a team', loginUrl: '/p/login' },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = JoinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'An invite code is required' }, { status: 400 });
  }

  await migrate();
  const db = getDb();
  const code = parsed.data.code.trim().toUpperCase();
  const team = (await db
    .prepare('SELECT id, event_id, name, is_open, approval_status FROM teams WHERE upper(invite_code) = ?')
    .get(code)) as
    | { id: string; event_id: string; name: string; is_open: number | null; approval_status: string | null }
    | undefined;

  if (!team || team.approval_status !== 'approved') {
    return NextResponse.json({ error: 'Invalid invite code — no team found' }, { status: 404 });
  }
  if (!team.is_open) {
    return NextResponse.json({ error: 'This team is closed and not accepting new members' }, { status: 403 });
  }
  if (await isAlreadyOnTeam(team.id, participant)) {
    return NextResponse.json({ error: 'You are already on this team' }, { status: 409 });
  }
  const headcount = await teamHeadcount(team.id);
  if (headcount >= TEAM_SIZE_CAP) {
    return NextResponse.json({ error: `This team is full (max ${TEAM_SIZE_CAP} members)` }, { status: 409 });
  }

  await addParticipantToTeam(team.id, participant);

  return NextResponse.json({ ok: true, team: { id: team.id, name: team.name, event_id: team.event_id } });
}
