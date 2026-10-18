'use client';

import { useState } from 'react';

/**
 * Footer newsletter mini-form. POSTs to /api/newsletter and shows
 * an inline "Subscribed!" confirmation on success.
 */
export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'busy') return;
    setState('busy');
    setError('');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setState('error');
        setError(data.error || 'Could not subscribe. Please try again.');
        return;
      }
      setState('done');
    } catch {
      setState('error');
      setError('Network error. Please try again.');
    }
  }

  if (state === 'done') {
    return (
      <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
        Subscribed! 🎉
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={state === 'busy'}
          aria-label="Email address"
          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={state === 'busy'}
          className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state === 'busy' ? '…' : 'Subscribe'}
        </button>
      </div>
      {state === 'error' && <p className="text-xs text-red-600">{error}</p>}
      <p className="text-xs text-slate-400">Hackathon tips &amp; product updates. No spam.</p>
    </form>
  );
}
