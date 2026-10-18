'use client';

import { useState, type FormEvent } from 'react';

const inputStyles =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200';

type Status = 'idle' | 'sending' | 'success' | 'error';

export default function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  function fail(msg: string) {
    setError(msg);
    setStatus('error');
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'sending') return;
    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get('name') ?? '').trim(),
      email: String(data.get('email') ?? '').trim(),
      subject: String(data.get('subject') ?? '').trim(),
      message: String(data.get('message') ?? '').trim(),
    };

    // Lightweight client-side validation (the API re-validates server-side).
    if (!payload.name) return fail('Please enter your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(payload.email))
      return fail('Please enter a valid email address.');
    if (payload.message.length < 10) return fail('Your message needs to be at least 10 characters.');

    setStatus('sending');
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        return fail(json.error || 'Something went wrong. Please try again.');
      }
      setStatus('success');
      form.reset();
    } catch {
      return fail('Could not reach the server. Check your connection and try again.');
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <span className="text-4xl" aria-hidden="true">
          ✅
        </span>
        <h2 className="mt-3 text-xl font-bold text-slate-900">Message sent!</h2>
        <p className="mt-2 text-sm text-slate-600">
          Thanks for reaching out — we&rsquo;ll get back to you at the email you provided.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Name <span className="text-rose-500">*</span>
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            autoComplete="name"
            maxLength={120}
            placeholder="Your name"
            className={inputStyles}
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Email <span className="text-rose-500">*</span>
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={160}
            placeholder="you@example.com"
            className={inputStyles}
          />
        </div>
      </div>
      <div>
        <label htmlFor="contact-subject" className="mb-1.5 block text-sm font-semibold text-slate-700">
          Subject <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id="contact-subject"
          name="subject"
          type="text"
          maxLength={160}
          placeholder="What's this about?"
          className={inputStyles}
        />
      </div>
      <div>
        <label htmlFor="contact-message" className="mb-1.5 block text-sm font-semibold text-slate-700">
          Message <span className="text-rose-500">*</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={6}
          maxLength={10000}
          placeholder="Tell us about your hackathon, question, or feedback…"
          className={`${inputStyles} resize-y`}
        />
        <p className="mt-1 text-xs text-slate-400">Minimum 10 characters.</p>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {status === 'sending' ? 'Sending…' : '📨 Send message'}
      </button>
    </form>
  );
}
