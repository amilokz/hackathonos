'use client';

import { useEffect, useState } from 'react';
import { Card, Button } from '@/components/ui';
import { IconChip } from '@/components/dashboard/icons';

type Invite = { code: string; used_by: string | null; created_at: string; used_at: string | null };

export default function InviteCodes() {
  const [codes, setCodes] = useState<Invite[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/organizer/invites');
    if (res.ok) {
      const data = await res.json();
      setCodes(data.codes || []);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function generate() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/organizer/invites', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || 'Could not generate code');
        return;
      }
      setMsg(`New invite code: ${data.code} — share it with the new organizer.`);
      load();
    } catch {
      setMsg('Network error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <IconChip icon="key" tint="violet" size="md" />
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900">Organizer invite codes</h3>
            <p className="mt-1 text-sm text-slate-500">
              New organizer accounts require an invite code. Share a code with trusted team members
              only.
            </p>
          </div>
        </div>
        <Button onClick={generate} disabled={busy}>
          {busy ? 'Generating…' : '+ New code'}
        </Button>
      </div>
      {msg && (
        <p className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700">
          {msg}
        </p>
      )}
      {codes.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-slate-400">
                <th className="pb-2 pr-4">Code</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.code} className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-mono font-bold">{c.code}</td>
                  <td className="py-2 pr-4">
                    {c.used_by ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        Used by {c.used_by}
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-slate-500">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
