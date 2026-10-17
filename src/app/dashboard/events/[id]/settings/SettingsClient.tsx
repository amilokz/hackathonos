'use client';

import { useEffect, useState } from 'react';
import { Card, Button, Field, inputClass, ErrorNote, SuccessNote } from '@/components/ui';

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

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900">Entry fee & payments</h2>
        <p className="mt-1 text-sm text-slate-500">
          Charge teams an entry fee. Payments are verified manually — put your Sadapay / bank
          details below so teams know where to send the fee.
        </p>
        <div className="mt-4 grid gap-4">
          <div className="max-w-xs">
            <Field label="Entry fee (0 = free event)">
              <input
                type="number"
                min={0}
                step="any"
                value={settings.entry_fee}
                onChange={(e) => setSettings({ ...settings, entry_fee: Number(e.target.value) })}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Payment instructions">
            <textarea
              value={settings.payment_instructions}
              onChange={(e) => setSettings({ ...settings, payment_instructions: e.target.value })}
              rows={4}
              placeholder={'Send the entry fee to Sadapay 0312-3456789 (Ali Raza) and WhatsApp the screenshot to the same number. Your team is confirmed once payment is verified.'}
              className={inputClass}
            />
          </Field>
        </div>
      </Card>

      <Card className="p-6 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900">White label</h2>
        <p className="mt-1 text-sm text-slate-500">
          Replace the “Powered by HackathonOS / AKCLNT” footer on public pages and certificates
          with your own text — useful when licensing the platform to other organizers.
        </p>
        <label className="mt-4 flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={settings.white_label}
            onChange={(e) => setSettings({ ...settings, white_label: e.target.checked })}
            className="h-5 w-5 rounded accent-indigo-600"
          />
          <span className="text-sm font-medium text-slate-700">Enable white label for this event</span>
        </label>
        {settings.white_label && (
          <div className="mt-4 max-w-md">
            <Field label="Custom footer text">
              <input
                value={settings.custom_footer_text}
                onChange={(e) => setSettings({ ...settings, custom_footer_text: e.target.value })}
                className={inputClass}
                placeholder="Organized by TechKhwa"
              />
            </Field>
          </div>
        )}
      </Card>

      <ErrorNote message={error || null} />
      <SuccessNote message={saved ? 'Settings saved.' : null} />
      <Button onClick={save} disabled={busy}>
        {busy ? 'Saving…' : 'Save settings'}
      </Button>
    </div>
  );
}
