import { notFound } from 'next/navigation';
import { getDb, migrate } from '@/lib/db';
import { requireParticipant } from '@/lib/participant-auth';
import { requireOrganizer, getOwnedEvent } from '@/lib/require-organizer';
import {
  getTeamMembers,
  getLegacyMemberNames,
  getMemberSkills,
  TEAM_SIZE_CAP,
} from '@/lib/team-finder';
import { Container, Card, LinkButton, BrandFooter, Breadcrumb } from '@/components/ui';
import TeamRequests from './TeamRequests';

export const dynamic = 'force-dynamic';

export default async function TeamDetailPage({
  params,
}: {
  params: { slug: string; teamId: string };
}) {
  await migrate();
  const db = getDb();
  const event = (await db.prepare('SELECT id, name, slug, status FROM events WHERE slug = ?').get(params.slug)) as
    | { id: string; name: string; slug: string; status: string }
    | undefined;
  if (!event || (event.status !== 'published' && event.status !== 'closed')) notFound();

  const team = (await db
    .prepare(
      `SELECT id, name, contact_name, contact_email, looking_for, is_open, approval_status, invite_code, created_at
       FROM teams WHERE id = ? AND event_id = ?`,
    )
    .get(params.teamId, event.id)) as
    | {
        id: string;
        name: string;
        contact_name: string | null;
        contact_email: string | null;
        looking_for: string | null;
        is_open: number | null;
        approval_status: string | null;
        invite_code: string | null;
        created_at: string;
      }
    | undefined;
  if (!team || team.approval_status !== 'approved') notFound();

  const [structured, legacy, skillMap] = await Promise.all([
    getTeamMembers(team.id),
    getLegacyMemberNames(team.id),
    getMemberSkills(team.id),
  ]);
  const members = [
    ...structured.map((m) => ({ id: m.id, name: m.name, skills: skillMap.get(m.id) ?? [] })),
    ...legacy.map((n, i) => ({ id: `legacy-${i}`, name: n, skills: [] as string[] })),
  ];

  // Viewer role: organizer of this event, or a rostered participant.
  let viewerRole: 'organizer' | 'member' | null = null;
  const [org, participant] = await Promise.all([requireOrganizer(), requireParticipant()]);
  if (org && (await getOwnedEvent(event.id, org.id))) {
    viewerRole = 'organizer';
  } else if (participant) {
    const myEmail = participant.email.trim().toLowerCase();
    const mine = structured.some(
      (m) => m.participant_id === participant.id || (myEmail && (m.email ?? '').toLowerCase() === myEmail),
    );
    if (mine) viewerRole = 'member';
  }

  const pendingRequests =
    viewerRole === null
      ? []
      : ((await db
          .prepare(
            `SELECT jr.id, jr.message, jr.created_at, p.id AS participant_id, p.name, p.email, p.skills
             FROM join_requests jr JOIN participants p ON p.id = jr.participant_id
             WHERE jr.team_id = ? AND jr.status = 'pending'
             ORDER BY jr.created_at ASC`,
          )
          .all(team.id)) as {
          id: string;
          message: string | null;
          created_at: string;
          participant_id: string;
          name: string;
          email: string;
          skills: string | null;
        }[]);

  const spotsLeft = Math.max(0, TEAM_SIZE_CAP - members.length);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      <Container className="py-10">
        <Breadcrumb
          items={[
            { label: event.name, href: `/e/${event.slug}` },
            { label: 'Find a team', href: `/e/${event.slug}/teams` },
            { label: team.name },
          ]}
        />

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{team.name}</h1>
            <p className="mt-1.5 flex flex-wrap gap-2 text-sm text-slate-500">
              <span className="rounded-full bg-white px-3 py-1 font-medium shadow-sm">
                👥 {members.length} member{members.length === 1 ? '' : 's'}
              </span>
              {team.is_open ? (
                <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700 shadow-sm">
                  🟢 Open to new members
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-500 shadow-sm">
                  🔒 Closed
                </span>
              )}
              {spotsLeft > 0 ? (
                <span className="rounded-full bg-white px-3 py-1 font-medium shadow-sm">
                  {spotsLeft} spot{spotsLeft === 1 ? '' : 's'} left
                </span>
              ) : (
                <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700 shadow-sm">
                  Team full
                </span>
              )}
            </p>
          </div>
          <LinkButton href={`/e/${event.slug}/teams`} variant="secondary">
            ← All open teams
          </LinkButton>
        </div>

        {team.looking_for?.trim() && (
          <Card className="mt-6 border-indigo-100 bg-indigo-50 p-5">
            <p className="text-sm text-indigo-900">
              <span className="font-bold">Looking for:</span> {team.looking_for}
            </p>
          </Card>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">Members</h2>
            {members.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No members listed yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {members.map((m) => (
                  <li key={m.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="font-semibold text-slate-900">{m.name}</p>
                    {m.skills.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {m.skills.map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="space-y-6">
            {viewerRole !== null && (
              <Card className="p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">Join requests</h2>
                  {pendingRequests.length > 0 && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                      {pendingRequests.length} pending
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {viewerRole === 'organizer'
                    ? 'As the organizer you can accept or reject requests.'
                    : 'As a team member you can accept or reject requests.'}
                </p>
                <TeamRequests teamId={team.id} requests={pendingRequests} />
              </Card>
            )}

            {viewerRole === null && team.is_open && event.status === 'published' && (
              <Card className="p-5 sm:p-6">
                <h2 className="text-lg font-bold text-slate-900">Want to join this team?</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {participant
                    ? 'Send a join request — the team will review it.'
                    : 'Log in as a participant to request to join.'}
                </p>
                <div className="mt-3">
                  {participant ? (
                    <LinkButton href={`/e/${event.slug}/teams`}>Request via Team Finder</LinkButton>
                  ) : (
                    <LinkButton href="/p/login">Log in as participant</LinkButton>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>

        <div className="mt-10">
          <BrandFooter />
        </div>
      </Container>
    </div>
  );
}
