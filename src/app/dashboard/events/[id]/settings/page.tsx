import { redirect } from 'next/navigation';
import { requireOrganizer, getOwnedEvent } from '@/lib/require-organizer';
import { migrate } from '@/lib/db';
import SettingsClient from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({ params }: { params: { id: string } }) {
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
      <h1 className="mt-2 text-2xl font-bold">Event settings — {event.name}</h1>
      <p className="mt-1 text-sm text-zinc-500">Entry fees, payments and white-label branding.</p>
      <div className="mt-6">
        <SettingsClient eventId={params.id} />
      </div>
    </div>
  );
}
