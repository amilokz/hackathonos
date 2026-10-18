'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Card, Button, Field, inputClass } from '@/components/ui';

export default function VerifyPage() {
  const router = useRouter();
  const [code, setCode] = useState('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const c = code.trim();
    if (c) router.push(`/verify/${encodeURIComponent(c)}`);
  }

  return (
    <Container className="flex min-h-[70vh] items-center justify-center py-12">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="text-5xl">🎓</div>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
          Verify a certificate
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Enter the verification code printed on the certificate to confirm its authenticity.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4 text-left">
          <Field label="Certificate code">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className={`${inputClass} font-mono uppercase`}
              placeholder="CERT-XXXXXXXX"
              required
              autoComplete="off"
            />
          </Field>
          <Button type="submit" className="w-full">
            Verify →
          </Button>
        </form>
        <p className="mt-4 text-xs text-slate-400">
          Every HackathonOS certificate carries a unique QR code and verification code.
        </p>
      </Card>
    </Container>
  );
}
