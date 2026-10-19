'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { Card, Button, Field, inputClass, ErrorNote, SuccessNote, DsIcon } from '@/components/ui';
import ImageUpload from '@/components/ImageUpload';
import { BRAND_PRESETS, DEFAULT_BRAND, brandVars, isValidBrandColor } from '@/lib/brand';

interface Settings {
  entry_fee: number;
  payment_instructions: string;
  white_label: boolean;
  custom_footer_text: string;
  require_team_approval: boolean;
  brand_color: string;
  brand_logo_url: string;
  brand_name: string;
}

interface PlanInfo {
  plan: string;
  white_label_granted: boolean;
  white_label_eligible: boolean;
}

/** Live mock of a public page header — updates as the organizer picks colors. */
function BrandingPreview({
  color,
  logoUrl,
  brandName,
  eventName,
}: {
  color: string;
  logoUrl: string;
  brandName: string;
  eventName: string;
}) {
  const name = brandName.trim() || eventName || 'Your event';
  const vars = brandVars(isValidBrandColor(color) ? color : DEFAULT_BRAND) as CSSProperties;
  return (
    <div className="mt-6">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Live preview</p>
      <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white" style={vars}>
        <div className="h-1.5 bg-[var(--brand)]" />
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          {logoUrl.trim() ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={`${name} logo`} className="h-9 w-9 rounded-xl object-contain" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand)] text-sm font-black text-white">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="truncate text-base font-extrabold tracking-tight text-slate-900">{name}</span>
          <span className="ml-auto shrink-0 rounded-xl bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold text-white">
            Register
          </span>
        </div>
        <div className="px-4 py-5">
          <p className="text-lg font-extrabold tracking-tight text-slate-900">
            {eventName || 'Event headline'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">
              Register your team
            </span>
            <span className="rounded-xl border border-[var(--brand)] px-4 py-2 text-sm font-semibold text-[var(--brand)]">
              View leaderboard
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsClient({ eventId, eventName }: { eventId: string; eventName: string }) {
  const [settings, setSettings] = useState<Settings>({
    entry_fee: 0,
    payment_instructions: '',
    white_label: false,
    custom_footer_text: '',
    require_team_approval: false,
    brand_color: DEFAULT_BRAND,
    brand_logo_url: '',
    brand_name: '',
  });
  const [hexDraft, setHexDraft] = useState(DEFAULT_BRAND);
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/events/${eventId}/settings`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.settings) {
          setSettings(d.settings);
          if (d.settings.brand_color) setHexDraft(d.settings.brand_color);
        }
        if (d?.plan) setPlan(d.plan);
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
      if (data.settings?.brand_color) setHexDraft(data.settings.brand_color);
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
            disabled={plan !== null && !plan.white_label_eligible}
            className="h-5 w-5 rounded accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span className="text-sm font-medium text-slate-700">Enable white label for this event</span>
        </label>
        {plan !== null && !plan.white_label_eligible && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
            <DsIcon name="lock" className="h-4 w-4 text-slate-400" />
            Upgrade to Pro to unlock white label.
          </p>
        )}
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

      <Card className="p-6 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900">Branding</h2>
        <p className="mt-1 text-sm text-slate-500">
          Rebrand the public pages for this event — your accent color, logo and display name —
          with no code changes. Works alongside white label: branding recolors the page, white
          label removes the HackathonOS / AKCLNT footer text.
        </p>

        <div className="mt-4 grid gap-5">
          <Field label="Brand color">
            <div className="flex flex-wrap items-center gap-2">
              {BRAND_PRESETS.map((p) => {
                const active =
                  settings.brand_color.trim().toLowerCase() === p.hex.toLowerCase();
                return (
                  <button
                    key={p.hex}
                    type="button"
                    title={p.name}
                    aria-label={`${p.name} (${p.hex})`}
                    aria-pressed={active}
                    onClick={() => {
                      setSettings({ ...settings, brand_color: p.hex });
                      setHexDraft(p.hex);
                    }}
                    style={{ backgroundColor: p.hex }}
                    className={`h-9 w-9 rounded-full transition ${
                      active
                        ? 'ring-2 ring-slate-900 ring-offset-2'
                        : 'ring-1 ring-slate-300 hover:ring-slate-500'
                    }`}
                  />
                );
              })}
              <label
                title="Custom color"
                className="relative h-9 w-9 cursor-pointer overflow-hidden rounded-full ring-1 ring-dashed ring-slate-400"
                style={{ background: 'conic-gradient(#f43f5e,#f59e0b,#10b981,#3b82f6,#8b5cf6,#f43f5e)' }}
              >
                <span className="sr-only">Pick a custom color</span>
                <input
                  type="color"
                  aria-label="Custom color"
                  value={isValidBrandColor(settings.brand_color) ? settings.brand_color : DEFAULT_BRAND}
                  onChange={(e) => {
                    setSettings({ ...settings, brand_color: e.target.value });
                    setHexDraft(e.target.value);
                  }}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>
            </div>
            <div className="mt-2 flex max-w-xs items-center gap-2">
              <input
                value={hexDraft}
                onChange={(e) => {
                  const v = e.target.value;
                  setHexDraft(v);
                  if (isValidBrandColor(v)) setSettings({ ...settings, brand_color: v });
                }}
                onBlur={() => {
                  if (!isValidBrandColor(hexDraft)) {
                    setHexDraft(settings.brand_color);
                  }
                }}
                className={`${inputClass} font-mono uppercase`}
                placeholder="#4F46E5"
                maxLength={7}
                spellCheck={false}
              />
              {!isValidBrandColor(hexDraft) && (
                <span className="shrink-0 text-xs font-medium text-amber-600">
                  Use a #RRGGBB hex color
                </span>
              )}
            </div>
          </Field>

          <Field label="Brand logo" hint="Shown in public page headers. PNG, JPEG, WebP or SVG up to 1MB.">
            <ImageUpload
              value={settings.brand_logo_url}
              onChange={(url) => setSettings({ ...settings, brand_logo_url: url })}
              placeholder="https://…/logo.png"
            />
          </Field>

          <div className="max-w-md">
            <Field label="Brand name">
              <input
                value={settings.brand_name}
                onChange={(e) => setSettings({ ...settings, brand_name: e.target.value })}
                className={inputClass}
                placeholder={eventName || 'Falls back to the event name'}
                maxLength={80}
              />
            </Field>
          </div>
        </div>

        <BrandingPreview
          color={settings.brand_color}
          logoUrl={settings.brand_logo_url}
          brandName={settings.brand_name}
          eventName={eventName}
        />
      </Card>

      <Card className="p-6 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900">Team approvals</h2>
        <p className="mt-1 text-sm text-slate-500">
          When enabled, new teams land in a pending queue and stay invisible on the public
          page, leaderboard and judging until you approve them.
        </p>
        <label className="mt-4 flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={settings.require_team_approval}
            onChange={(e) => setSettings({ ...settings, require_team_approval: e.target.checked })}
            className="h-5 w-5 rounded accent-indigo-600"
          />
          <span className="text-sm font-medium text-slate-700">Require organizer approval for new teams</span>
        </label>
      </Card>

      <ErrorNote message={error || null} />
      <SuccessNote message={saved ? 'Settings saved.' : null} />
      <Button onClick={save} disabled={busy}>
        {busy ? 'Saving…' : 'Save settings'}
      </Button>
    </div>
  );
}
