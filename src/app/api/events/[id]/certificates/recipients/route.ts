import { migrate } from '@/lib/db';
import { ensureCertificateColumns } from '@/lib/certificate-columns';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';
import { getRecipientPools } from '@/lib/certificate-recipients';

export const dynamic = 'force-dynamic';

/**
 * GET /api/events/[id]/certificates/recipients — recipient pools for bulk PDF
 * distribution (organizer only). Returns:
 *  - team_members: every member of approved teams.
 *  - winners: members of the top-3 ranked projects that have human scores,
 *    computed with the same computeResults() the judging page uses.
 *  - winners_ranked: the top-3 projects (rank, score) for display.
 *  - team_count: number of approved teams.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  await migrate();
  await ensureCertificateColumns();
  const organizer = await requireOrganizerFromRequest(req);
  if (!organizer) return Response.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, organizer.id);
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

  const pools = await getRecipientPools(params.id);
  return Response.json({
    team_members: pools.teamMembers,
    team_count: pools.teamCount,
    winners: pools.winners,
    winners_ranked: pools.winnersRanked,
  });
}
