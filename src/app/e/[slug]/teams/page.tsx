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
import { Container, Card, LinkButton, BrandFooter, Breadcrumb, DsIcon } from '@/components/ui';
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

/** Small avatar circle with initials for a team. */
function TeamAvatar({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-extrabold text-white shadow-md shadow-indigo-200">
      {initials || '?'}
    </div>
  );
}

/** Small avatar dot with initials for a member. */
function MemberDot({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      title={name}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-extrabold text-indigo-700 ring-2 ring-white"
    >
      {initials || '?'}
    </span>
  );
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

        {/* ── Hero: gradient banner ── */}
        <div className="mt-4 overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 shadow-lg shadow-indigo-200">
          <div className="flex flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-10">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur">
                <DsIcon name="search" className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Team Finder</h1>
                <p className="mt-1 max-w-xl text-sm text-indigo-100">
                  These teams are open and looking for members at <strong className="text-white">{event.name}</strong>.
                  {participant ? (
                    <> You&apos;re signed in as <strong className="text-white">{participant.name}</strong> — skill matches float to the top.</>
                  ) : (
                    <>
                      {' '}<Link href="/p/login" className="font-semibold text-white underline decoration-indigo-300 underline-offset-2 hover:decoration-white">Log in as a participant</Link> to request to join a team.
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2.5 rounded-2xl bg-white/15 px-5 py-3 text-white backdrop-blur">
              <DsIcon name="users" className="h-5 w-5" />
              <div>
                <p className="text-xl font-extrabold leading-none">{teams.length}</p>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-indigo-100">
                  Open team{teams.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {isClosed && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800">
            <DsIcon name="flag" className="h-5 w-5 shrink-0 text-amber-500" />
            <span>This hackathon has ended — the Team Finder is read-only now.</span>
          </div>
        )}

        {teams.length === 0 ? (
          <Card className="mt-8 p-10 text-center sm:p-14">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50 text-indigo-400">
              <DsIcon name="users" className="h-10 w-10" />
            </div>
            <p className="mt-4 text-lg font-bold text-slate-900">No open teams right now</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              Every registered team is full or closed at the moment. Check back soon — or start your own team.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {!isClosed && <LinkButton href={`/e/${event.slug}/register`}>Register your team</LinkButton>}
              <LinkButton href={`/e/${event.slug}`} variant="secondary">Back to event</LinkButton>
            </div>
          </Card>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {teams.map((t) => (
              <Card
                key={t.id}
                className="flex flex-col p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-100 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <TeamAvatar name={t.name} />
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900">{t.name}</h2>
                      <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                        <DsIcon name="users" className="h-3.5 w-3.5" />
                        {t.headcount} member{t.headcount === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {t.matched && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-indigo-200">
                        <DsIcon name="sparkles" className="h-3.5 w-3.5" />
                        Matches your skills
                      </span>
                    )}
                    {t.isMember && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
                        <DsIcon name="check" className="h-3.5 w-3.5" />
                        You&apos;re on this team
                      </span>
                    )}
                  </div>
                </div>

                {t.looking_for.trim() && (
                  <div className="mt-4 rounded-xl border-l-4 border-indigo-500 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
                    <span className="font-bold">Looking for:</span> {t.looking_for}
                  </div>
                )}

                {t.members.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Members</p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {t.members.map((m, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-full bg-slate-50 py-1 pl-1 pr-3 ring-1 ring-slate-100"
                        >
                          <MemberDot name={m.name} />
                          <div className="leading-tight">
                            <p className="text-sm font-semibold text-slate-800">{m.name}</p>
                            {m.skills.length > 0 && (
                              <p className="text-[11px] font-medium text-slate-400">
                                {m.skills.slice(0, 3).join(' · ')}
                                {m.skills.length > 3 ? ` +${m.skills.length - 3}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                  {isClosed ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                      <DsIcon name="clock" className="h-4 w-4" />
                      Hackathon ended
                    </span>
                  ) : t.isMember ? (
                    <Link href={`/e/${event.slug}/teams/${t.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline">
                      View team <DsIcon name="chevronRight" className="h-4 w-4" />
                    </Link>
                  ) : t.hasPendingRequest ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
                      <DsIcon name="clock" className="h-3.5 w-3.5" />
                      Request pending
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
