import { redirect } from 'next/navigation';
import { requireOrganizer, getOwnedEvent } from '@/lib/require-organizer';
import { migrate } from '@/lib/db';
import CertificatesClient from './CertificatesClient';

export const dynamic = 'force-dynamic';

export default async function CertificatesPage({ params }: { params: { id: string } }) {
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
      <h1 className="mt-2 text-2xl font-bold">Certificates — {event.name}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Generate printable, QR-verified certificates. Recipients can verify at{' '}
        <span className="font-mono">/verify/&lt;code&gt;</span>.
      </p>
      <div className="mt-6">
        <CertificatesClient eventId={params.id} />
      </div>
    </div>
  );
}
