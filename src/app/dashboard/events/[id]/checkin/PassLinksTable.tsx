'use client';

import { DataTable, DsIcon, type DataTableColumn } from '@/components/design-system';

export interface TeamPass {
  id: string;
  name: string;
  code: string;
  passUrl: string;
}

const passColumns: DataTableColumn<TeamPass>[] = [
  {
    key: 'name',
    header: 'Team',
    sortable: true,
    value: (t) => t.name.toLowerCase(),
    render: (t) => <span className="font-semibold text-[#111827]">{t.name}</span>,
  },
  {
    key: 'code',
    header: 'Check-in code',
    value: (t) => t.code,
    render: (t) =>
      t.code ? (
        <span className="font-mono text-xs font-bold text-indigo-700">{t.code}</span>
      ) : (
        <span className="text-xs text-slate-400">Created on first visit</span>
      ),
  },
  {
    key: 'link',
    header: 'Pass link',
    align: 'right',
    render: (t) => (
      <a
        href={t.passUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline"
      >
        <DsIcon name="externalLink" className="h-3.5 w-3.5" />
        {t.code ? `Pass link · ${t.code}` : 'Open pass link'}
      </a>
    ),
  },
];

/** Client boundary: DataTable needs render functions that can't cross from a server component. */
export default function PassLinksTable({ passes }: { passes: TeamPass[] }) {
  return (
    <DataTable
      columns={passColumns}
      rows={passes}
      searchable
      searchPlaceholder="Search teams…"
      emptyTitle="No teams yet"
      emptyText="Pass links appear here once teams register for this event."
    />
  );
}
