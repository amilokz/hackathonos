'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, Button, ErrorNote, SuccessNote, EmptyState } from '@/components/ui';
import { DataTable, StatusPill, DsIcon } from '@/components/design-system';

interface Registrant {
  id: string;
  name: string;
  email: string;
  phone: string;
  attended: number;
  reminder_sent: number;
  created_at: string;
}

export default function AttendanceClient({ eventId, eventName }: { eventId: string; eventName: string }) {
  const [regs, setRegs] = useState<Registrant[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [selectAll, setSelectAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/register-individual`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not load registrants');
        return;
      }
      const rows: Registrant[] = data.registrations ?? [];
      setRegs(rows);
      const map: Record<string, boolean> = {};
      for (const r of rows) map[r.id] = r.attended === 1;
      setChecked(map);
      setSelectAll(rows.length > 0 && rows.every((r) => r.attended === 1));
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(id: string, value: boolean) {
    setChecked((c) => {
      const next = { ...c, [id]: value };
      setSelectAll(regs.length > 0 && regs.every((r) => next[r.id]));
      return next;
    });
    setNote(null);
  }

  function toggleAll(value: boolean) {
    const next: Record<string, boolean> = {};
    for (const r of regs) next[r.id] = value;
    setChecked(next);
    setSelectAll(value);
    setNote(null);
  }

  async function saveAttendance() {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch(`/api/events/${eventId}/register-individual`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attended: checked }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not save attendance');
        return;
      }
      setNote(`Attendance saved — ${data.updated} registrant(s) updated.`);
      setRegs((rows) => rows.map((r) => ({ ...r, attended: checked[r.id] ? 1 : 0 })));
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function issueCertificates() {
    const attendedIds = regs.filter((r) => checked[r.id]).map((r) => r.id);
    if (attendedIds.length === 0) {
      setError('Tick at least one attendee first.');
      return;
    }
    if (!window.confirm(`Issue Certificates of Participation to ${attendedIds.length} attendee(s)?`)) {
      return;
    }
    setIssuing(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch(`/api/events/${eventId}/attendance/issue-certificates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_ids: attendedIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not issue certificates');
        return;
      }
      setNote(
        `Issued ${data.issued} certificate(s)${data.skipped ? `, skipped ${data.skipped} (already had one)` : ''}. ${data.emailed} emailed.`,
      );
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIssuing(false);
    }
  }

  const attendedCount = regs.filter((r) => checked[r.id]).length;

  return (
    <Card className="p-5 sm:p-6">
      <ErrorNote message={error} />
      <SuccessNote message={note} />

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-500">Loading registrants…</p>
      ) : regs.length === 0 ? (
        <EmptyState
          icon={<DsIcon name="users" className="h-6 w-6" />}
          title="No registrants yet"
          text={`Share the public event page link — people register with just their name, email and phone for ${eventName}.`}
          compact
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              <span className="font-bold text-slate-900">{regs.length}</span> registered ·{' '}
              <span className="font-bold text-slate-900">{attendedCount}</span> marked attended
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" disabled={busy} onClick={saveAttendance}>
                {busy ? 'Saving…' : 'Save attendance'}
              </Button>
              <Button type="button" disabled={issuing || attendedCount === 0} onClick={issueCertificates}>
                <DsIcon name="award" className="h-4 w-4" />
                {issuing ? 'Issuing…' : 'Issue certificates'}
              </Button>
            </div>
          </div>

          <DataTable
            columns={[
              {
                key: 'select',
                header: (
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={(e) => toggleAll(e.target.checked)}
                    aria-label="Select all"
                    className="h-4 w-4 rounded accent-indigo-600"
                  />
                ),
                render: (r: Registrant) => (
                  <input
                    type="checkbox"
                    checked={!!checked[r.id]}
                    onChange={(e) => toggle(r.id, e.target.checked)}
                    aria-label={`Mark ${r.name} attended`}
                    className="h-4 w-4 rounded accent-indigo-600"
                  />
                ),
              },
              {
                key: 'name',
                header: 'Name',
                sortable: true,
                render: (r: Registrant) => <span className="font-semibold text-slate-900">{r.name}</span>,
                value: (r: Registrant) => r.name,
              },
              {
                key: 'email',
                header: 'Email',
                sortable: true,
                render: (r: Registrant) => <span className="text-slate-600">{r.email}</span>,
                value: (r: Registrant) => r.email,
              },
              {
                key: 'phone',
                header: 'Phone',
                render: (r: Registrant) => <span className="text-slate-600">{r.phone || '—'}</span>,
              },
              {
                key: 'status',
                header: 'Status',
                render: (r: Registrant) => (
                  <StatusPill status={checked[r.id] ? 'attended' : 'registered'} />
                ),
              },
            ]}
            rows={regs}
            searchable
            searchPlaceholder="Search registrants…"
            emptyTitle="No registrants yet."
          />
        </>
      )}
    </Card>
  );
}
