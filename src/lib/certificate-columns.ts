import { getDb } from './db';

/**
 * Certificate PDF templates + per-certificate PDF linkage.
 *
 * Adds (idempotently, via PRAGMA introspection):
 *  - `certificate_templates` table: uploaded pre-designed PDF certificate
 *    templates (e.g. made in Canva/Photoshop) that organizers bulk-distribute.
 *  - `certificates.pdf_url`: the downloadable PDF for this issued certificate
 *    (nullable — certificates generated from the text list don't have one).
 *  - `certificates.template_id`: which template this certificate was issued
 *    from (nullable).
 *
 * Kept in a separate module so the scaffold's migrate() in db.ts is never
 * touched — same pattern as settings-columns.ts.
 */
export async function ensureCertificateColumns(): Promise<void> {
  const db = getDb();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS certificate_templates (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      name TEXT NOT NULL,
      pdf_url TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );
  `);
  await db.exec(
    'CREATE INDEX IF NOT EXISTS idx_certificate_templates_event ON certificate_templates(event_id)',
  );

  // Add columns idempotently: try ALTER directly and swallow "duplicate column"
  // errors. (PRAGMA introspection proved unreliable on Turso — it can report
  // a column as missing when it already exists.)
  const add = async (ddl: string) => {
    try {
      await db.exec(`ALTER TABLE certificates ADD COLUMN ${ddl}`);
    } catch (e) {
      if (!/duplicate column/i.test(String((e as Error)?.message ?? e))) throw e;
    }
  };
  await add("pdf_url TEXT DEFAULT ''");
  await add("template_id TEXT DEFAULT ''");
}
