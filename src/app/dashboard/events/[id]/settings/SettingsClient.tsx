'use client';

import { useEffect, useState } from 'react';

interface Settings {
  entry_fee: number;
  payment_instructions: string;
  white_label: boolean;
  custom_footer_text: string;
}

export default function SettingsClient({ eventId }: { eventId: string }) {
  const [settings, setSettings] = useState<Settings>({
    entry_fee: 0,
    payment_instructions: '',
    white_label: false,
    custom_footer_text: '',
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/events/${eventId}/settings`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.settings) setSettings(d.settings);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function save() {
    setError('');
    setSaved(false);
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${eventId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to save settings.');
        return;
      }
      setSettings(data.settings);
      setSaved(true);
    } catch {
      setError('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const input =
    'w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800';

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">Entry fee & payments</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Charge teams an entry fee. Payments are verified manually — put your Sadapay / bank
          details below so teams know where to send the fee.
        </p>
        <div className="mt-4 grid gap-4">
          <label className="block max-w-xs">
            <span className="mb-1 block text-sm font-medium">Entry fee (0 = free event)</span>
            <input
              type="number"
              min={0}
              step="any"
              value={settings.entry_fee}
              onChange={(e) => setSettings({ ...settings, entry_fee: Number(e.target.value) })}
              className={input}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Payment instructions</span>
            <textarea
              value={settings.payment_instructions}
              onChange={(e) => setSettings({ ...settings, payment_instructions: e.target.value })}
              rows={4}
              placeholder={'Send the entry fee to Sadapay 0312-3456789 (Ali Raza) and WhatsApp the screenshot to the same number. Your team is confirmed once payment is verified.'}
              className={input}
            />
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">White label</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Replace the “Powered by HackathonOS / AKCLNT” footer on public pages and certificates
          with your own text — useful when licensing the platform to other organizers.
        </p>
        <label className="mt-4 flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.white_label}
            onChange={(e) => setSettings({ ...settings, white_label: e.target.checked })}
            className="h-5 w-5"
          />
          <span className="text-sm font-medium">Enable white label for this event</span>
        </label>
        {settings.white_label && (
          <label className="mt-4 block max-w-md">
            <span className="mb-1 block text-sm font-medium">Custom footer text</span>
            <input
              value={settings.custom_footer_text}
              onChange={(e) => setSettings({ ...settings, custom_footer_text: e.target.value })}
              className={input}
              placeholder="Organized by TechKhwa"
            />
          </label>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-700">Settings saved.</p>}
      <button
        onClick={save}
        disabled={busy}
        className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
      >
        {busy ? 'Saving…' : 'Save settings'}
      </button>
    </div>
  );
}
