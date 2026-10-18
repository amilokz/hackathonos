import { randomUUID } from 'node:crypto';
import type { getDb } from './db';

/**
 * Dashboard activity feed logging.
 *
 * logActivity never throws — it swallows its own errors and logs them to
 * the console, so activity logging can never break the request that
 * triggered it. Call sites use `void logActivity(...)` fire-and-forget.
 */
export type ActivityType =
  | 'team_registered'
  | 'project_submitted'
  | 'score_completed'
  | 'checkin'
  | 'announcement';

type Db = ReturnType<typeof getDb>;

export async function logActivity(
  db: Db,
  eventId: string,
  type: ActivityType,
  message: string,
): Promise<void> {
  try {
    if (!eventId || !message?.trim()) return;
    await db
      .prepare(
        'INSERT INTO activity_log (id, event_id, type, message, created_at) VALUES (?, ?, ?, ?, ?)',
      )
      .run(randomUUID(), eventId, type, message.trim(), new Date().toISOString());
  } catch (e) {
    console.error('[activity] log failed:', e);
  }
}
