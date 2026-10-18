import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, migrate } from '@/lib/db';
import { getParticipantFromRequest } from '@/lib/participant-auth';

const UpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  skills: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  bio: z.string().trim().max(2000).optional(),
});

/** Update the signed-in participant's profile. */
export async function PATCH(req: NextRequest) {
  const participant = await getParticipantFromRequest(req);
  if (!participant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid profile data' }, { status: 400 });
  }

  await migrate();
  const sets: string[] = [];
  const args: unknown[] = [];
  if (parsed.data.name !== undefined) {
    sets.push('name = ?');
    args.push(parsed.data.name);
  }
  if (parsed.data.skills !== undefined) {
    sets.push('skills = ?');
    args.push(Array.from(new Set(parsed.data.skills.map((s) => s.trim()).filter(Boolean))).join(', '));
  }
  if (parsed.data.bio !== undefined) {
    sets.push('bio = ?');
    args.push(parsed.data.bio);
  }
  if (sets.length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  args.push(participant.id);
  await getDb().prepare(`UPDATE participants SET ${sets.join(', ')} WHERE id = ?`).run(...args);
  return NextResponse.json({ ok: true });
}
