import crypto from 'node:crypto';
import { getDb } from './db';
import type { Participant } from './participant-auth';

export const TEAM_SIZE_CAP = 5;

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
 * Generates a human-readable invite code ("TEAM-X7K2P") that is unique
 * across all teams. Retries a few times on collision.
 */
export async function generateUniqueInviteCode(): Promise<string> {
  const db = getDb();
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = randomInviteCode();
    const clash = await db.prepare('SELECT id FROM teams WHERE invite_code = ?').get(code);
    if (!clash) return code;
  }
  throw new Error('Could not generate a unique invite code');
}

/** Splits a free-text skills string ("React, Python; design") into tokens. */
export function parseSkills(skills: string | null | undefined): string[] {
  if (!skills) return [];
  return skills
    .split(/[,;|\n]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

/**
 * True when any of the participant's skills appears (case-insensitive
 * substring) in the team's looking_for text, or vice versa.
 */
export function matchesSkills(lookingFor: string | null | undefined, skills: string[]): boolean {
  const text = (lookingFor ?? '').toLowerCase();
  if (!text.trim() || skills.length === 0) return false;
  return skills.some((s) => s.length >= 2 && (text.includes(s) || s.includes(text.trim())));
}

/** Counts roster rows in team_members for a team. */
export async function countTeamMembersRows(teamId: string): Promise<number> {
  const db = getDb();
  const row = (await db
    .prepare('SELECT COUNT(*) AS c FROM team_members WHERE team_id = ?')
    .get(teamId)) as { c: number };
  return row.c;
}

/** Counts distinct names stored in the legacy members_json column. */
export async function countLegacyMembers(teamId: string): Promise<number> {
  const db = getDb();
  const row = (await db.prepare('SELECT members_json FROM teams WHERE id = ?').get(teamId)) as
    | { members_json: string | null }
    | undefined;
  if (!row?.members_json) return 0;
  try {
    const parsed = JSON.parse(row.members_json) as unknown;
    if (!Array.isArray(parsed)) return 0;
    return new Set(parsed.map((m) => String(m).trim().toLowerCase()).filter(Boolean)).size;
  } catch {
    return 0;
  }
}

/**
 * Total headcount for a team: structured team_members rows plus legacy
 * members_json names. Used for the join cap.
 */
export async function teamHeadcount(teamId: string): Promise<number> {
  const [rows, legacy] = await Promise.all([countTeamMembersRows(teamId), countLegacyMembers(teamId)]);
  return rows + legacy;
}

export interface TeamMemberRow {
  id: string;
  team_id: string;
  participant_id: string | null;
  name: string;
  email: string | null;
  created_at: string;
}

/** All structured members of a team, newest first. */
export async function getTeamMembers(teamId: string): Promise<TeamMemberRow[]> {
  const db = getDb();
  return (await db
    .prepare(
      'SELECT id, team_id, participant_id, name, email, created_at FROM team_members WHERE team_id = ? ORDER BY created_at ASC',
    )
    .all(teamId)) as TeamMemberRow[];
}

/** Legacy names from members_json that aren't already in team_members (by name). */
export async function getLegacyMemberNames(teamId: string): Promise<string[]> {
  const db = getDb();
  const row = (await db.prepare('SELECT members_json FROM teams WHERE id = ?').get(teamId)) as
    | { members_json: string | null }
    | undefined;
  if (!row?.members_json) return [];
  const structured = await getTeamMembers(teamId);
  const seen = new Set(structured.map((m) => m.name.trim().toLowerCase()));
  try {
    const parsed = JSON.parse(row.members_json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[])
      .map((m) => String(m).trim())
      .filter((n) => n.length > 0 && !seen.has(n.toLowerCase()));
  } catch {
    return [];
  }
}

/**
 * True when the participant is already rostered on the team — either via
 * team_members (participant_id or email) or as the team's contact email.
 */
export async function isAlreadyOnTeam(
  teamId: string,
  participant: Pick<Participant, 'id' | 'email'>,
): Promise<boolean> {
  const db = getDb();
  const email = participant.email.trim().toLowerCase();
  const byParticipant = await db
    .prepare('SELECT id FROM team_members WHERE team_id = ? AND participant_id = ?')
    .get(teamId, participant.id);
  if (byParticipant) return true;
  if (email) {
    const byEmail = await db
      .prepare('SELECT id FROM team_members WHERE team_id = ? AND lower(email) = ?')
      .get(teamId, email);
    if (byEmail) return true;
    const contact = await db
      .prepare('SELECT id FROM teams WHERE id = ? AND lower(contact_email) = ?')
      .get(teamId, email);
    if (contact) return true;
  }
  return false;
}

/**
 * Adds a participant to a team's roster. Idempotent guard should be checked
 * by the caller via isAlreadyOnTeam.
 */
export async function addParticipantToTeam(
  teamId: string,
  participant: Pick<Participant, 'id' | 'name' | 'email'>,
): Promise<void> {
  const { v4: uuid } = await import('uuid');
  const db = getDb();
  await db
    .prepare(
      'INSERT INTO team_members (id, team_id, participant_id, name, email, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(uuid(), teamId, participant.id, participant.name, participant.email, new Date().toISOString());
}

/**
 * Skill tokens per roster member, resolved via team_members.participant_id →
 * participants.skills when available. Returns a map of member id → skills.
 */
export async function getMemberSkills(teamId: string): Promise<Map<string, string[]>> {
  const db = getDb();
  const map = new Map<string, string[]>();
  const members = await getTeamMembers(teamId);
  for (const m of members) {
    if (!m.participant_id) continue;
    try {
      const p = (await db.prepare('SELECT skills FROM participants WHERE id = ?').get(m.participant_id)) as
        | { skills: string | null }
        | undefined;
      if (p?.skills) map.set(m.id, parseSkills(p.skills));
    } catch {
      // participants table missing or unreadable — skip skills for this member
    }
  }
  return map;
}
