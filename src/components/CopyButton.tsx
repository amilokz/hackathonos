'use client';

import { useState } from 'react';

/**
 * Copy-to-clipboard button with inline success feedback (no alert()).
 * When `addOrigin` is true and the text starts with '/', the page's origin
 * is prepended so a path becomes a full shareable URL.
 */
export default function CopyButton({
  text,
  label = '⧉ Copy',
  addOrigin = false,
  className = '',
}: {
  text: string;
  label?: string;
  addOrigin?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    let value = text;
    if (addOrigin && text.startsWith('/') && typeof window !== 'undefined') {
      value = `${window.location.origin}${text}`;
    }
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard API unavailable (permissions) — fall back to a textarea.
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 ${className}`}
    >
      {copied ? '✓ Copied!' : label}
    </button>
  );
}
