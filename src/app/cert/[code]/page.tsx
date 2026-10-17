import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { getDb, migrate } from '@/lib/db';
import { ensureSettingsColumns } from '@/lib/settings-columns';
import PrintButton from './PrintButton';

export const dynamic = 'force-dynamic';

const TYPE_LABELS: Record<string, string> = {
  participant: 'Certificate of Participation',
  winner: 'Certificate of Achievement',
  judge: 'Certificate of Appreciation',
  sponsor: 'Certificate of Sponsorship',
};

function getBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (env) return env.replace(/\/$/, '');
  const h = headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
}

export default async function CertificatePage({ params }: { params: { code: string } }) {
  await migrate();
  await ensureSettingsColumns();
  const code = params.code.trim().toUpperCase();

  const db = getDb();
  const cert = await db
    .prepare(
      `SELECT c.recipient_name, c.recipient_email, c.type, c.created_at, c.verification_code,
              e.name AS event_name, e.start_date, e.end_date, e.white_label, e.custom_footer_text,
              o.name AS organizer_name
       FROM certificates c
       JOIN events e ON e.id = c.event_id
       JOIN organizers o ON o.id = e.organizer_id
       WHERE c.verification_code = ?`,
    )
    .get(code) as
    | {
        recipient_name: string;
        recipient_email: string;
        type: string;
        created_at: string;
        verification_code: string;
        event_name: string;
        start_date: string;
        end_date: string;
        white_label: number | null;
        custom_footer_text: string | null;
        organizer_name: string;
      }
    | undefined;

  if (!cert) notFound();

  const verifyUrl = `${getBaseUrl()}/verify/${cert.verification_code}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 160 });
  const dateStr = new Date(cert.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const title = TYPE_LABELS[cert.type] ?? 'Certificate';
  const footer = cert.white_label && cert.custom_footer_text ? cert.custom_footer_text : null;

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-4xl items-center justify-between print:hidden">
        <a href="/" className="text-sm text-slate-500 hover:underline">
          ← HackathonOS
        </a>
        <PrintButton />
      </div>

      <div className="print-area mx-auto max-w-4xl bg-white p-8 shadow-xl sm:p-12 print:m-0 print:max-w-full print:shadow-none">
        <div className="border-8 border-double border-indigo-500/60 p-8 text-center sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            {cert.event_name}
          </p>
          <h1 className="mt-4 font-serif text-4xl font-bold text-slate-900 sm:text-5xl">{title}</h1>
          <p className="mt-6 text-sm uppercase tracking-widest text-slate-500">
            Proudly presented to
          </p>
          <p className="mt-2 font-serif text-3xl italic text-slate-900 sm:text-4xl">
            {cert.recipient_name}
          </p>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-slate-600">
            {cert.type === 'winner' &&
              `For outstanding performance and winning at ${cert.event_name}.`}
            {cert.type === 'judge' &&
              `In recognition of your valuable contribution as a judge at ${cert.event_name}.`}
            {cert.type === 'sponsor' &&
              `In gratitude for your generous sponsorship of ${cert.event_name}.`}
            {cert.type === 'participant' &&
              `For participating in ${cert.event_name} and being part of the builder community.`}
          </p>

          <div className="mt-10 flex items-end justify-between gap-6 text-left">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400">Date</p>
              <p className="mt-1 font-medium text-slate-800">{dateStr}</p>
              <p className="mt-4 text-xs uppercase tracking-widest text-slate-400">Organized by</p>
              <p className="mt-1 font-medium text-slate-800">{cert.organizer_name}</p>
            </div>
            <div className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="Verify certificate" className="h-28 w-28" />
              <p className="mt-1 font-mono text-[10px] text-slate-500">{cert.verification_code}</p>
              <p className="text-[10px] text-slate-400">Scan to verify</p>
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-[11px] text-slate-400">
          {footer ?? 'Powered by HackathonOS · Built by AKCLNT'}
        </p>
      </div>
    </div>
  );
}
