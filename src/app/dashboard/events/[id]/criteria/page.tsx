import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { requireOrganizer, getOwnedEvent } from '@/lib/require-organizer';
import CriteriaManager from './CriteriaManager';

export default async function CriteriaPage({ params }: { params: { id: string } }) {
  const org = await requireOrganizer();
  if (!org) redirect('/login');
  const event = await getOwnedEvent(params.id, org.id);
  if (!event) redirect('/dashboard');

  const criteria = await getDb()
    .prepare('SELECT id, name, weight, description FROM criteria WHERE event_id = ? ORDER BY rowid')
    .all(params.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto pt-6 px-6">
        <a href={`/dashboard/events/${params.id}`} className="text-sm text-blue-600 hover:underline">
          ← Back to {event.name}
        </a>
      </div>
      <CriteriaManager eventId={params.id} initial={criteria as never} />
    </div>
  );
}
