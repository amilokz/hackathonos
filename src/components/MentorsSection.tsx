'use client';

import { useEffect, useState } from 'react';
import { Card, Button, Field, inputClass, ErrorNote, SuccessNote } from '@/components/ui';
import type { MentorView, MentorSlotView } from '@/lib/mentors';

interface SlotRow {
  date: string;
  start: string;
  end: string;
}

const emptyRow = (): SlotRow => ({ date: '', start: '', end: '' });

function fmtRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime())) return start;
  const sameDay = !Number.isNaN(e.getTime()) && s.toDateString() === e.toDateString();
  const day = s.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const t = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return sameDay ? `${day}, ${t(s)} – ${t(e)}` : `${s.toLocaleString()} – ${e.toLocaleString()}`;
}

/**
 * Organizer mentor management section. Mounted on the event manage page
 * next to JudgesSection. Lets organizers add mentors, bulk-add availability
 * slots per mentor, see bookings (team names), cancel bookings, and remove
 * mentors.
 */
export default function MentorsSection({ eventId }: { eventId: string }) {
  const [mentors, setMentors] = useState<MentorView[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [expertise, setExpertise] = useState('');
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Per-mentor availability editor state.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [slotRows, setSlotRows] = useState<SlotRow[]>([emptyRow()]);
  const [slotBusy, setSlotBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/mentors`);
      const data = await res.json();
      if (res.ok) setMentors(data.mentors ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  function clearMsg() {
    setError(null);
    setNotice(null);
  }

  async function addMentor(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Mentor name is required.');
      return;
    }
    setBusy(true);
    clearMsg();
    try {
      const res = await fetch(`/api/events/${eventId}/mentors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          expertise: expertise.trim(),
          bio: bio.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not add mentor. Please try again.');
        return;
      }
      setMentors((ms) => [...ms, data.mentor]);
      setNotice(`“${data.mentor.name}” added. Now add their availability below.`);
      setName('');
      setExpertise('');
      setBio('');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function removeMentor(mentor: MentorView) {
    if (!window.confirm(`Remove mentor “${mentor.name}”? Their slots and bookings will be deleted.`))
      return;
    clearMsg();
    try {
      const res = await fetch(`/api/events/${eventId}/mentors/${mentor.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not remove mentor. Please try again.');
        return;
      }
      setMentors((ms) => ms.filter((x) => x.id !== mentor.id));
      setNotice(`“${mentor.name}” removed.`);
    } catch {
      setError('Network error. Please try again.');
    }
  }

  async function cancelBooking(mentor: MentorView, slot: MentorSlotView) {
    if (!slot.booking) return;
    if (
      !window.confirm(
        `Cancel ${slot.booking.team_name}’s booking with ${mentor.name} (${fmtRange(slot.start_time, slot.end_time)})? The slot becomes bookable again.`
      )
    )
      return;
    clearMsg();
    try {
      const res = await fetch(
        `/api/events/${eventId}/mentors/${mentor.id}/bookings/${slot.booking.id}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not cancel booking. Please try again.');
        return;
      }
      setNotice(`Booking for “${slot.booking.team_name}” cancelled — slot is free again.`);
      await load();
    } catch {
      setError('Network error. Please try again.');
    }
  }

  async function saveSlots(mentor: MentorView) {
    const slots = slotRows
      .filter((r) => r.date && r.start && r.end)
      .map((r) => ({ start_time: `${r.date}T${r.start}`, end_time: `${r.date}T${r.end}` }));
    if (slots.length === 0) {
      setError('Add at least one complete row (date + start + end).');
      return;
    }
    setSlotBusy(true);
    clearMsg();
    try {
      const res = await fetch(`/api/events/${eventId}/mentors/${mentor.id}/slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not add slots. Please try again.');
        return;
      }
      setNotice(`${data.slots.length} slot${data.slots.length === 1 ? '' : 's'} added for “${mentor.name}”.`);
      setOpenFor(null);
      setSlotRows([emptyRow()]);
      await load();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSlotBusy(false);
    }
  }

  function toggleEditor(mentorId: string) {
    if (openFor === mentorId) {
      setOpenFor(null);
    } else {
      setOpenFor(mentorId);
      setSlotRows([emptyRow()]);
    }
    clearMsg();
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Mentors</h2>
          <p className="text-sm text-slate-500">
            Teams book 1-on-1 sessions at <span className="font-semibold">/e/your-event/mentors</span>.
          </p>
        </div>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
          {mentors.length} mentor{mentors.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <ErrorNote message={error} />
        <SuccessNote message={notice} />
      </div>

      <form onSubmit={addMentor} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr] lg:grid-cols-[1fr_1fr_2fr_auto] lg:items-end">
        <Field label="Mentor name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="e.g. Daniyal Ahmed"
            maxLength={120}
          />
        </Field>
        <Field label="Expertise (comma-separated)">
          <input
            value={expertise}
            onChange={(e) => setExpertise(e.target.value)}
            className={inputClass}
            placeholder="e.g. AI, Pitching, React"
            maxLength={300}
          />
        </Field>
        <Field label="Bio (optional)">
          <input
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className={inputClass}
            placeholder="One-line intro…"
            maxLength={500}
          />
        </Field>
        <Button type="submit" disabled={busy} className="lg:mb-[1px]">
          {busy ? 'Adding…' : '+ Add mentor'}
        </Button>
      </form>

      <div className="mt-6">
        {loading ? (
          <p className="py-6 text-center text-sm text-slate-400">Loading mentors…</p>
        ) : mentors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm font-semibold text-slate-600">No mentors yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Add your first mentor above, then add their availability slots.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {mentors.map((m) => (
              <li key={m.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{m.name}</p>
                    {m.expertise.trim() && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {m.expertise.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    {m.bio.trim() && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{m.bio}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleEditor(m.id)}
                    className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
                  >
                    {openFor === m.id ? 'Close' : '+ Availability'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeMentor(m)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>

                {/* Slots */}
                <div className="border-t border-slate-100 px-4 py-3">
                  {m.slots.length === 0 ? (
                    <p className="text-xs text-slate-400">No availability yet — add some with “+ Availability”.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {m.slots.map((s) => (
                        <span
                          key={s.id}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                            s.is_booked
                              ? 'border-slate-200 bg-slate-100 text-slate-500'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          <span className={`h-2 w-2 rounded-full ${s.is_booked ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                          {fmtRange(s.start_time, s.end_time)}
                          {s.is_booked && s.booking && (
                            <>
                              <span className="font-bold text-slate-600">· {s.booking.team_name}</span>
                              <button
                                type="button"
                                onClick={() => cancelBooking(m, s)}
                                title="Cancel this booking and free the slot"
                                className="ml-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-red-600 shadow-sm transition hover:bg-red-50"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Availability editor */}
                {openFor === m.id && (
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      Add availability for {m.name}
                    </p>
                    <div className="mt-3 space-y-2">
                      {slotRows.map((r, i) => (
                        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                          <input
                            type="date"
                            value={r.date}
                            onChange={(e) =>
                              setSlotRows((rows) => rows.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))
                            }
                            className={inputClass}
                          />
                          <input
                            type="time"
                            value={r.start}
                            onChange={(e) =>
                              setSlotRows((rows) => rows.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))
                            }
                            className={inputClass}
                            aria-label="Start time"
                          />
                          <input
                            type="time"
                            value={r.end}
                            onChange={(e) =>
                              setSlotRows((rows) => rows.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))
                            }
                            className={inputClass}
                            aria-label="End time"
                          />
                          {slotRows.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => setSlotRows((rows) => rows.filter((_, j) => j !== i))}
                              className="rounded-lg px-2 text-lg font-bold text-slate-400 hover:bg-slate-200 hover:text-red-600"
                              title="Remove row"
                            >
                              ×
                            </button>
                          ) : (
                            <span />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSlotRows((rows) => [...rows, emptyRow()])}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
                      >
                        + Add another
                      </button>
                      <Button type="button" onClick={() => saveSlots(m)} disabled={slotBusy}>
                        {slotBusy ? 'Saving…' : 'Save slots'}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
