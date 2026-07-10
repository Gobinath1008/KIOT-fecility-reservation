'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export function useLogout() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Logout failed');
      router.push('/login');
      router.refresh();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error(error.message || 'Unable to log out');
    }
  };

  return handleLogout;
}