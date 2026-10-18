import { getDb } from './db';

/**
 * Adds the Announcements Center columns to the announcements table when
 * they are missing. Idempotent — safe to call on every request. Kept in a
 * separate module so the scaffold's migrate() in db.ts is never touched
 * (same convention as lib/settings-columns.ts).
 *
 * Columns:
 * - title  TEXT    DEFAULT ''   — headline shown on cards, ticker & banners
 * - pinned INTEGER DEFAULT 0    — pinned announcements sort first everywhere
 * - type   TEXT    DEFAULT 'info' — 'info' | 'deadline' | 'winner'
 *
 * Backfill: existing Phase-1 rows keep title '' and type 'info'; the live
 * ticker query (`SELECT id, message, created_at …`) is unaffected.
 */
export const ANNOUNCEMENT_TYPES = ['info', 'deadline', 'winner'] as const;
export type AnnouncementType = (typeof ANNOUNCEMENT_TYPES)[number];

export interface AnnouncementRow {
  id: string;
  event_id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  pinned: number;
  created_at: string;
}

export async function ensureAnnouncementColumns(): Promise<void> {
  const db = getDb();
  const cols = (await db.prepare('PRAGMA table_info(announcements)').all()) as { name: string }[];
  const existing = new Set(cols.map((c) => c.name));
  const add = async (name: string, ddl: string) => {
    if (!existing.has(name)) {
      await db.exec(`ALTER TABLE announcements ADD COLUMN ${ddl}`);
    }
  };
  await add('title', "title TEXT DEFAULT ''");
  await add('pinned', 'pinned INTEGER DEFAULT 0');
  await add('type', "type TEXT DEFAULT 'info'");
}
