'use client';

import { useState } from 'react';

export default function SignOutButton() {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await fetch('/api/participants/logout', { method: 'POST' });
    } finally {
      window.location.href = '/p/login';
    }
  }

  return (
    <button
      onClick={signOut}
      disabled={busy}
      className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
