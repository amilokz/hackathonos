'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, Button, Field, inputClass, ErrorNote, SuccessNote, DsIcon } from '@/components/ui';
import { DataTable, StatusPill, type DataTableColumn } from '@/components/design-system';

const TYPES = [
  { value: 'participant', label: 'Participant' },
  { value: 'winner', label: 'Winner' },
  { value: 'judge', label: 'Judge' },
  { value: 'sponsor', label: 'Sponsor' },
];

const MAX_PDF_BYTES = 5 * 1024 * 1024; // 5MB

interface Cert {
  id: string;
  recipient_name: string;
  recipient_email: string;
  type: string;
  verification_code: string;
  pdf_url: string;
  template_id: string;
  template_name: string | null;
  created_at: string;
}

interface Template {
  id: string;
  name: string;
  pdf_url: string;
  created_at: string;
  issued_count: number;
}

interface PoolMember {
  name: string;
  email: string;
  team_name: string;
}

interface Pools {
  team_members: PoolMember[];
  team_count: number;
  winners: PoolMember[];
  winners_ranked: { title: string; team_name: string; rank: number; human_total: number | null }[];
}

function rankLabel(rank: number): string {
  if (rank === 1) return '1st';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  return `${rank}th`;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CertificatesClient({ eventId }: { eventId: string }) {
  // Existing text-list generation (kept as-is).
  const [type, setType] = useState('participant');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [certs, setCerts] = useState<Cert[]>([]);
  const [justCreated, setJustCreated] = useState(0);

  // PDF templates.
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tplName, setTplName] = useState('');
  const [tplFileName, setTplFileName] = useState('');
  const [tplBusy, setTplBusy] = useState(false);
  const [tplError, setTplError] = useState('');
  const [tplOk, setTplOk] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Bulk distribute.
  const [pools, setPools] = useState<Pools | null>(null);
  const [distTemplate, setDistTemplate] = useState('');
  const [distType, setDistType] = useState('participant');
  const [groupTeams, setGroupTeams] = useState(false);
  const [groupWinners, setGroupWinners] = useState(false);
  const [distText, setDistText] = useState('');
  const [distBusy, setDistBusy] = useState(false);
  const [distError, setDistError] = useState('');
  const [distOk, setDistOk] = useState('');

  async function load() {
    const res = await fetch(`/api/events/${eventId}/certificates`);
    if (res.ok) {
      const data = await res.json();
      setCerts(data.certificates ?? []);
    }
  }

  async function loadTemplates() {
    const res = await fetch(`/api/events/${eventId}/certificates/templates`);
    if (res.ok) {
      const data = await res.json();
      setTemplates(data.templates ?? []);
    }
  }

  async function loadPools() {
    const res = await fetch(`/api/events/${eventId}/certificates/recipients`);
    if (res.ok) {
      const data = await res.json();
      setPools({
        team_members: data.team_members ?? [],
        team_count: data.team_count ?? 0,
        winners: data.winners ?? [],
        winners_ranked: data.winners_ranked ?? [],
      });
    }
  }

  useEffect(() => {
    load();
    loadTemplates();
    loadPools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function generate() {
    setError('');
    setJustCreated(0);
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setError('Enter at least one name.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${eventId}/certificates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, lines }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to generate certificates.');
        return;
      }
      setJustCreated(data.count ?? 0);
      setText('');
      await load();
    } catch {
      setError('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function uploadTemplate() {
    setTplError('');
    setTplOk('');
    const file = fileRef.current?.files?.[0];
    if (!tplName.trim()) {
      setTplError('Give the template a name first.');
      return;
    }
    if (!file) {
      setTplError('Choose a PDF file to upload.');
      return;
    }
    if (file.type !== 'application/pdf') {
      setTplError('Only PDF files are allowed.');
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setTplError('PDF must be smaller than 5MB.');
      return;
    }
    setTplBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const up = await fetch('/api/uploads/pdf', { method: 'POST', body: form });
      const upData = await up.json();
      if (!up.ok) {
        setTplError(upData.error ?? 'Upload failed. Try again.');
        return;
      }
      const res = await fetch(`/api/events/${eventId}/certificates/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tplName.trim(), pdf_url: upData.url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTplError(data.error ?? 'Failed to save template.');
        return;
      }
      setTplName('');
      setTplFileName('');
      if (fileRef.current) fileRef.current.value = '';
      setTplOk(`Template "${data.template.name}" saved.`);
      await loadTemplates();
    } catch {
      setTplError('Network error. Try again.');
    } finally {
      setTplBusy(false);
    }
  }

  async function deleteTemplate(id: string, name: string) {
    if (!confirm(`Delete template "${name}"? Issued certificates keep their PDF.`)) return;
    const res = await fetch(`/api/events/${eventId}/certificates/templates/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      if (distTemplate === id) setDistTemplate('');
      await loadTemplates();
    }
  }

  function toggleGroup(which: 'teams' | 'winners') {
    const nextTeams = which === 'teams' ? !groupTeams : groupTeams;
    const nextWinners = which === 'winners' ? !groupWinners : groupWinners;
    setGroupTeams(nextTeams);
    setGroupWinners(nextWinners);
    // Auto-pick a sensible certificate type; the organizer can override.
    setDistType(nextWinners && !nextTeams ? 'winner' : 'participant');
  }

  async function distribute() {
    setDistError('');
    setDistOk('');
    if (!distTemplate) {
      setDistError('Select a PDF template.');
      return;
    }
    const customLines = distText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (!groupTeams && !groupWinners && customLines.length === 0) {
      setDistError('Select at least one recipient group or add a custom list.');
      return;
    }
    const entries = customLines.map((line) => {
      const comma = line.indexOf(',');
      if (comma === -1) return { name: line, email: '' };
      return { name: line.slice(0, comma).trim(), email: line.slice(comma + 1).trim() };
    });

    setDistBusy(true);
    try {
      const res = await fetch(`/api/events/${eventId}/certificates/distribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: distTemplate,
          type: distType,
          groups: [...(groupTeams ? ['teams'] : []), ...(groupWinners ? ['winners'] : [])],
          entries,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDistError(data.error ?? 'Failed to distribute certificates.');
        return;
      }
      const skippedNote = data.skipped > 0 ? ` ${data.skipped} skipped (already had this template).` : '';
      setDistOk(`Issued ${data.count} certificate${data.count === 1 ? '' : 's'}.${skippedNote}`);
      setDistText('');
      await load();
      await loadTemplates();
    } catch {
      setDistError('Network error. Try again.');
    } finally {
      setDistBusy(false);
    }
  }

  const certColumns: DataTableColumn<Cert>[] = [
    {
      key: 'recipient',
      header: 'Recipient',
      sortable: true,
      value: (c) => c.recipient_name.toLowerCase(),
      render: (c) => <span className="font-semibold text-slate-900">{c.recipient_name}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      render: (c) => (
        <span className="block max-w-[220px] truncate text-xs text-slate-500" title={c.recipient_email || undefined}>
          {c.recipient_email || '—'}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      value: (c) => c.type,
      render: (c) => <StatusPill status={c.type} />,
    },
    {
      key: 'pdf',
      header: 'PDF',
      sortable: true,
      value: (c) => (c.pdf_url ? c.template_name ?? 'pdf' : ''),
      render: (c) =>
        c.pdf_url ? (
          <a
            href={c.pdf_url}
            target="_blank"
            rel="noreferrer"
            title="Download PDF certificate"
            className="inline-flex max-w-[160px] items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            <DsIcon name="download" className="h-4 w-4 shrink-0" />
            <span className="truncate">{c.template_name || 'PDF'}</span>
          </a>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      key: 'code',
      header: 'Verification code',
      render: (c) => (
        <a
          href={`/verify/${c.verification_code}`}
          target="_blank"
          rel="noreferrer"
          title="Open verification page"
          className="font-mono text-xs font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-indigo-700"
        >
          {c.verification_code}
        </a>
      ),
    },
    {
      key: 'issued',
      header: 'Issued',
      sortable: true,
      value: (c) => c.created_at || '',
      render: (c) => (
        <span className="whitespace-nowrap text-xs text-slate-500">{formatDate(c.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'View',
      align: 'right',
      render: (c) => (
        <a
          href={`/cert/${c.verification_code}`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          View
        </a>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Existing text-list generation — unchanged behavior. */}
      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">Generate certificates</h2>
        <p className="mt-1 text-sm text-slate-500">
          One per line. Use <code className="rounded bg-slate-100 px-1 text-slate-600">Name,email</code> to
          also store the recipient&apos;s email.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-[220px_1fr]">
          <Field label="Certificate type">
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Recipients">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder={'Ayesha Khan,ayesha@example.com\nBilal Ahmed\nSara Malik,sara@example.com'}
              className={`${inputClass} font-mono`}
            />
          </Field>
        </div>
        <ErrorNote message={error || null} />
        <SuccessNote
          message={justCreated > 0 ? `Generated ${justCreated} certificate${justCreated === 1 ? '' : 's'}.` : null}
        />
        <div className="mt-4">
          <Button onClick={generate} disabled={busy}>
            {busy ? 'Generating…' : 'Generate certificates'}
          </Button>
        </div>
      </Card>

      {/* PDF template library. */}
      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">Certificate templates</h2>
        <p className="mt-1 text-sm text-slate-500">
          Upload a pre-designed PDF certificate (made in Canva or Photoshop, max 5MB). Each
          recipient you distribute it to gets a unique verification code and QR.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Template name">
            <input
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              placeholder="e.g. Winner Certificate 2026"
              className={inputClass}
            />
          </Field>
          <div>
            <span className="mb-1 hidden text-sm font-medium text-slate-700 sm:block">&nbsp;</span>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                setTplFileName(e.target.files?.[0]?.name ?? '');
                setTplError('');
                setTplOk('');
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={tplBusy}
                onClick={() => fileRef.current?.click()}
              >
                <DsIcon name="plus" className="h-4 w-4" />
                {tplFileName ? (tplFileName.length > 24 ? `${tplFileName.slice(0, 24)}…` : tplFileName) : 'Choose PDF'}
              </Button>
              <Button onClick={uploadTemplate} disabled={tplBusy}>
                {tplBusy ? 'Uploading…' : 'Upload template'}
              </Button>
            </div>
          </div>
        </div>
        <ErrorNote message={tplError || null} />
        <SuccessNote message={tplOk || null} />

        <div className="mt-4">
          {templates.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              No templates yet. Upload your first PDF above.
            </p>
          ) : (
            <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200">
              {templates.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-500">
                      Added {formatDate(t.created_at)} · Issued to {t.issued_count}{' '}
                      {t.issued_count === 1 ? 'recipient' : 'recipients'}
                    </p>
                  </div>
                  <a
                    href={t.pdf_url}
                    target="_blank"
                    rel="noreferrer"
                    title="Preview PDF"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <DsIcon name="download" className="h-4 w-4" />
                    Preview
                  </a>
                  <button
                    type="button"
                    onClick={() => deleteTemplate(t.id, t.name)}
                    title="Delete template"
                    className="rounded-xl border border-slate-300 p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <DsIcon name="trash" className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {/* Bulk distribute. */}
      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">Distribute PDF</h2>
        <p className="mt-1 text-sm text-slate-500">
          Issue a PDF template to many recipients at once — one certificate per person, each with
          a unique verification code.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="PDF template">
            <select
              value={distTemplate}
              onChange={(e) => setDistTemplate(e.target.value)}
              className={inputClass}
            >
              <option value="">Select a template…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Certificate type">
            <select
              value={distType}
              onChange={(e) => setDistType(e.target.value)}
              className={inputClass}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-4 space-y-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 px-4 py-3 transition hover:bg-slate-50">
            <input
              type="checkbox"
              checked={groupTeams}
              onChange={() => toggleGroup('teams')}
              className="mt-1 h-4 w-4 accent-indigo-600"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-900">
                All approved team members{pools ? ` (${pools.team_members.length})` : ''}
              </span>
              <span className="block text-xs text-slate-500">
                {pools ? `${pools.team_count} approved teams` : 'Loading…'}
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 px-4 py-3 transition hover:bg-slate-50">
            <input
              type="checkbox"
              checked={groupWinners}
              onChange={() => toggleGroup('winners')}
              className="mt-1 h-4 w-4 accent-indigo-600"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-900">
                Winners — top 3{pools ? ` (${pools.winners.length} members)` : ''}
              </span>
              <span className="block text-xs text-slate-500">
                {pools
                  ? pools.winners_ranked.length > 0
                    ? pools.winners_ranked
                        .map((w) => `${rankLabel(w.rank)} ${w.team_name}`)
                        .join(' · ')
                    : 'No scored projects yet'
                  : 'Loading…'}
              </span>
            </span>
          </label>
        </div>

        <div className="mt-4">
          <Field
            label="Custom list (optional)"
            hint="Same Name,email format as above — merged with the selected groups, duplicates removed."
          >
            <textarea
              value={distText}
              onChange={(e) => setDistText(e.target.value)}
              rows={4}
              placeholder={'Guest Speaker,guest@example.com\nVIP Judge'}
              className={`${inputClass} font-mono`}
            />
          </Field>
        </div>

        <ErrorNote message={distError || null} />
        <SuccessNote message={distOk || null} />
        <div className="mt-4">
          <Button onClick={distribute} disabled={distBusy}>
            {distBusy ? 'Distributing…' : 'Distribute certificates'}
          </Button>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">Issued certificates</h2>
        <p className="mt-1 text-sm text-slate-500">
          QR-verified certificates, printable from the public verification page.
        </p>
        <div className="mt-4">
          <DataTable
            columns={certColumns}
            rows={certs}
            searchable
            searchPlaceholder="Search recipients or codes…"
            emptyTitle="No certificates issued yet"
            emptyText="Generate or distribute your first certificates above."
          />
        </div>
      </Card>
    </div>
  );
}
