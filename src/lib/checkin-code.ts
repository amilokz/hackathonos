import { randomBytes } from 'node:crypto';
import { getDb, migrate } from './db';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I lookalikes

function randomCode(): string {
  const bytes = randomBytes(6);
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return 'CHK-' + suffix;
}

/**
 * Returns the team's check-in code, generating and saving one lazily when
 * the column is still empty (backfilled teams have checkin_code = '').
 * The code is unique across all teams.
 */
export async function ensureCheckinCode(teamId: string): Promise<string> {
  await migrate();
  const db = getDb();
  const row = (await db
    .prepare('SELECT id, checkin_code FROM teams WHERE id = ?')
    .get(teamId)) as { id: string; checkin_code: string | null } | undefined;
  if (!row) throw new Error('Team not found');
  const existing = (row.checkin_code ?? '').trim();
  if (existing) return existing;

  for (let attempt = 0; attempt < 12; attempt++) {
    const code = randomCode();
    const clash = await db.prepare('SELECT id FROM teams WHERE checkin_code = ?').get(code);
    if (clash) continue;
    await db.prepare('UPDATE teams SET checkin_code = ? WHERE id = ?').run(code, teamId);
    return code;
  }
  throw new Error('Could not generate a unique check-in code');
}
