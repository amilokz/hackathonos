import { getDb } from './db';

/**
 * Adds Phase-C monetization columns to the events table when they are
 * missing. Idempotent — safe to call on every request. Kept in a separate
 * module so the scaffold's migrate() in db.ts is never touched.
 */
export async function ensureSettingsColumns(): Promise<void> {
  const db = getDb();
  const cols = (await db.prepare('PRAGMA table_info(events)').all()) as { name: string }[];
  const existing = new Set(cols.map((c) => c.name));
  const add = async (name: string, ddl: string) => {
    if (!existing.has(name)) {
      await db.exec(`ALTER TABLE events ADD COLUMN ${ddl}`);
    }
  };
  await add('payment_instructions', "payment_instructions TEXT DEFAULT ''");
  await add('white_label', 'white_label INTEGER DEFAULT 0');
  await add('custom_footer_text', "custom_footer_text TEXT DEFAULT ''");
}
