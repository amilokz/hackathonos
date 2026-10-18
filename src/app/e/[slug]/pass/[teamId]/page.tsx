import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { getDb, migrate } from '@/lib/db';
import { ensureCheckinCode } from '@/lib/checkin-code';
import { parseMembers } from '@/lib/checkin-auth';
import { Container, Card, BrandFooter } from '@/components/ui';
import { formatDate } from '@/lib/format';
import type { EventRow, TeamRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Team Pass · HackathonOS' };

export default async function TeamPassPage({
  params,
  searchParams,
}: {
  params: { slug: string; teamId: string };
  searchParams: { code?: string };
}) {
  await migrate();
  const db = getDb();

  const event = (await db.prepare('SELECT * FROM events WHERE slug = ?').get(params.slug)) as
    | EventRow
    | undefined;
  // Only published/closed events expose passes (same visibility as the public page).
  if (!event || (event.status !== 'published' && event.status !== 'closed')) notFound();

  const team = (await db
    .prepare('SELECT * FROM teams WHERE id = ? AND event_id = ?')
    .get(params.teamId, event.id)) as TeamRow | undefined;
  if (!team) notFound();

  // Lazily generate the code, then require it — the pass link itself is the credential.
  const code = await ensureCheckinCode(team.id);
  const provided = (searchParams.code ?? '').trim().toUpperCase();

  const dates = [formatDate(event.start_date), formatDate(event.end_date)].filter(Boolean).join(' → ');
  const members = parseMembers(team.members_json);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-indigo-700 py-4 text-center text-sm font-semibold tracking-wide text-indigo-100">
        🎟️ HackathonOS Team Pass
      </div>
      <Container className="py-10">
        <div className="mx-auto max-w-md">
          {provided !== code ? (
            <Card className="p-8 text-center">
              <p className="text-4xl">🔒</p>
              <h1 className="mt-3 text-xl font-extrabold text-slate-900">This pass link is incomplete</h1>
              <p className="mt-2 text-sm text-slate-600">
                Your team pass link includes a private check-in code. Ask your organizer for your full
                pass link — they can share it from the team registration.
              </p>
              <p className="mt-4 text-xs text-slate-400">
                {event.name} · {team.name}
              </p>
            </Card>
          ) : (
            <PassCard event={event} team={team} code={code} dates={dates} members={members} />
          )}
        </div>
        <BrandFooter />
      </Container>
    </div>
  );
}

async function PassCard({
  event,
  team,
  code,
  dates,
  members,
}: {
  event: EventRow;
  team: TeamRow;
  code: string;
  dates: string;
  members: string[];
}) {
  // QR encodes the check-in code itself — the organizer scans/types it on the check-in page.
  const qrDataUrl = await QRCode.toDataURL(code, {
    width: 560,
    margin: 2,
    color: { dark: '#1e1b4b', light: '#ffffff' },
  });

  return (
    <Card className="overflow-hidden print:shadow-none">
      <div className="bg-indigo-700 px-6 py-6 text-center text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200">Team Pass</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{event.name}</h1>
        {dates && <p className="mt-1 text-sm text-indigo-200">📅 {dates}</p>}
      </div>
      <div className="px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Team</p>
        <h2 className="mt-0.5 text-xl font-extrabold text-slate-900">{team.name}</h2>

        {members.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Members · {members.length}
            </p>
            <ul className="mt-1.5 space-y-1">
              {members.map((m) => (
                <li key={m} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  {m}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt={`Check-in QR code for ${team.name}`}
            className="mx-auto h-56 w-56"
          />
          <p className="mt-3 font-mono text-2xl font-extrabold tracking-[0.2em] text-indigo-900">
            {code}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Show this QR at the check-in desk
          </p>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
          <p className="flex justify-between">
            <span className="font-semibold text-slate-400">Event</span>
            <span className="font-medium text-slate-700">{event.slug}</span>
          </p>
          <p className="mt-1 flex justify-between">
            <span className="font-semibold text-slate-400">Team</span>
            <span className="font-medium text-slate-700">{team.name}</span>
          </p>
        </div>
      </div>
    </Card>
  );
}
