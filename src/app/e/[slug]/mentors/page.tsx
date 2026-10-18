import { notFound } from 'next/navigation';
import { getDb, migrate } from '@/lib/db';
import { Container, Card, LinkButton, BrandFooter, Breadcrumb } from '@/components/ui';
import MentorBookingList from './MentorBookingList';

export const dynamic = 'force-dynamic';

export default async function MentorsPublicPage({ params }: { params: { slug: string } }) {
  await migrate();
  const db = getDb();
  const event = (await db.prepare('SELECT id, name, slug, status FROM events WHERE slug = ?').get(params.slug)) as
    | { id: string; name: string; slug: string; status: string }
    | undefined;
  if (!event || (event.status !== 'published' && event.status !== 'closed')) notFound();
  const isClosed = event.status === 'closed';

  const mentors = (await db
    .prepare('SELECT id, name, expertise, bio FROM mentors WHERE event_id = ? ORDER BY created_at')
    .all(event.id)) as Array<{
    id: string;
    name: string;
    expertise: string | null;
    bio: string | null;
  }>;

  const view = [];
  for (const m of mentors) {
    const slots = (await db
      .prepare(
        'SELECT id, start_time, end_time, is_booked FROM mentor_slots WHERE mentor_id = ? ORDER BY start_time'
      )
      .all(m.id)) as Array<{ id: string; start_time: string; end_time: string; is_booked: number }>;
    view.push({
      id: m.id,
      name: m.name,
      expertise: m.expertise ?? '',
      bio: m.bio ?? '',
      slots: slots.map((s) => ({
        id: s.id,
        start_time: s.start_time,
        end_time: s.end_time,
        is_booked: Number(s.is_booked) === 1,
      })),
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      <Container className="py-10">
        <Breadcrumb items={[{ label: event.name, href: `/e/${event.slug}` }, { label: 'Mentors' }]} />
        <div className="mt-4 max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">🎓 Mentor sessions</h1>
          <p className="mt-2 text-slate-600">
            Book a 1-on-1 session with a mentor at <strong>{event.name}</strong>. Tap a free
            slot, then enter your team code to confirm.
          </p>
        </div>

        {isClosed && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800">
            🏁 This hackathon has ended — mentor booking is read-only now.
          </div>
        )}

        {view.length === 0 ? (
          <Card className="mt-8 p-10 text-center">
            <p className="text-4xl">🎓</p>
            <p className="mt-3 text-lg font-bold text-slate-900">No mentors yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              The organizers haven&apos;t announced any mentors for this hackathon. Check back soon.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <LinkButton href={`/e/${event.slug}`} variant="secondary">
                Back to event
              </LinkButton>
            </div>
          </Card>
        ) : isClosed ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {view.map((m) => (
              <Card key={m.id} className="p-5 sm:p-6">
                <h2 className="text-lg font-extrabold text-slate-900">{m.name}</h2>
                {m.bio.trim() && <p className="mt-2 text-sm text-slate-600">{m.bio}</p>}
              </Card>
            ))}
          </div>
        ) : (
          <div className="mt-8">
            <MentorBookingList slug={event.slug} mentors={view} />
          </div>
        )}

        <div className="mt-10">
          <BrandFooter />
        </div>
      </Container>
    </div>
  );
}
