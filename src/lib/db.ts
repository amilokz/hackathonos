/* eslint-disable @typescript-eslint/no-explicit-any */
// DbRow values are dynamic by nature (any column type); `any` is intentional here.
import { createClient, type Client } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Database URL resolution:
 * - `DATABASE_URL` set (e.g. a Turso `libsql://…` URL): used as-is — the
 *   production setup. Pair with `TURSO_AUTH_TOKEN` for remote Turso DBs.
 * - On Vercel without `DATABASE_URL`: local file under /tmp (ephemeral —
 *   data does not persist between deploys; set DATABASE_URL for real use).
 * - Everywhere else: `./data/hackathonos.db` next to the project.
 */
function resolveUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  // Vercel's native Turso integration sets TURSO_DATABASE_URL
  if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
  if (process.env.VERCEL) return 'file:/tmp/hackathonos.db';
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return 'file:' + path.join(dataDir, 'hackathonos.db');
}

let client: Client | null = null;

export function getClient(): Client {
  if (client) return client;
  client = createClient({
    url: resolveUrl(),
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return client;
}

/** Async statement mirroring the better-sqlite3 call shapes used across the app. */
export interface DbStatement {
  get(...args: unknown[]): Promise<any>;
  all(...args: unknown[]): Promise<any[]>;
  run(...args: unknown[]): Promise<{ changes: number; lastInsertRowid: number | bigint }>;
}

export interface DbBatchItem {
  sql: string;
  args: unknown[];
}

/**
 * Drop-in accessor used across routes and pages.
 * `prepare()` stays synchronous; the terminal `.get()/.all()/.run()` calls
 * are async and must be awaited. `exec()` and `batch()` are async too.
 */
export function getDb() {
  const c = getClient();
  return {
    prepare: (sql: string): DbStatement => ({
      get: async (...args: unknown[]) => {
        const r = await c.execute({ sql, args: args as never[] });
        return r.rows[0] as any;
      },
      all: async (...args: unknown[]) => {
        const r = await c.execute({ sql, args: args as never[] });
        return r.rows as any[];
      },
      run: async (...args: unknown[]) => {
        const r = await c.execute({ sql, args: args as never[] });
        return { changes: Number(r.rowsAffected ?? 0), lastInsertRowid: r.lastInsertRowid ?? 0 };
      },
    }),
    exec: async (sql: string): Promise<void> => {
      await c.executeMultiple(sql);
    },
    /** Atomic multi-statement batch (replaces better-sqlite3 transactions). */
    batch: async (items: DbBatchItem[]): Promise<void> => {
      await c.batch(items.map((i) => ({ sql: i.sql, args: i.args as never[] })));
    },
  };
}

const DDL = `
    CREATE TABLE IF NOT EXISTS organizers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      organizer_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      logo_url TEXT DEFAULT '',
      start_date TEXT DEFAULT '',
      end_date TEXT DEFAULT '',
      entry_fee REAL DEFAULT 0,
      status TEXT DEFAULT 'draft',
      created_at TEXT NOT NULL,
      FOREIGN KEY (organizer_id) REFERENCES organizers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      name TEXT NOT NULL,
      contact_name TEXT DEFAULT '',
      contact_email TEXT DEFAULT '',
      contact_phone TEXT DEFAULT '',
      members_json TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      UNIQUE (event_id, name)
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      demo_url TEXT DEFAULT '',
      repo_url TEXT DEFAULT '',
      pitch_text TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS criteria (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      name TEXT NOT NULL,
      weight REAL NOT NULL DEFAULT 1,
      description TEXT DEFAULT '',
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scores (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      judge_name TEXT NOT NULL,
      criteria_id TEXT NOT NULL,
      score REAL NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (criteria_id) REFERENCES criteria(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_scores (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      overall REAL NOT NULL,
      breakdown_json TEXT DEFAULT '{}',
      strengths TEXT DEFAULT '',
      weaknesses TEXT DEFAULT '',
      questions TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      recipient_email TEXT DEFAULT '',
      type TEXT DEFAULT 'participant',
      verification_code TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sponsors (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      name TEXT NOT NULL,
      logo_url TEXT DEFAULT '',
      tier TEXT DEFAULT 'bronze',
      website TEXT DEFAULT '',
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_teams_event ON teams(event_id);
    CREATE INDEX IF NOT EXISTS idx_projects_team ON projects(team_id);
    CREATE INDEX IF NOT EXISTS idx_criteria_event ON criteria(event_id);
    CREATE INDEX IF NOT EXISTS idx_scores_project ON scores(project_id);
    CREATE INDEX IF NOT EXISTS idx_ai_scores_project ON ai_scores(project_id);
    CREATE INDEX IF NOT EXISTS idx_certificates_event ON certificates(event_id);
    CREATE INDEX IF NOT EXISTS idx_sponsors_event ON sponsors(event_id);
`;

/**
 * Creates all HackathonOS tables if they do not exist.
 * Safe to call on every boot — pure DDL, no data changes.
 */
export async function migrate(): Promise<void> {
  const db = getDb();
  await db.exec('PRAGMA foreign_keys = ON');
  await db.exec(DDL);
}
