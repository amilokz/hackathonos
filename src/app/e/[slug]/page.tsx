import { notFound } from 'next/navigation';
import { getDb, migrate } from '@/lib/db';
import { Container, Card, LinkButton, BrandFooter } from '@/components/ui';
import type { EventRow, SponsorRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function PublicEventPage({ params }: { params: { slug: string } }) {
  await migrate();
  const db = getDb();
  const event = await db.prepare('SELECT * FROM events WHERE slug = ?').get(params.slug) as EventRow | undefined;
  if (!event || event.status !== 'published') notFound();

  const sponsors = await db
    .prepare("SELECT * FROM sponsors WHERE event_id = ? ORDER BY CASE tier WHEN 'platinum' THEN 0 WHEN 'gold' THEN 1 WHEN 'silver' THEN 2 ELSE 3 END")
    .all(event.id) as SponsorRow[];

  const teams = (await db.prepare('SELECT COUNT(*) AS c FROM teams WHERE event_id = ?').get(event.id) as { c: number }).c;

  const dates = [formatDate(event.start_date), formatDate(event.end_date)].filter(Boolean).join(' → ');

  return (
    <div className="min-h-screen bg-slate-50">
      <Container className="py-12">
        <div className="mx-auto max-w-3xl text-center">
          {event.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.logo_url} alt={`${event.name} logo`} className="mx-auto mb-6 h-20 w-20 rounded-2xl object-cover" />
          )}
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">{event.name}</h1>
          {event.description && <p className="mx-auto mt-4 max-w-2xl text-slate-600">{event.description}</p>}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm">
            {dates && <span className="rounded-full bg-white px-3 py-1.5 font-medium text-slate-600 shadow-sm">📅 {dates}</span>}
            <span className="rounded-full bg-white px-3 py-1.5 font-medium text-slate-600 shadow-sm">👥 {teams} teams registered</span>
            {event.entry_fee > 0 ? (
              <span className="rounded-full bg-white px-3 py-1.5 font-medium text-slate-600 shadow-sm">🎟️ Entry: {event.entry_fee}</span>
            ) : (
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700 shadow-sm">🎟️ Free entry</span>
            )}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <LinkButton href={`/e/${event.slug}/register`}>Register your team</LinkButton>
            <LinkButton href={`/e/${event.slug}/submit`} variant="secondary">Submit project</LinkButton>
            <LinkButton href={`/e/${event.slug}/leaderboard`} variant="secondary">View leaderboard</LinkButton>
          </div>
        </div>

        {sponsors.length > 0 && (
          <div className="mx-auto mt-14 max-w-3xl">
            <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-slate-400">Sponsors</h2>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
              {sponsors.map((s) => (
                <Card key={s.id} className="flex items-center gap-3 px-5 py-3">
                  {s.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.logo_url} alt={s.name} className="h-8 w-auto object-contain" />
                  ) : (
                    <span className="font-bold text-slate-700">{s.name}</span>
                  )}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-500">{s.tier}</span>
                </Card>
              ))}
            </div>
          </div>
        )}
      </Container>
      <BrandFooter />
    </div>
  );
}
