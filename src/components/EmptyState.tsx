import { LinkButton } from './ui';

/**
 * Friendly empty state — used everywhere an organizer list has nothing to
 * show yet. Never a blank page: every list gets an icon, a clear message
 * and (optionally) a call-to-action button.
 */
export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  compact = false,
}: {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  compact?: boolean;
}) {
  return (
    <div className={`text-center ${compact ? 'py-6' : 'py-10'}`}>
      <p className="text-5xl" role="img" aria-hidden="true">
        {icon}
      </p>
      <p className="mt-4 text-lg font-bold text-slate-900">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">{description}</p>
      {actionLabel && actionHref && (
        <div className="mt-6">
          <LinkButton href={actionHref}>{actionLabel}</LinkButton>
        </div>
      )}
    </div>
  );
}
