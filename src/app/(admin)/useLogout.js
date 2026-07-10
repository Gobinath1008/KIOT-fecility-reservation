'use client';

import { useRouter } from 'next/navigation';

export function useLogout() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Unable to logout. Please try again.');
    }
  };

  return handleLogout;
}