import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest } from '@/lib/require-organizer';

/** Default judging criteria (same as new events get). */
const DEFAULT_CRITERIA = [
  { name: 'Innovation', weight: 25 },
  { name: 'Technical Execution', weight: 25 },
  { name: 'Impact', weight: 20 },
  { name: 'Presentation', weight: 15 },
  { name: 'Feasibility', weight: 15 },
];

const JUDGES = ['Kashif Ali', 'Ayesha Khan'];

interface SeedTeam {
  name: string;
  contact_name: string;
  contact_email: string;
  members: string[];
  project: { title: string; description: string; demo_url: string; repo_url: string; pitch: string };
  /** per-criterion scores per judge (same shape as DEFAULT_CRITERIA) */
  judgeScores: number[][];
}

interface SeedEvent {
  name: string;
  slug: string;
  description: string;
  cover_url: string;
  start_date: string;
  end_date: string;
  prizes: string;
  sponsor: { name: string; tier: string };
  teams: SeedTeam[];
}

const SEED_EVENTS: SeedEvent[] = [
  {
    name: 'KP AI Builders Hackathon 2025',
    slug: 'kp-ai-builders-hackathon-2025',
    description:
      'A 48-hour AI hackathon at NIC Peshawar where 3 teams built working AI prototypes — from crop-disease detection to Urdu voice assistants.',
    cover_url: '/images/event-1.jpg',
    start_date: '2025-08-15',
    end_date: '2025-08-17',
    prizes: '1st place: PKR 100,000 · 2nd place: PKR 50,000 · 3rd place: PKR 25,000',
    sponsor: { name: 'NIC Peshawar', tier: 'platinum' },
    teams: [
      {
        name: 'Neural Knights',
        contact_name: 'Ahmed Khan',
        contact_email: 'ahmed.knights@example.com',
        members: ['Ahmed Khan', 'Sara Ahmed'],
        project: {
          title: 'FasalScan',
          description: 'AI crop-disease detection from phone photos for small farmers.',
          demo_url: 'https://example.com/fasalscan-demo',
          repo_url: 'https://github.com/example/fasalscan',
          pitch: 'Point your phone at a leaf, get a diagnosis and treatment plan in Urdu.',
        },
        judgeScores: [
          [9, 8, 9, 8, 8],
          [8, 9, 9, 7, 8],
        ],
      },
      {
        name: 'Code Catalysts',
        contact_name: 'Bilal Hussain',
        contact_email: 'bilal.catalysts@example.com',
        members: ['Bilal Hussain', 'Fatima Noor', 'Usman Tariq'],
        project: {
          title: 'AwazSehat',
          description: 'Urdu voice assistant that books clinic appointments for elderly patients.',
          demo_url: 'https://example.com/awazsehat-demo',
          repo_url: 'https://github.com/example/awazsehat',
          pitch: 'Healthcare access for people who never learned to use apps.',
        },
        judgeScores: [
          [8, 7, 8, 7, 7],
          [7, 8, 8, 8, 7],
        ],
      },
      {
        name: 'Pixel Pioneers',
        contact_name: 'Ayesha Malik',
        contact_email: 'ayesha.pioneers@example.com',
        members: ['Ayesha Malik', 'Hassan Raza'],
        project: {
          title: 'ExamPilot',
          description: 'Personalized exam prep that adapts to each student\u2019s weak topics.',
          demo_url: 'https://example.com/exampilot-demo',
          repo_url: 'https://github.com/example/exampilot',
          pitch: 'An AI tutor that knows exactly what you need to revise tonight.',
        },
        judgeScores: [
          [7, 7, 7, 6, 7],
          [7, 6, 7, 7, 6],
        ],
      },
    ],
  },
  {
    name: 'Youth Tech Sprint 2025',
    slug: 'youth-tech-sprint-2025',
    description:
      'A weekend sprint for student builders — 3 teams shipped MVPs in 48 hours, from campus safety apps to study-group matchmakers.',
    cover_url: '/images/event-2.jpg',
    start_date: '2025-11-07',
    end_date: '2025-11-09',
    prizes: '1st place: PKR 75,000 · 2nd place: PKR 40,000 · 3rd place: PKR 20,000',
    sponsor: { name: 'TechKhwa', tier: 'gold' },
    teams: [
      {
        name: 'Byte Brigade',
        contact_name: 'Danish Ali',
        contact_email: 'danish.brigade@example.com',
        members: ['Danish Ali', 'Mahnoor Sheikh', 'Ali Raza'],
        project: {
          title: 'SafeCampus',
          description: 'Anonymous incident reporting and safe-route mapping for campuses.',
          demo_url: 'https://example.com/safecampus-demo',
          repo_url: 'https://github.com/example/safecampus',
          pitch: 'Every student deserves to feel safe walking home.',
        },
        judgeScores: [
          [9, 8, 8, 8, 9],
          [8, 8, 9, 8, 8],
        ],
      },
      {
        name: 'Logic Lords',
        contact_name: 'Sana Javed',
        contact_email: 'sana.lords@example.com',
        members: ['Sana Javed', 'Imran Farooq'],
        project: {
          title: 'StudyMatch',
          description: 'Matches students into study groups by subject, level and schedule.',
          demo_url: 'https://example.com/studymatch-demo',
          repo_url: 'https://github.com/example/studymatch',
          pitch: 'Never study alone unless you want to.',
        },
        judgeScores: [
          [7, 8, 7, 7, 8],
          [8, 7, 7, 7, 7],
        ],
      },
      {
        name: 'Debug Dynamos',
        contact_name: 'Fahad Mehmood',
        contact_email: 'fahad.dynamos@example.com',
        members: ['Fahad Mehmood', 'Hira Shahid', 'Kamran Iqbal'],
        project: {
          title: 'BazaarLens',
          description: 'Price comparison across local online bazaars in one search.',
          demo_url: 'https://example.com/bazaarlens-demo',
          repo_url: 'https://github.com/example/bazaarlens',
          pitch: 'Stop overpaying — compare every bazaar in seconds.',
        },
        judgeScores: [
          [6, 7, 6, 6, 7],
          [7, 6, 6, 7, 6],
        ],
      },
    ],
  },
];

/**
 * POST /api/seed-demo — organizer-only. Creates 2 realistic CLOSED past events
 * (teams, projects, criteria, judge scores, sponsors, certificates) for demoing
 * /past, leaderboards and certificates instantly.
 * Refuses when ANY events already exist.
 */
export async function POST(req: Request) {
  const org = await requireOrganizerFromRequest(req);
  if (!org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await migrate();
  const db = getDb();

  const existing = (await db.prepare('SELECT COUNT(*) AS c FROM events').get()) as { c: number };
  if (existing.c > 0) {
    return NextResponse.json({ error: 'events already exist' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const created: Array<{ id: string; name: string; slug: string }> = [];

  for (const se of SEED_EVENTS) {
    const eventId = uuid();
    await db
      .prepare(
        `INSERT INTO events (id, organizer_id, name, slug, description, cover_url, start_date, end_date, entry_fee, prizes, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'closed', ?)`
      )
      .run(eventId, org.id, se.name, se.slug, se.description, se.cover_url, se.start_date, se.end_date, se.prizes, now);

    // Default judging criteria
    const criteriaIds: string[] = [];
    for (const c of DEFAULT_CRITERIA) {
      const cid = uuid();
      criteriaIds.push(cid);
      await db
        .prepare('INSERT INTO criteria (id, event_id, name, weight, description) VALUES (?, ?, ?, ?, ?)')
        .run(cid, eventId, c.name, c.weight, '');
    }

    // Sponsor
    await db
      .prepare('INSERT INTO sponsors (id, event_id, name, logo_url, tier, website) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uuid(), eventId, se.sponsor.name, '', se.sponsor.tier, '');

    // Teams + projects + scores + certificates
    for (const st of se.teams) {
      const teamId = uuid();
      await db
        .prepare(
          'INSERT INTO teams (id, event_id, name, contact_name, contact_email, contact_phone, members_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .run(teamId, eventId, st.name, st.contact_name, st.contact_email, '', JSON.stringify(st.members), now);

      const projectId = uuid();
      await db
        .prepare(
          'INSERT INTO projects (id, team_id, title, description, demo_url, repo_url, pitch_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .run(
          projectId,
          teamId,
          st.project.title,
          st.project.description,
          st.project.demo_url,
          st.project.repo_url,
          st.project.pitch,
          now
        );

      // Judge scores across all criteria
      for (let j = 0; j < JUDGES.length; j++) {
        const perCriterion = st.judgeScores[j];
        for (let k = 0; k < criteriaIds.length; k++) {
          await db
            .prepare(
              'INSERT INTO scores (id, project_id, judge_name, criteria_id, score, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
            )
            .run(uuid(), projectId, JUDGES[j], criteriaIds[k], perCriterion[k], '', now);
        }
      }

      // Participation certificates for each member
      for (const member of st.members) {
        await db
          .prepare(
            `INSERT INTO certificates (id, event_id, recipient_name, recipient_email, type, verification_code, created_at)
             VALUES (?, ?, ?, ?, 'participant', ?, ?)`
          )
          .run(uuid(), eventId, member, '', uuid().replace(/-/g, '').slice(0, 12).toUpperCase(), now);
      }
    }

    created.push({ id: eventId, name: se.name, slug: se.slug });
  }

  return NextResponse.json({ ok: true, events: created }, { status: 201 });
}
