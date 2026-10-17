import { redirect } from 'next/navigation';
import { requireOrganizer, getOwnedEvent } from '@/lib/require-organizer';
import { migrate } from '@/lib/db';
import SponsorsClient from './SponsorsClient';

export const dynamic = 'force-dynamic';

export default async function SponsorsPage({ params }: { params: { id: string } }) {
  await migrate();
  const organizer = await requireOrganizer();
  if (!organizer) redirect('/login');
  const event = await getOwnedEvent(params.id, organizer.id) as { name: string } | null;
  if (!event) redirect('/dashboard');

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <a href={`/dashboard/events/${params.id}`} className="text-sm text-zinc-500 hover:underline">
        ← Back to event
      </a>
      <h1 className="mt-2 text-2xl font-bold">Sponsors — {event.name}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Sponsors are shown on the public event page, grouped by tier.
      </p>
      <div className="mt-6">
        <SponsorsClient eventId={params.id} />
      </div>
    </div>
  );
}
