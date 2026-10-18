import { Card, DsIcon } from '@/components/ui';
import EmptyState from '@/components/EmptyState';
import { SectionHeader, type DashIconName, type ChipTint } from './icons';
import { IconChip } from './icons';
import { timeAgo } from '@/lib/format';
import type { ActivityType } from '@/lib/activity';

export interface ActivityEntry {
  id: string;
  type: ActivityType | string;
  message: string;
  created_at: string;
}

/** SVG icon per activity type, in the app's color language. */
const ACTIVITY_ICONS: Record<string, { icon: DashIconName; tint: ChipTint }> = {
  team_registered: { icon: 'users', tint: 'indigo' },
  project_submitted: { icon: 'rocket', tint: 'emerald' },
  score_completed: { icon: 'scale', tint: 'amber' },
  checkin: { icon: 'check', tint: 'sky' },
  announcement: { icon: 'message', tint: 'violet' },
};

const ACTIVITY_LABELS: Record<string, string> = {
  team_registered: 'Team registered',
  project_submitted: 'Project submitted',
  score_completed: 'Judging',
  checkin: 'Check-in',
  announcement: 'Announcement',
};

/** Full-width activity feed: the latest activity across the organizer's events. */
export default function ActivityFeed({ entries, total }: { entries: ActivityEntry[]; total: number }) {
  return (
    <Card className="p-6 transition hover:shadow-md">
      <SectionHeader
        icon="activity"
        tint="violet"
        title="Activity feed"
        meta={
          total > 0 && (
            <p className="text-xs text-slate-400">
              Showing {entries.length} of {total}
            </p>
          )
        }
      />
      {entries.length === 0 ? (
        <EmptyState
          icon={<DsIcon name="radio" className="h-6 w-6" />}
          title="No activity yet"
          text="Registrations, submissions, scores, check-ins and announcements will be logged here automatically."
          compact
        />
      ) : (
        <ul className="divide-y divide-slate-100">
          {entries.map((a) => {
            const visual = ACTIVITY_ICONS[a.type] ?? { icon: 'activity' as DashIconName, tint: 'slate' as ChipTint };
            return (
              <li key={a.id} className="flex items-start gap-3.5 py-3.5 first:pt-0 last:pb-0">
                <IconChip icon={visual.icon} tint={visual.tint} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{a.message}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {ACTIVITY_LABELS[a.type] ?? a.type} · {timeAgo(a.created_at)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
