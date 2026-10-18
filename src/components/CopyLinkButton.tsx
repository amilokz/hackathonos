'use client';

import { useState } from 'react';

/**
 * Copies a URL to the clipboard with "Copied ✓" feedback for 2s.
 * Falls back to the legacy execCommand path on non-secure contexts.
 */
export default function CopyLinkButton({ url, label }: { url: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        // Clipboard unavailable — leave state alone.
        return;
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={`Copy ${label} link`}
      aria-label={`Copy ${label} link`}
      className={`shrink-0 rounded-lg border px-2 py-1 text-xs font-semibold transition ${
        copied
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:text-indigo-600'
      }`}
    >
      {copied ? 'Copied ✓' : '⧉ Copy'}
    </button>
  );
}
