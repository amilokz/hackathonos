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
  const cols = (await db.prepare('PRAGMA table_info(events)').all()) as { name: string }[];
  const existing = new Set(cols.map((c) => c.name));
  const add = async (name: string, ddl: string) => {
    if (!existing.has(name)) {
      await db.exec(`ALTER TABLE events ADD COLUMN ${ddl}`);
    }
  };
  await add('brand_color', "brand_color TEXT DEFAULT '#4F46E5'");
  await add('brand_logo_url', "brand_logo_url TEXT DEFAULT ''");
  await add('brand_name', "brand_name TEXT DEFAULT ''");
}
