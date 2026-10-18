import { Card } from '@/components/ui';
import EmptyState from '@/components/EmptyState';
import { timeAgo } from '@/lib/format';
import type { ActivityType } from '@/lib/activity';

export interface ActivityEntry {
  id: string;
  type: ActivityType | string;
  message: string;
  created_at: string;
}

const ACTIVITY_ICONS: Record<string, string> = {
  team_registered: '👥',
  project_submitted: '🚀',
  score_completed: '⚖️',
  checkin: '✅',
  announcement: '📢',
};

/** Tinted icon square per activity type, in the app's color language. */
const ACTIVITY_TINTS: Record<string, string> = {
  team_registered: 'bg-indigo-100',
  project_submitted: 'bg-emerald-100',
  score_completed: 'bg-amber-100',
  checkin: 'bg-sky-100',
  announcement: 'bg-violet-100',
};

const ACTIVITY_LABELS: Record<string, string> = {
  team_registered: 'Team registered',
  project_submitted: 'Project submitted',
  score_completed: 'Judging',
  checkin: 'Check-in',
  announcement: 'Announcement',
};

/** Full-width activity feed: the latest activity across the organizer's events. */
export default function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  return (
    <Card className="p-6 transition hover:shadow-md">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight text-slate-900">📡 Activity feed</h2>
        {entries.length > 0 && (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">
            {entries.length} latest
          </span>
        )}
      </div>
      {entries.length === 0 ? (
        <EmptyState
          icon="📡"
          title="No activity yet"
          description="Registrations, submissions, scores, check-ins and announcements will be logged here automatically."
          compact
        />
      ) : (
        <ul className="divide-y divide-slate-100">
          {entries.map((a) => (
            <li key={a.id} className="flex items-start gap-3.5 py-3.5 first:pt-0 last:pb-0">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${
                  ACTIVITY_TINTS[a.type] ?? 'bg-slate-100'
                }`}
                aria-hidden="true"
              >
                {ACTIVITY_ICONS[a.type] ?? '•'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">{a.message}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {ACTIVITY_LABELS[a.type] ?? a.type} · {timeAgo(a.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
