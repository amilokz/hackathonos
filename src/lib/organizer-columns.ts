import { getDb } from './db';

/**
 * Adds Phase-C monetization columns to the organizers table when they are
 * missing. Idempotent — safe to call on every request. Follows the same
 * PRAGMA introspection pattern as settings-columns.ts so the scaffold's
 * migrate() in db.ts is never touched.
 *
 * - plan: 'free' | 'pro' | 'enterprise' (see src/lib/plans.ts)
 * - white_label_granted: manual per-organizer override (1 = white label
 *   unlocked regardless of plan)
 */
export async function ensureOrganizerColumns(): Promise<void> {
  const db = getDb();
  // Try ALTER directly and swallow "duplicate column" errors.
  // (PRAGMA introspection proved unreliable on Turso.)
  const add = async (ddl: string) => {
    try {
      await db.exec(`ALTER TABLE organizers ADD COLUMN ${ddl}`);
    } catch (e) {
      if (!/duplicate column/i.test(String((e as Error)?.message ?? e))) throw e;
    }
  };
  await add("plan TEXT DEFAULT 'free'");
  await add('white_label_granted INTEGER DEFAULT 0');
}
