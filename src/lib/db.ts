/* eslint-disable @typescript-eslint/no-explicit-any */
// DbRow values are dynamic by nature (any column type); `any` is intentional here.
import { createClient, type Client } from '@libsql/client';
import crypto from 'node:crypto';
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

    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      data_url TEXT NOT NULL,
      mime TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS judges (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT DEFAULT '',
      access_code TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS checkins (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      member_name TEXT NOT NULL,
      checked_in_at TEXT NOT NULL,
      checked_in_by TEXT DEFAULT '',
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      UNIQUE (event_id, team_id, member_name)
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    -- Team Finder: individual roster entries (new joins + invite-code joins).
    -- Legacy teams only have members_json; this table grows as participants
    -- join via the finder, invite codes, or accepted join requests.
    -- participant_id links a row to a participant profile (Worker 1);
    -- role marks captain/member (Worker 1). Both are nullable-ish so each
    -- worker's inserts (which may omit one column) keep working.
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      participant_id TEXT DEFAULT '',
      name TEXT NOT NULL,
      email TEXT DEFAULT '',
      role TEXT DEFAULT 'member',
      created_at TEXT NOT NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    -- Team Finder: join requests from participants to open teams.
    CREATE TABLE IF NOT EXISTS join_requests (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      participant_id TEXT NOT NULL,
      message TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      UNIQUE (team_id, participant_id)
    );

    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      skills TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);
    CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
    CREATE INDEX IF NOT EXISTS idx_team_members_participant ON team_members(participant_id);
    CREATE INDEX IF NOT EXISTS idx_join_requests_team ON join_requests(team_id);
    CREATE INDEX IF NOT EXISTS idx_join_requests_participant ON join_requests(participant_id);
`;

/**
 * Adds columns to the events table that were introduced after the initial
 * CREATE TABLE. Production tables already exist, so CREATE TABLE IF NOT
 * EXISTS never applies them — each ALTER is retried blindly and the
 * "duplicate column" error is swallowed, making this idempotent and safe
 * to run on every boot (works on both local SQLite and remote Turso,
 * where PRAGMA introspection is unreliable).
 */
const EVENT_COLUMN_ADDITIONS = [
  "ALTER TABLE events ADD COLUMN cover_url TEXT DEFAULT ''",
  "ALTER TABLE events ADD COLUMN prizes TEXT DEFAULT ''",
  "ALTER TABLE events ADD COLUMN schedule TEXT DEFAULT ''",
  "ALTER TABLE events ADD COLUMN faq TEXT DEFAULT ''",
  "ALTER TABLE events ADD COLUMN highlight_video_url TEXT DEFAULT ''",
  "ALTER TABLE events ADD COLUMN require_team_approval INTEGER DEFAULT 0",
];

async function ensureEventColumns(): Promise<void> {
  const db = getDb();
  for (const alter of EVENT_COLUMN_ADDITIONS) {
    try {
      await db.exec(alter);
    } catch (e) {
      if (!/duplicate column/i.test(String((e as Error)?.message ?? e))) throw e;
    }
  }
}

/**
 * Columns added to teams/scores after initial CREATE TABLE.
 * Backfills: approval_status defaults to 'approved' for existing teams;
 * checkin_code is left empty and generated lazily on first pass view.
 */
const TEAM_COLUMN_ADDITIONS = [
  "ALTER TABLE teams ADD COLUMN approval_status TEXT DEFAULT 'approved'",
  'ALTER TABLE teams ADD COLUMN checkin_code TEXT DEFAULT \'\'',
  // Team Finder columns:
  "ALTER TABLE teams ADD COLUMN looking_for TEXT DEFAULT ''",
  'ALTER TABLE teams ADD COLUMN is_open INTEGER DEFAULT 1',
  "ALTER TABLE teams ADD COLUMN invite_code TEXT DEFAULT ''",
];

const SCORE_COLUMN_ADDITIONS = [
  "ALTER TABLE scores ADD COLUMN judge_id TEXT DEFAULT ''",
  "ALTER TABLE scores ADD COLUMN overall_notes TEXT DEFAULT ''",
];

async function ensureTeamColumns(): Promise<void> {
  const db = getDb();
  for (const alter of TEAM_COLUMN_ADDITIONS) {
    try {
      await db.exec(alter);
    } catch (e) {
      if (!/duplicate column/i.test(String((e as Error)?.message ?? e))) throw e;
    }
  }
}

async function ensureScoreColumns(): Promise<void> {
  const db = getDb();
  for (const alter of SCORE_COLUMN_ADDITIONS) {
    try {
      await db.exec(alter);
    } catch (e) {
      if (!/duplicate column/i.test(String((e as Error)?.message ?? e))) throw e;
    }
  }
}

const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I lookalikes

function randomInviteCode(): string {
  const bytes = crypto.randomBytes(5);
  let suffix = '';
  for (let i = 0; i < 5; i++) {
    suffix += INVITE_CODE_ALPHABET[bytes[i] % INVITE_CODE_ALPHABET.length];
  }
  return 'TEAM-' + suffix;
}

/**
 * Backfills invite codes for teams that don't have one yet (created before
 * the Team Finder shipped), then enforces uniqueness going forward.
 * Runs inside migrate() so it is idempotent: teams with a code are skipped.
 */
async function backfillInviteCodes(): Promise<void> {
  const db = getDb();
  const missing = (await db
    .prepare("SELECT id FROM teams WHERE invite_code IS NULL OR invite_code = ''")
    .all()) as { id: string }[];
  for (const row of missing) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const code = randomInviteCode();
      const clash = await db.prepare('SELECT id FROM teams WHERE invite_code = ?').get(code);
      if (clash) continue;
      await db.prepare('UPDATE teams SET invite_code = ? WHERE id = ?').run(code, row.id);
      break;
    }
  }
  await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_invite_code ON teams(invite_code)');
}

/**
 * Adds participant_id to team_members (added after the initial CREATE TABLE).
 * Guarded: checks PRAGMA table_info first and only ALTERs when the column is
 * missing, so this is a no-op on tables already created with the column.
 */
async function ensureTeamMemberColumns(): Promise<void> {
  const db = getDb();
  const cols = (await db
    .prepare('PRAGMA table_info(team_members)')
    .all()) as { name: string }[];
  const names = new Set(cols.map((c) => c.name));
  if (!names.has('participant_id')) {
    await db.exec('ALTER TABLE team_members ADD COLUMN participant_id TEXT');
  }
}

/**
 * Creates all HackathonOS tables if they do not exist.
 * Safe to call on every boot — pure DDL, no data changes.
 */
export async function migrate(): Promise<void> {
  const db = getDb();
  await db.exec('PRAGMA foreign_keys = ON');
  await db.exec(DDL);
  await ensureEventColumns();
  await ensureTeamColumns();
  await backfillInviteCodes();
  await ensureScoreColumns();
  await ensureTeamMemberColumns();
}
