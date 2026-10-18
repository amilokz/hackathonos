'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

/**
 * Progressive-enhancement QR scanner: streams the phone camera, decodes
 * frames with jsqr, and reports the first successfully decoded string.
 * Falls back gracefully when the camera is unavailable or denied.
 */
export default function Scanner({ onScanned }: { onScanned: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const doneRef = useRef(false);
  const onScannedRef = useRef(onScanned);
  onScannedRef.current = onScanned;

  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }, []);

  // Always release the camera on unmount.
  useEffect(() => () => stop(), [stop]);

  const tick = useCallback(() => {
    if (doneRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;

    // Cap the decode size for speed on phones.
    const scale = Math.min(1, 640 / Math.max(w, h));
    canvas.width = Math.floor(w * scale);
    canvas.height = Math.floor(h * scale);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(imageData.data, canvas.width, canvas.height, {
        inversionAttempts: 'attemptBoth',
      });
      if (result && result.data) {
        doneRef.current = true;
        const code = result.data.trim();
        stop();
        onScannedRef.current(code);
      }
    } catch {
      // A bad frame shouldn't kill the loop — just wait for the next tick.
    }
  }, [stop]);

  const start = useCallback(async () => {
    setError(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError(
        'This browser can\u2019t access the camera. You can still enter the check-in code manually below.',
      );
      return;
    }
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error('video unavailable');
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      await video.play();
      doneRef.current = false;
      setScanning(true);
      timerRef.current = window.setInterval(tick, 400);
    } catch {
      setError(
        'Camera access was denied or isn\u2019t available. You can still enter the check-in code manually below.',
      );
    } finally {
      setStarting(false);
    }
  }, [tick]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      {!scanning ? (
        <div>
          <button
            type="button"
            onClick={start}
            disabled={starting}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {starting ? 'Starting camera…' : '📷 Scan QR with camera'}
          </button>
          {error && <p className="mt-2 text-sm text-slate-500">{error}</p>}
          {!error && (
            <p className="mt-2 text-xs text-slate-400">
              Or type the code printed under the QR — the camera is optional.
            </p>
          )}
        </div>
      ) : (
        <div>
          <div className="relative overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} className="h-56 w-full object-cover" playsInline muted />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-40 w-40 rounded-xl border-4 border-indigo-400/80" />
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-slate-500">
            Point the camera at the team pass QR…
          </p>
          <button
            type="button"
            onClick={stop}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Stop camera
          </button>
        </div>
      )}
      {/* Hidden when idle; needed only while scanning. */}
      <canvas ref={canvasRef} className="hidden" aria-hidden />
    </div>
  );
}
