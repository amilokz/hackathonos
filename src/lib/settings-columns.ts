import { getDb } from './db';

/**
 * Adds Phase-C monetization columns to the events table when they are
 * missing. Idempotent — safe to call on every request. Kept in a separate
 * module so the scaffold's migrate() in db.ts is never touched.
 */
export async function ensureSettingsColumns(): Promise<void> {
  const db = getDb();
  // Try ALTER directly; swallow "duplicate column" (PRAGMA is unreliable on Turso).
  const add = async (ddl: string) => {
    try {
      await db.exec(`ALTER TABLE events ADD COLUMN ${ddl}`);
    } catch (e) {
      if (!/duplicate column/i.test(String((e as Error)?.message ?? e))) throw e;
    }
  };
  await add("payment_instructions TEXT DEFAULT ''");
  await add('white_label INTEGER DEFAULT 0');
  await add("custom_footer_text TEXT DEFAULT ''");
}
