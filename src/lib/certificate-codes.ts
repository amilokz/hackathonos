import { randomUUID } from 'node:crypto';
import { getDb } from './db';

function shortCode(): string {
  return randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
}

/**
 * Unique certificate verification code (10 uppercase alphanumerics,
 * e.g. CERT-style "A1B2C3D4E5"). Retries on collision.
 */
export async function uniqueCertificateCode(db: ReturnType<typeof getDb>): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = shortCode();
    const hit = await db.prepare('SELECT 1 FROM certificates WHERE verification_code = ?').get(code);
    if (!hit) return code;
  }
  // Extremely unlikely fallback: longer code.
  return randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase();
}
