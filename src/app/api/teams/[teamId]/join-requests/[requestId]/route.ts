import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, migrate } from '@/lib/db';
import { getParticipantFromRequest } from '@/lib/participant-auth';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';
import { TEAM_SIZE_CAP, teamHeadcount, addParticipantToTeam } from '@/lib/team-finder';

export const dynamic = 'force-dynamic';

const ActionSchema = z.object({
  action: z.enum(['accept', 'reject']),
});

interface JoinRequestRow {
  id: string;
  team_id: string;
  participant_id: string;
  message: string;
  status: string;
  created_at: string;
}

/** Organizer of the event, or a participant already rostered on the team. */
async function isAuthorized(
  req: NextRequest,
  eventId: string,
  teamId: string,
): Promise<{ kind: 'organizer' | 'member' } | null> {
  const org = await requireOrganizerFromRequest(req);
  if (org && (await getOwnedEvent(eventId, org.id))) return { kind: 'organizer' };

  const participant = await getParticipantFromRequest(req);
  if (participant) {
    const db = getDb();
    const email = participant.email.trim().toLowerCase();
    const member = (await db
      .prepare(
        'SELECT id FROM team_members WHERE team_id = ? AND (participant_id = ? OR (email <> \'\' AND lower(email) = ?))',
      )
      .get(teamId, participant.id, email)) as { id: string } | undefined;
    if (member) return { kind: 'member' };
  }
  return null;
}

/**
 * POST /api/teams/[teamId]/join-requests/[requestId] — accept or reject a
 * pending join request. Allowed for the event organizer, or any existing
 * team member (signed-in participant). Accepting adds the requester to
 * team_members (team cap of 5 enforced).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { teamId: string; requestId: string } },
) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "action must be 'accept' or 'reject'" }, { status: 400 });
  }

  await migrate();
  const db = getDb();

  const team = (await db
    .prepare('SELECT id, event_id, name FROM teams WHERE id = ?')
    .get(params.teamId)) as { id: string; event_id: string; name: string } | undefined;
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

  const auth = await isAuthorized(req, team.event_id, team.id);
  if (!auth) return NextResponse.json({ error: 'Not authorized to manage this team' }, { status: 403 });

  const request = (await db
    .prepare('SELECT id, team_id, participant_id, message, status, created_at FROM join_requests WHERE id = ? AND team_id = ?')
    .get(params.requestId, params.teamId)) as JoinRequestRow | undefined;
  if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  if (request.status !== 'pending') {
    return NextResponse.json({ error: `Request is already ${request.status}` }, { status: 409 });
  }

  if (parsed.data.action === 'reject') {
    await db.prepare("UPDATE join_requests SET status = 'rejected' WHERE id = ?").run(request.id);
    return NextResponse.json({ ok: true, status: 'rejected' });
  }

  // Accept: enforce the team-size cap, then roster the participant.
  const headcount = await teamHeadcount(team.id);
  if (headcount >= TEAM_SIZE_CAP) {
    return NextResponse.json(
      { error: `This team is full (max ${TEAM_SIZE_CAP} members)` },
      { status: 409 },
    );
  }

  let requester: { id: string; name: string; email: string } | null = null;
  try {
    requester = (await db
      .prepare('SELECT id, name, email FROM participants WHERE id = ?')
      .get(request.participant_id)) as { id: string; name: string; email: string } | null;
  } catch {
    requester = null;
  }
  if (!requester) {
    return NextResponse.json({ error: 'Participant profile not found' }, { status: 410 });
  }

  await addParticipantToTeam(team.id, requester);
  await db.prepare("UPDATE join_requests SET status = 'accepted' WHERE id = ?").run(request.id);

  return NextResponse.json({ ok: true, status: 'accepted', member: { name: requester.name } });
}
