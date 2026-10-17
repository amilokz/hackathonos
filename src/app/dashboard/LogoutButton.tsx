'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }
  return (
    <Button variant="secondary" onClick={logout}>
      Log out
    </Button>
  );
}
