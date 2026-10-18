import type { AnnouncementType } from '@/lib/announcement-columns';

/** Colored type badge for announcements. Shared by the public event page, the public announcements page, and the organizer center. */
export default function AnnouncementBadge({ type }: { type: AnnouncementType | string }) {
  const t = (type ?? 'info') as AnnouncementType;
  if (t === 'deadline') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
        ⚠️ Deadline
      </span>
    );
  }
  if (t === 'winner') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-bold text-yellow-800 ring-1 ring-yellow-300">
        🏆 Winner
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
      ℹ️ Info
    </span>
  );
}
