import { notFound } from 'next/navigation';
import { getDb, migrate } from '@/lib/db';
import { ensureAnnouncementColumns, type AnnouncementRow } from '@/lib/announcement-columns';
import { Container, Card, BrandFooter } from '@/components/ui';
import AnnouncementBadge from '@/components/AnnouncementBadge';
import type { EventRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * GET /e/[slug]/announcements — public page listing every announcement,
 * pinned first then newest, with type badges (info / deadline / winner).
 */
export default async function EventAnnouncementsPage({ params }: { params: { slug: string } }) {
  await migrate();
  await ensureAnnouncementColumns();
  const db = getDb();

  const event = (await db.prepare('SELECT * FROM events WHERE slug = ?').get(params.slug)) as
    | EventRow
    | undefined;
  if (!event || (event.status !== 'published' && event.status !== 'closed')) notFound();

  const announcements = (await db
    .prepare(
      'SELECT id, title, message, type, pinned, created_at FROM announcements WHERE event_id = ? ORDER BY pinned DESC, created_at DESC, rowid DESC'
    )
    .all(event.id)) as AnnouncementRow[];

  return (
    <div className="min-h-screen bg-slate-50">
      <Container className="py-10">
        <div className="mx-auto max-w-3xl">
          <a
            href={`/e/${event.slug}`}
            className="text-sm font-semibold text-indigo-600 hover:underline"
          >
            ← Back to {event.name}
          </a>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            📢 Announcements
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {event.name} · {announcements.length} total
          </p>

          {announcements.length === 0 ? (
            <Card className="mt-6 p-8 text-center">
              <p className="text-slate-500">No announcements yet — check back soon.</p>
            </Card>
          ) : (
            <div className="mt-6 space-y-4">
              {announcements.map((a) => (
                <Card key={a.id} className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    {a.pinned === 1 && (
                      <span className="text-sm" aria-label="Pinned">
                        📌
                      </span>
                    )}
                    <AnnouncementBadge type={a.type} />
                    <span className="text-xs text-slate-400">
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                  </div>
                  {a.title && <h2 className="mt-2 text-lg font-bold text-slate-900">{a.title}</h2>}
                  <p className="mt-1 leading-relaxed text-slate-700">{a.message}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Container>
      <BrandFooter
        whiteLabel={Boolean(event.white_label)}
        customText={event.custom_footer_text}
      />
    </div>
  );
}
