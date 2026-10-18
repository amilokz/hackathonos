'use client';

import { useCallback, useEffect, useState } from 'react';
import Scanner from './Scanner';
import { Card } from '@/components/ui';

interface RosterCheckin {
  member_name: string;
  checked_in_at: string;
}

interface Roster {
  team: { id: string; name: string };
  members: string[];
  already_checked_in: RosterCheckin[];
}

interface ListCheckin {
  id: string;
  member_name: string;
  checked_in_at: string;
  checked_in_by: string;
  team_id: string;
  team_name: string;
}

interface Stats {
  teams: number;
  total_members: number;
  checked_in: number;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function CheckinClient({
  eventId,
  organizerName,
}: {
  eventId: string;
  organizerName: string;
}) {
  const [code, setCode] = useState('');
  const [roster, setRoster] = useState<Roster | null>(null);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [checking, setChecking] = useState<Set<string>>(new Set());
  const [scanMessage, setScanMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const [list, setList] = useState<ListCheckin[]>([]);
  const [stats, setStats] = useState<Stats>({ teams: 0, total_members: 0, checked_in: 0 });

  const refreshAttendance = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/checkin/list`);
      if (!res.ok) return;
      const data = (await res.json()) as { checkins: ListCheckin[]; stats: Stats };
      setList(data.checkins);
      setStats(data.stats);
    } catch {
      // Attendance is nice-to-have on load; errors surface on actions.
    }
  }, [eventId]);

  useEffect(() => {
    void refreshAttendance();
  }, [refreshAttendance]);

  const loadRoster = useCallback(
    async (rawCode: string) => {
      const trimmed = rawCode.trim();
      if (!trimmed) {
        setRosterError('Enter a check-in code first.');
        return;
      }
      setLoadingRoster(true);
      setRosterError(null);
      setScanMessage(null);
      try {
        const res = await fetch(
          `/api/events/${eventId}/checkin/roster?code=${encodeURIComponent(trimmed)}`,
        );
        const data = await res.json();
        if (!res.ok) {
          setRoster(null);
          setRosterError(data.error ?? 'Could not load the roster.');
          return;
        }
        setRoster(data as Roster);
      } catch {
        setRoster(null);
        setRosterError('Network error — try again.');
      } finally {
        setLoadingRoster(false);
      }
    },
    [eventId],
  );

  const handleScanned = useCallback(
    (scannedCode: string) => {
      setCode(scannedCode);
      void loadRoster(scannedCode);
    },
    [loadRoster],
  );

  const checkInMember = useCallback(
    async (memberName: string) => {
      if (!roster) return;
      setChecking((prev) => new Set(prev).add(memberName));
      setScanMessage(null);
      try {
        const res = await fetch(`/api/events/${eventId}/checkin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: code.trim(),
            member_name: memberName,
            checked_in_by: organizerName,
          }),
        });
        const data = await res.json();
        if (res.status === 409) {
          setScanMessage({
            ok: false,
            text: `${memberName} was already checked in${data.checked_in_at ? ` at ${formatTime(data.checked_in_at)}` : ''}.`,
          });
          // Refresh roster so the button flips to the checked state.
          await loadRoster(code);
        } else if (!res.ok) {
          setScanMessage({ ok: false, text: data.error ?? 'Check-in failed.' });
        } else {
          setScanMessage({ ok: true, text: `✅ ${memberName} checked in.` });
          setRoster((prev) =>
            prev
              ? {
                  ...prev,
                  already_checked_in: [
                    ...prev.already_checked_in,
                    { member_name: memberName, checked_in_at: data.checked_in_at },
                  ],
                }
              : prev,
          );
        }
        await refreshAttendance();
      } catch {
        setScanMessage({ ok: false, text: 'Network error — try again.' });
      } finally {
        setChecking((prev) => {
          const next = new Set(prev);
          next.delete(memberName);
          return next;
        });
      }
    },
    [code, eventId, organizerName, roster, loadRoster, refreshAttendance],
  );

  const checkedByName = new Map(
    (roster?.already_checked_in ?? []).map((c) => [c.member_name.toLowerCase(), c.checked_in_at]),
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: scan / manual entry + roster */}
        <div className="space-y-6">
          <Scanner onScanned={handleScanned} />
          <Card className="p-5">
            <h2 className="font-bold text-slate-900">Manual entry</h2>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void loadRoster(code);
              }}
            >
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="CHK-XXXXXX"
                autoComplete="off"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 font-mono text-sm font-bold uppercase tracking-widest text-slate-900 placeholder:font-sans placeholder:font-normal placeholder:normal-case placeholder:tracking-normal focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <button
                type="submit"
                disabled={loadingRoster}
                className="shrink-0 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {loadingRoster ? 'Loading…' : 'Load'}
              </button>
            </form>
            {rosterError && <p className="mt-2 text-sm text-red-600">{rosterError}</p>}
          </Card>

          {roster && (
            <Card className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-900">{roster.team.name}</h2>
                  <p className="text-xs text-slate-500">
                    {checkedByName.size} / {roster.members.length} checked in
                  </p>
                </div>
                <span className="rounded-full bg-indigo-50 px-3 py-1 font-mono text-xs font-bold text-indigo-700">
                  {code.trim().toUpperCase()}
                </span>
              </div>

              {scanMessage && (
                <p
                  className={`mt-3 rounded-xl px-3 py-2 text-sm font-medium ${
                    scanMessage.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {scanMessage.text}
                </p>
              )}

              <ul className="mt-4 space-y-2">
                {roster.members.map((member) => {
                  const checkedAt = checkedByName.get(member.toLowerCase());
                  const busy = checking.has(member);
                  return (
                    <li
                      key={member}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                    >
                      <span className="font-semibold text-slate-800">{member}</span>
                      {checkedAt ? (
                        <span className="text-sm font-semibold text-emerald-700">
                          ✓ {formatTime(checkedAt)}
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void checkInMember(member)}
                          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
                        >
                          {busy ? 'Checking…' : 'Check in'}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              {roster.members.length === 0 && (
                <p className="mt-3 text-sm text-slate-500">
                  This team registered without a member list.
                </p>
              )}
            </Card>
          )}
        </div>

        {/* Right: attendance report */}
        <Card className="h-fit p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900">Attendance</h2>
              <p className="text-xs text-slate-500">
                {stats.checked_in} / {stats.total_members} members · {stats.teams} teams
              </p>
            </div>
            <a
              href={`/api/events/${eventId}/checkin/export`}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              ⬇ Export CSV
            </a>
          </div>

          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{
                width: stats.total_members
                  ? `${Math.round((stats.checked_in / stats.total_members) * 100)}%`
                  : '0%',
              }}
            />
          </div>

          <ul className="mt-4 max-h-96 space-y-2 overflow-y-auto">
            {list.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-2.5 text-sm"
              >
                <div>
                  <p className="font-semibold text-slate-800">{c.member_name}</p>
                  <p className="text-xs text-slate-500">{c.team_name}</p>
                </div>
                <span className="shrink-0 text-xs font-medium text-slate-500">
                  {formatTime(c.checked_in_at)}
                </span>
              </li>
            ))}
          </ul>
          {list.length === 0 && (
            <p className="mt-4 text-sm text-slate-500">
              Nobody has checked in yet — scan the first team pass above.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
