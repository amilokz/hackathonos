import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getDb, migrate } from '@/lib/db';
import { requireParticipant } from '@/lib/participant-auth';
import {
  getTeamMembers,
  getLegacyMemberNames,
  getMemberSkills,
  parseSkills,
  matchesSkills,
} from '@/lib/team-finder';
import { Container, Card, LinkButton, BrandFooter, Breadcrumb } from '@/components/ui';
import RequestJoinButton from './RequestJoinButton';

export const dynamic = 'force-dynamic';

interface FinderTeam {
  id: string;
  name: string;
  looking_for: string;
  headcount: number;
  matched: boolean;
  isMember: boolean;
  hasPendingRequest: boolean;
  members: { name: string; skills: string[] }[];
}

export default async function TeamFinderPage({ params }: { params: { slug: string } }) {
  await migrate();
  const db = getDb();
  const event = (await db.prepare('SELECT id, name, slug, status FROM events WHERE slug = ?').get(params.slug)) as
    | { id: string; name: string; slug: string; status: string }
    | undefined;
  if (!event || (event.status !== 'published' && event.status !== 'closed')) notFound();
  const isClosed = event.status === 'closed';

  const participant = await requireParticipant();
  const mySkills = parseSkills(participant?.skills);
  const myId = participant?.id ?? null;
  const myEmail = (participant?.email ?? '').trim().toLowerCase();

  const rows = (await db
    .prepare(
      `SELECT id, name, looking_for, members_json, created_at
       FROM teams
       WHERE event_id = ? AND is_open = 1 AND approval_status = 'approved'
       ORDER BY created_at DESC`,
    )
    .all(event.id)) as {
    id: string;
    name: string;
    looking_for: string | null;
    members_json: string | null;
    created_at: string;
  }[];

  const teams: FinderTeam[] = [];
  for (const t of rows) {
    const [structured, legacy, skillMap] = await Promise.all([
      getTeamMembers(t.id),
      getLegacyMemberNames(t.id),
      getMemberSkills(t.id),
    ]);
    const members = [
      ...structured.map((m) => ({ name: m.name, skills: skillMap.get(m.id) ?? [] })),
      ...legacy.map((n) => ({ name: n, skills: [] as string[] })),
    ];
    const isMember =
      !!myId &&
      (structured.some((m) => m.participant_id === myId || (myEmail && m.email?.toLowerCase() === myEmail)));
    let hasPendingRequest = false;
    if (myId && !isMember) {
      const pr = await db
        .prepare("SELECT id FROM join_requests WHERE team_id = ? AND participant_id = ? AND status = 'pending'")
        .get(t.id, myId);
      hasPendingRequest = !!pr;
    }
    teams.push({
      id: t.id,
      name: t.name,
      looking_for: t.looking_for ?? '',
      headcount: members.length,
      matched: !isClosed && matchesSkills(t.looking_for, mySkills),
      isMember,
      hasPendingRequest,
      members,
    });
  }
  teams.sort((a, b) => Number(b.matched) - Number(a.matched));

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      <Container className="py-10">
        <Breadcrumb items={[{ label: event.name, href: `/e/${event.slug}` }, { label: 'Find a team' }]} />
        <div className="mt-4 max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">🔍 Team Finder</h1>
          <p className="mt-2 text-slate-600">
            These teams are open and looking for members at <strong>{event.name}</strong>.
            {participant ? (
              <> You&apos;re signed in as <strong>{participant.name}</strong> — teams matching your skills float to the top.</>
            ) : (
              <>
                {' '}<Link href="/p/login" className="font-semibold text-indigo-600 hover:underline">Log in as a participant</Link> to request to join a team.
              </>
            )}
          </p>
        </div>

        {isClosed && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800">
            🏁 This hackathon has ended — the Team Finder is read-only now.
          </div>
        )}

        {teams.length === 0 ? (
          <Card className="mt-8 p-10 text-center">
            <p className="text-4xl">👥</p>
            <p className="mt-3 text-lg font-bold text-slate-900">No open teams right now</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              Every registered team is full or closed at the moment. Check back soon — or start your own team.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {!isClosed && <LinkButton href={`/e/${event.slug}/register`}>Register your team</LinkButton>}
              <LinkButton href={`/e/${event.slug}`} variant="secondary">Back to event</LinkButton>
            </div>
          </Card>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {teams.map((t) => (
              <Card key={t.id} className="flex flex-col p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">{t.name}</h2>
                    <p className="mt-0.5 text-xs font-medium text-slate-400">
                      👥 {t.headcount} member{t.headcount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {t.matched && (
                      <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700">
                        ✨ Matches your skills
                      </span>
                    )}
                    {t.isMember && (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        ✓ You&apos;re on this team
                      </span>
                    )}
                  </div>
                </div>

                {t.looking_for.trim() && (
                  <p className="mt-3 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
                    <span className="font-bold">Looking for:</span> {t.looking_for}
                  </p>
                )}

                {t.members.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Members</p>
                    <ul className="mt-2 space-y-1.5">
                      {t.members.map((m, i) => (
                        <li key={i} className="text-sm text-slate-700">
                          <span className="font-semibold">{m.name}</span>
                          {m.skills.length > 0 && (
                            <span className="ml-2 text-xs text-slate-400">{m.skills.join(' · ')}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                  {isClosed ? (
                    <span className="text-xs text-slate-400">Hackathon ended</span>
                  ) : t.isMember ? (
                    <Link href={`/e/${event.slug}/teams/${t.id}`} className="text-sm font-semibold text-indigo-600 hover:underline">
                      View team →
                    </Link>
                  ) : t.hasPendingRequest ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
                      ⏳ Request pending
                    </span>
                  ) : participant ? (
                    <RequestJoinButton teamId={t.id} teamName={t.name} />
                  ) : (
                    <LinkButton href="/p/login" variant="secondary">
                      Log in to request
                    </LinkButton>
                  )}
                  <Link href={`/e/${event.slug}/teams/${t.id}`} className="text-sm font-medium text-slate-400 hover:text-indigo-600">
                    Details
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-10">
          <BrandFooter />
        </div>
      </Container>
    </div>
  );
}
