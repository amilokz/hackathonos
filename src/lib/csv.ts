/**
 * Minimal CSV helpers for organizer exports.
 */

export function csvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvResponse(filename: string, header: string[], rows: (string | number | null | undefined)[][]): Response {
  const lines = [header.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))];
  const body = lines.join('\r\n');
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

/** Filenames look like: my-hackathon-2026-10-18.csv */
export function datedFilename(slug: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const safe = slug.replace(/[^a-z0-9-]+/gi, '-').toLowerCase() || 'event';
  return `${safe}-${date}.csv`;
}
