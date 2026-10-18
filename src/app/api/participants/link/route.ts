import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { getDb, migrate } from '@/lib/db';
import { getParticipantFromRequest } from '@/lib/participant-auth';

const LinkSchema = z.object({
  teamId: z.string().trim().min(1).max(100),
  /** Optional override; defaults to the participant's own email. */
  email: z.string().trim().email().max(200).optional(),
  /** Optional member name to record when a new row must be created. */
  memberName: z.string().trim().min(1).max(120).optional(),
});

/**
 * Claims a team membership: attaches the signed-in participant to the
 * team_members row(s) in the given team whose email matches (defaults to the
 * participant's own email). If no matching row exists, a new member row is
 * created so the linkage exists going forward.
 */
export async function POST(req: NextRequest) {
  const participant = await getParticipantFromRequest(req);
  if (!participant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = LinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
  }

  await migrate();
  const db = getDb();
  const email = (parsed.data.email ?? participant.email).toLowerCase().trim();

  const team = await db.prepare('SELECT id FROM teams WHERE id = ?').get(parsed.data.teamId);
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

  const matched = (await db
    .prepare('SELECT id, participant_id FROM team_members WHERE team_id = ? AND LOWER(email) = ?')
    .all(parsed.data.teamId, email)) as { id: string; participant_id: string | null }[];

  const now = new Date().toISOString();
  if (matched.length > 0) {
    const toLink = matched.filter((m) => m.participant_id !== participant.id);
    for (const m of toLink) {
      await db
        .prepare('UPDATE team_members SET participant_id = ? WHERE id = ?')
        .run(participant.id, m.id);
    }
    return NextResponse.json({ ok: true, linked: toLink.length, alreadyLinked: matched.length - toLink.length });
  }

  const memberId = uuid();
  await db
    .prepare(
      `INSERT INTO team_members (id, team_id, name, email, role, participant_id, created_at)
       VALUES (?, ?, ?, ?, 'member', ?, ?)`,
    )
    .run(memberId, parsed.data.teamId, parsed.data.memberName ?? participant.name, email, participant.id, now);
  return NextResponse.json({ ok: true, linked: 1, created: true }, { status: 201 });
}
