import { getDb } from './db';
import { parseMembers } from './checkin-auth';
import { computeResults } from './results';

export interface DistributeRecipient {
  name: string;
  email: string;
  team_name: string;
}

export interface RecipientPools {
  teamMembers: DistributeRecipient[];
  winners: DistributeRecipient[];
  winnersRanked: {
    project_id: string;
    title: string;
    team_name: string;
    rank: number;
    human_total: number | null;
  }[];
  teamCount: number;
}

/**
 * Builds the recipient pools for bulk PDF certificate distribution:
 *  - teamMembers: every member of approved teams (names from members_json
 *    merged with team_members rows, which carry emails).
 *  - winners: members of the top-3 ranked projects that have human scores,
 *    computed with the same computeResults() the judging page uses.
 */
export async function getRecipientPools(eventId: string): Promise<RecipientPools> {
  const db = getDb();

  const teams = (await db
    .prepare("SELECT id, name FROM teams WHERE event_id = ? AND approval_status = 'approved' ORDER BY name")
    .all(eventId)) as { id: string; name: string }[];

  const teamNameById = new Map(teams.map((t) => [t.id, t.name]));
  const byTeamName = new Map<string, DistributeRecipient[]>(); // team_name -> members

  for (const team of teams) {
    const row = (await db
      .prepare('SELECT members_json FROM teams WHERE id = ?')
      .get(team.id)) as { members_json: string } | undefined;
    const roster = (await db
      .prepare('SELECT name, email FROM team_members WHERE team_id = ?')
      .all(team.id)) as { name: string; email: string }[];
    const emailByName = new Map<string, string>();
    for (const r of roster) {
      const name = (r.name ?? '').trim();
      if (name) emailByName.set(name.toLowerCase(), (r.email ?? '').trim());
    }
    const members: DistributeRecipient[] = [];
    const seen = new Set<string>();
    const push = (name: string) => {
      const key = name.toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      members.push({ name, email: emailByName.get(key) ?? '', team_name: team.name });
    };
    for (const name of parseMembers(row?.members_json)) push(name);
    for (const r of roster) {
      const name = (r.name ?? '').trim();
      if (name) push(name);
    }
    byTeamName.set(team.name, members);
  }

  const teamMembers: DistributeRecipient[] = [];
  byTeamName.forEach((members) => {
    teamMembers.push(...members);
  });

  // Winners: top-3 projects with human scores → their team members.
  const results = await computeResults(eventId);
  const scored = results.filter((r) => r.human_total != null).slice(0, 3);
  const winners: DistributeRecipient[] = [];
  if (scored.length > 0) {
    const placeholders = scored.map(() => '?').join(',');
    const projectTeams = (await db
      .prepare(`SELECT team_id FROM projects WHERE id IN (${placeholders})`)
      .all(...scored.map((r) => r.project_id))) as { team_id: string }[];
    for (const { team_id } of projectTeams) {
      const teamName = teamNameById.get(team_id);
      if (teamName) winners.push(...(byTeamName.get(teamName) ?? []));
    }
  }

  return {
    teamMembers,
    winners,
    winnersRanked: scored.map((r) => ({
      project_id: r.project_id,
      title: r.title,
      team_name: r.team_name,
      rank: r.rank,
      human_total: r.human_total,
    })),
    teamCount: teams.length,
  };
}
