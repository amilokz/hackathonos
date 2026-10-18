import { NextRequest, NextResponse } from 'next/server';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';
import { computeResults } from '@/lib/results';

/**
 * Ranked results for an event (organizer only).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const org = await requireOrganizerFromRequest(req);
  if (!org) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, org.id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const results = await computeResults(params.id);
  return NextResponse.json({ event: { id: event.id, name: event.name, slug: event.slug }, results });
}
