'use client';

import { useState } from 'react';
import { Card, Button, Field, inputClass } from '@/components/ui';

export interface PublicSlot {
  id: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

export interface PublicMentor {
  id: string;
  name: string;
  expertise: string;
  bio: string;
  slots: PublicSlot[];
}

function fmtSlot(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime())) return start;
  const sameDay = !Number.isNaN(e.getTime()) && s.toDateString() === e.toDateString();
  const day = s.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const t = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return sameDay ? `${day} · ${t(s)} – ${t(e)}` : `${s.toLocaleString()} – ${e.toLocaleString()}`;
}

/**
 * Public mentor browser + booking flow.
 * Teams identify with their team code (checkin_code from their pass) —
 * resolved to team_id server-side.
 */
export default function MentorBookingList({ slug, mentors }: { slug: string; mentors: PublicMentor[] }) {
  const [selected, setSelected] = useState<{ mentor: PublicMentor; slot: PublicSlot } | null>(null);
  const [teamCode, setTeamCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ team: string; mentor: string; when: string } | null>(null);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());

  async function book() {
    if (!selected) return;
    if (!teamCode.trim()) {
      setError('Enter your team code (from your team pass).');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/e/${slug}/mentors/${selected.mentor.id}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot_id: selected.slot.id, team_code: teamCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not book this slot. Please try again.');
        return;
      }
      setBookedSlots((prev) => new Set(prev).add(selected.slot.id));
      setDone({
        team: data.booking.team_name,
        mentor: data.booking.mentor_name,
        when: new Date(data.booking.start_time).toLocaleString(),
      });
      setSelected(null);
      setTeamCode('');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="grid gap-5 md:grid-cols-2">
        {mentors.map((m) => (
          <Card key={m.id} className="flex flex-col p-5 sm:p-6">
            <h2 className="text-lg font-extrabold text-slate-900">{m.name}</h2>
            {m.expertise.trim() && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {m.expertise.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            {m.bio.trim() && <p className="mt-3 text-sm text-slate-600">{m.bio}</p>}

            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400">
              Available sessions
            </p>
            {m.slots.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">No slots yet — check back soon.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {m.slots.map((s) => {
                  const taken = s.is_booked || bookedSlots.has(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={taken}
                      onClick={() => {
                        setSelected({ mentor: m, slot: s });
                        setError(null);
                        setDone(null);
                      }}
                      className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                        taken
                          ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                          : 'border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                      }`}
                    >
                      {fmtSlot(s.start_time, s.end_time)}
                      {taken && <span className="ml-1 font-bold">· booked</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        ))}
      </div>

      {selected && (
        <Card className="mt-6 border-indigo-200 bg-indigo-50/50 p-5 sm:p-6">
          <h3 className="text-base font-extrabold text-slate-900">
            Book with {selected.mentor.name}
          </h3>
          <p className="mt-1 text-sm text-slate-600">{fmtSlot(selected.slot.start_time, selected.slot.end_time)}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label="Your team code">
              <input
                value={teamCode}
                onChange={(e) => setTeamCode(e.target.value)}
                className={`${inputClass} font-mono uppercase`}
                placeholder="e.g. TEAM-AB12C"
                maxLength={32}
              />
            </Field>
            <div className="flex gap-2">
              <Button type="button" onClick={book} disabled={busy}>
                {busy ? 'Booking…' : 'Confirm booking'}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setError(null);
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Find your team code on your team pass — the organizer shares it at check-in.
          </p>
          {error && (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
        </Card>
      )}

      {done && !selected && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <p className="text-base font-extrabold text-emerald-900">🎉 Session booked!</p>
          <p className="mt-1 text-sm text-emerald-800">
            <strong>{done.team}</strong> — see <strong>{done.mentor}</strong> at{' '}
            <strong>{done.when}</strong>.
          </p>
        </div>
      )}
      {error && !selected && (
        <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
