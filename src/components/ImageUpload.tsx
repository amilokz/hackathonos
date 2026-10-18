'use client';

import { useRef, useState } from 'react';
import { inputClass } from '@/components/ui';

const ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml';
const MAX_BYTES = 1024 * 1024; // 1MB

interface Props {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
}

/**
 * Image picker with direct upload to /api/uploads.
 * Shows a live preview thumbnail; keeps a manual "paste URL" fallback.
 */
export default function ImageUpload({ value, onChange, placeholder }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrl, setShowUrl] = useState(false);

  function pickFile() {
    setError(null);
    fileRef.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);

    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      setError('Only PNG, JPEG, WebP or SVG images are allowed.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Image must be smaller than 1MB.');
      return;
    }

    // Live preview immediately
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/uploads', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Upload failed. Try again.');
        setPreview(null);
        return;
      }
      onChange(data.url);
    } catch {
      setError('Network error. Please try again.');
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    onChange('');
    setPreview(null);
    setError(null);
  }

  const shown = preview ?? (value || null);

  return (
    <div>
      <div className="flex items-center gap-3">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown}
            alt="Logo preview"
            className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 bg-white object-contain"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">
            No logo
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={pickFile}
            disabled={busy}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? 'Uploading…' : value || preview ? 'Change image' : 'Upload image'}
          </button>
          {(value || preview) && (
            <button
              type="button"
              onClick={clear}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Remove
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={onFile} />
      </div>
      {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
      <button
        type="button"
        onClick={() => setShowUrl((s) => !s)}
        className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
      >
        {showUrl ? 'Hide URL field' : 'or paste an image URL instead'}
      </button>
      {showUrl && (
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setPreview(null);
          }}
          className={`${inputClass} mt-1 font-mono text-xs`}
          placeholder={placeholder ?? 'https://…/logo.png'}
        />
      )}
    </div>
  );
}
