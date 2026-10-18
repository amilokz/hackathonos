import { notFound } from 'next/navigation';
import { getDb, migrate } from '@/lib/db';
import { ensureCertificateColumns } from '@/lib/certificate-columns';
import { ensureSettingsColumns } from '@/lib/settings-columns';
import { formatLongDate } from '@/lib/format';
import { DsIcon } from '@/components/design-system';

export const dynamic = 'force-dynamic';

export default async function VerifyPage({ params }: { params: { code: string } }) {
  await migrate();
  await ensureSettingsColumns();
  await ensureCertificateColumns();
  const code = params.code.trim().toUpperCase();

  const db = getDb();
  const cert = await db
    .prepare(
      `SELECT c.recipient_name, c.type, c.created_at, c.verification_code, c.pdf_url,
              e.name AS event_name, o.name AS organizer_name,
              e.white_label, e.custom_footer_text
       FROM certificates c
       JOIN events e ON e.id = c.event_id
       JOIN organizers o ON o.id = e.organizer_id
       WHERE c.verification_code = ?`,
    )
    .get(code) as
    | {
        recipient_name: string;
        type: string;
        created_at: string;
        verification_code: string;
        pdf_url: string | null;
        event_name: string;
        organizer_name: string;
        white_label: number | null;
        custom_footer_text: string | null;
      }
    | undefined;

  // Unknown codes render the app 404 page (never a 500, never a forged "valid" state).
  if (!cert) notFound();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        {cert ? (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl">
              ✓
            </div>
            <h1 className="mt-4 text-xl font-bold text-slate-900">Certificate verified</h1>
            <p className="mt-1 text-sm text-slate-500">This certificate is genuine.</p>
            <dl className="mt-6 space-y-3 text-left text-sm">
              <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                <dt className="text-slate-500">Recipient</dt>
                <dd className="font-medium text-slate-900">{cert.recipient_name}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                <dt className="text-slate-500">Type</dt>
                <dd className="font-medium capitalize text-slate-900">{cert.type}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                <dt className="text-slate-500">Event</dt>
                <dd className="font-medium text-slate-900">{cert.event_name}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                <dt className="text-slate-500">Organizer</dt>
                <dd className="font-medium text-slate-900">{cert.organizer_name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Issued</dt>
                <dd className="font-medium text-slate-900">
                  {formatLongDate(cert.created_at) || '—'}
                </dd>
              </div>
            </dl>
            <p className="mt-6 font-mono text-xs text-slate-400">{cert.verification_code}</p>
            {cert.pdf_url ? (
              <a
                href={cert.pdf_url}
                download={`certificate-${cert.verification_code}.pdf`}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                <DsIcon name="download" className="h-4 w-4" />
                Download PDF
              </a>
            ) : null}
          </>
        ) : null}
        {cert.white_label && cert.custom_footer_text?.trim() ? (
          <p className="mt-8 text-[11px] text-slate-400">{cert.custom_footer_text}</p>
        ) : !cert.white_label ? (
          <p className="mt-8 text-[11px] text-slate-400">Powered by HackathonOS · Built by AKCLNT</p>
        ) : null}
      </div>
    </div>
  );
}
