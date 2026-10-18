import { redirect } from 'next/navigation';
import { getDb, migrate } from '@/lib/db';
import { requireParticipant } from '@/lib/participant-auth';
import { Container, PageHeader, Card, LinkButton } from '@/components/ui';
import ProfileForm from './ProfileForm';
import SignOutButton from './SignOutButton';

interface TeamRow {
  id: string;
  name: string;
  approval_status: string;
  checkin_code: string;
  event_name: string;
  event_slug: string;
  member_count: number;
}

export default async function ParticipantPortalPage() {
  const participant = await requireParticipant();
  if (!participant) redirect('/p/login');

  await migrate();
  const db = getDb();

  const teams = (await db
    .prepare(
      `SELECT t.id, t.name, t.approval_status, t.checkin_code,
              e.name AS event_name, e.slug AS event_slug,
              COUNT(tm.id) AS member_count
       FROM teams t
       JOIN events e ON e.id = t.event_id
       LEFT JOIN team_members tm ON tm.team_id = t.id
       WHERE t.id IN (
         SELECT team_id FROM team_members
         WHERE participant_id = ? OR LOWER(email) = LOWER(?)
       )
       GROUP BY t.id
       ORDER BY t.created_at DESC`,
    )
    .all(participant.id, participant.email)) as TeamRow[];

  const eventMap = new Map<string, { name: string; slug: string }>();
  for (const t of teams) {
    eventMap.set(t.event_slug, { name: t.event_name, slug: t.event_slug });
  }
  const events = Array.from(eventMap.values());
  const passes = teams.filter((t) => t.checkin_code && t.checkin_code.trim() !== '');

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <Container className="flex h-16 items-center justify-between">
          <p className="text-lg font-extrabold tracking-tight text-slate-900">
            Hackathon<span className="text-indigo-600">OS</span>
            <span className="ml-2 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700">
              Participant portal
            </span>
          </p>
          <div className="flex items-center gap-3">
            <p className="hidden text-sm text-slate-500 sm:block">
              Signed in as <span className="font-semibold text-slate-700">{participant.name}</span>
            </p>
            <SignOutButton />
          </div>
        </Container>
      </header>

      <Container className="py-8">
        <PageHeader
          title={`Hey, ${participant.name.split(' ')[0]} 👋`}
          subtitle="Your hackathons, teams and entry passes — all in one place."
        />

        {teams.length === 0 && (
          <Card className="p-8 text-center">
            <p className="font-semibold text-slate-700">You&apos;re not on any team yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              Register for a hackathon and your team will show up here. Already registered with this
              email? Your memberships link automatically.
            </p>
            <div className="mt-4">
              <LinkButton href="/">Browse hackathons</LinkButton>
            </div>
          </Card>
        )}

        {teams.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* My Hackathons */}
            <Card className="p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">My Hackathons</h2>
              <ul className="mt-3 space-y-2">
                {events.map((e) => (
                  <li key={e.slug}>
                    <a
                      href={`/e/${e.slug}`}
                      className="block rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-indigo-200 hover:bg-indigo-50"
                    >
                      {e.name}
                    </a>
                  </li>
                ))}
              </ul>
            </Card>

            {/* My Teams */}
            <Card className="p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">My Teams</h2>
              <ul className="mt-3 space-y-3">
                {teams.map((t) => (
                  <li key={t.id} className="rounded-lg border border-slate-100 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900">{t.name}</p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          t.approval_status === 'approved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : t.approval_status === 'pending'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {t.approval_status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {t.event_name} · {Number(t.member_count)} member{Number(t.member_count) === 1 ? '' : 's'}
                    </p>
                    {t.checkin_code ? (
                      <a
                        href={`/e/${t.event_slug}/pass/${t.id}?code=${encodeURIComponent(t.checkin_code)}`}
                        className="mt-1.5 inline-block text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        Open my pass →
                      </a>
                    ) : (
                      <a
                        href={`/e/${t.event_slug}`}
                        className="mt-1.5 inline-block text-xs font-semibold text-slate-500 hover:underline"
                      >
                        View event →
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </Card>

            {/* My Passes */}
            <Card className="p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">My Passes</h2>
              {passes.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  No entry passes yet — they appear here once your organizer issues check-in codes.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {passes.map((t) => (
                    <li key={t.id}>
                      <a
                        href={`/e/${t.event_slug}/pass/${t.id}?code=${encodeURIComponent(t.checkin_code)}`}
                        className="block rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                      >
                        🎟 {t.name} — {t.event_name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}

        {/* Profile */}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Card className="p-6 lg:col-span-2">
            <h2 className="text-lg font-bold text-slate-900">My profile</h2>
            <p className="mt-1 text-sm text-slate-500">
              This is what organizers and potential teammates see.
            </p>
            <div className="mt-5">
              <ProfileForm participant={participant} />
            </div>
          </Card>
          <Card className="h-fit p-6">
            <h2 className="text-lg font-bold text-slate-900">Skills</h2>
            {participant.skills ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {participant.skills
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700"
                    >
                      {s}
                    </span>
                  ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No skills listed yet.</p>
            )}
            {participant.bio && (
              <>
                <h2 className="mt-6 text-lg font-bold text-slate-900">Bio</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{participant.bio}</p>
              </>
            )}
          </Card>
        </div>
      </Container>
    </div>
  );
}
