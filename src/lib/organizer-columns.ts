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
  const cols = (await db.prepare('PRAGMA table_info(organizers)').all()) as { name: string }[];
  const existing = new Set(cols.map((c) => c.name));
  const add = async (name: string, ddl: string) => {
    if (!existing.has(name)) {
      await db.exec(`ALTER TABLE organizers ADD COLUMN ${ddl}`);
    }
  };
  await add('plan', "plan TEXT DEFAULT 'free'");
  await add('white_label_granted', 'white_label_granted INTEGER DEFAULT 0');
}
