import { getDb } from './db';

/**
 * Adds event branding/theming columns to the events table when they are
 * missing. Idempotent — safe to call on every request. Kept in a separate
 * module so the scaffold's migrate() in db.ts is never touched.
 *
 * Columns:
 *  - `brand_color`: public-page accent color (#RRGGBB), defaults to indigo.
 *  - `brand_logo_url`: organizer-uploaded logo shown in public headers.
 *  - `brand_name`: display name used in public headers (falls back to the
 *    event name when empty). Independent of white_label — branding colors
 *    and the footer white-label compose together.
 */
export async function ensureBrandingColumns(): Promise<void> {
  const db = getDb();
  // Try ALTER directly; swallow "duplicate column" (PRAGMA is unreliable on Turso).
  const add = async (ddl: string) => {
    try {
      await db.exec(`ALTER TABLE events ADD COLUMN ${ddl}`);
    } catch (e) {
      if (!/duplicate column/i.test(String((e as Error)?.message ?? e))) throw e;
    }
  };
  await add("brand_color TEXT DEFAULT '#4F46E5'");
  await add("brand_logo_url TEXT DEFAULT ''");
  await add("brand_name TEXT DEFAULT ''");
}
