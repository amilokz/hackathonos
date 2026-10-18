import { getDb, migrate } from '@/lib/db';
import { requireParticipant } from '@/lib/participant-auth';
import { teamHeadcount, isAlreadyOnTeam, TEAM_SIZE_CAP } from '@/lib/team-finder';
import { Container, Card, LinkButton, BrandFooter, Breadcrumb } from '@/components/ui';
import JoinByCodeButton from './JoinByCodeButton';

export const dynamic = 'force-dynamic';

type JoinState =
  | { kind: 'invalid' }
  | { kind: 'login'; teamName: string }
  | { kind: 'closed'; teamName: string }
  | { kind: 'full'; teamName: string }
  | { kind: 'already'; teamName: string; teamId: string; slug: string }
  | { kind: 'ready'; teamName: string; teamId: string; slug: string; headcount: number; code: string };

export default async function JoinByCodePage({
  params,
}: {
  params: { slug: string; code: string };
}) {
  await migrate();
  const db = getDb();
  const event = (await db.prepare('SELECT id, name, slug, status FROM events WHERE slug = ?').get(params.slug)) as
    | { id: string; name: string; slug: string; status: string }
    | undefined;

  let state: JoinState = { kind: 'invalid' };
  if (event && (event.status === 'published' || event.status === 'closed')) {
    const code = params.code.trim().toUpperCase();
    const team = (await db
      .prepare('SELECT id, name, is_open, approval_status FROM teams WHERE upper(invite_code) = ? AND event_id = ?')
      .get(code, event.id)) as
      | { id: string; name: string; is_open: number | null; approval_status: string | null }
      | undefined;

    if (team && team.approval_status === 'approved') {
      const participant = await requireParticipant();
      if (!participant) {
        state = { kind: 'login', teamName: team.name };
      } else if (!team.is_open) {
        state = { kind: 'closed', teamName: team.name };
      } else if (await isAlreadyOnTeam(team.id, participant)) {
        state = { kind: 'already', teamName: team.name, teamId: team.id, slug: event.slug };
      } else {
        const headcount = await teamHeadcount(team.id);
        state =
          headcount >= TEAM_SIZE_CAP
            ? { kind: 'full', teamName: team.name }
            : { kind: 'ready', teamName: team.name, teamId: team.id, slug: event.slug, headcount, code };
      }
    }
  }

  const eventName = event?.name ?? 'this event';
  const eventSlug = event?.slug ?? params.slug;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      <Container className="py-10">
        <Breadcrumb items={[{ label: eventName, href: `/e/${eventSlug}` }, { label: 'Join a team' }]} />
        <div className="mx-auto mt-8 max-w-lg">
          <Card className="p-6 text-center sm:p-8">
            {state.kind === 'invalid' && (
              <>
                <p className="text-4xl">🔍</p>
                <h1 className="mt-3 text-xl font-extrabold text-slate-900">Invalid invite code</h1>
                <p className="mt-2 text-sm text-slate-500">
                  We couldn&apos;t find a team with the code <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">{params.code.toUpperCase()}</code>.
                  Ask the team for a fresh code, or browse open teams instead.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <LinkButton href={`/e/${eventSlug}/teams`}>Browse open teams</LinkButton>
                  <LinkButton href={`/e/${eventSlug}`} variant="secondary">Event page</LinkButton>
                </div>
              </>
            )}

            {state.kind === 'login' && (
              <>
                <p className="text-4xl">👋</p>
                <h1 className="mt-3 text-xl font-extrabold text-slate-900">You&apos;re invited to {state.teamName}!</h1>
                <p className="mt-2 text-sm text-slate-500">
                  Log in as a participant to accept the invite and join the team.
                </p>
                <div className="mt-5">
                  <LinkButton href="/p/login">Log in as participant</LinkButton>
                </div>
              </>
            )}

            {state.kind === 'closed' && (
              <>
                <p className="text-4xl">🔒</p>
                <h1 className="mt-3 text-xl font-extrabold text-slate-900">{state.teamName} is closed</h1>
                <p className="mt-2 text-sm text-slate-500">
                  This team isn&apos;t accepting new members right now. Try the Team Finder for other open teams.
                </p>
                <div className="mt-5">
                  <LinkButton href={`/e/${eventSlug}/teams`}>Browse open teams</LinkButton>
                </div>
              </>
            )}

            {state.kind === 'full' && (
              <>
                <p className="text-4xl">🧑‍🤝‍🧑</p>
                <h1 className="mt-3 text-xl font-extrabold text-slate-900">{state.teamName} is full</h1>
                <p className="mt-2 text-sm text-slate-500">
                  This team already has {TEAM_SIZE_CAP} members — the maximum. Check out other open teams in the Team Finder.
                </p>
                <div className="mt-5">
                  <LinkButton href={`/e/${eventSlug}/teams`}>Browse open teams</LinkButton>
                </div>
              </>
            )}

            {state.kind === 'already' && (
              <>
                <p className="text-4xl">✅</p>
                <h1 className="mt-3 text-xl font-extrabold text-slate-900">You&apos;re already on {state.teamName}</h1>
                <p className="mt-2 text-sm text-slate-500">No need to join twice — see you on the team page.</p>
                <div className="mt-5">
                  <LinkButton href={`/e/${state.slug}/teams/${state.teamId}`}>View team</LinkButton>
                </div>
              </>
            )}

            {state.kind === 'ready' && (
              <>
                <p className="text-4xl">🎉</p>
                <h1 className="mt-3 text-xl font-extrabold text-slate-900">
                  You&apos;re invited to join {state.teamName}!
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  {eventName} · {state.headcount} member{state.headcount === 1 ? '' : 's'} so far
                </p>
                <div className="mt-5">
                  <JoinByCodeButton code={state.code} teamId={state.teamId} slug={state.slug} />
                </div>
                <p className="mt-4 text-xs text-slate-400">
                  Joining adds you to the team roster instantly — no approval needed.
                </p>
              </>
            )}
          </Card>
        </div>
        <div className="mt-10">
          <BrandFooter />
        </div>
      </Container>
    </div>
  );
}
