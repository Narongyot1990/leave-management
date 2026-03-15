'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getPusherClient } from '@/lib/pusher-client';

/**
 * Listens for force-logout Pusher events targeting this user.
 * When received, clears auth state and redirects to login.
 *
 * @param userId   - Current user's ID (from localStorage or API)
 * @param userRole - 'driver' | 'leader' | 'admin'
 */
export function useForceLogout(userId: string | undefined, userRole: 'driver' | 'leader' | 'admin' = 'driver') {
  const router = useRouter();

  const handleForceLogout = useCallback(
    async (data: { userId: string; reason?: string }) => {
      if (!userId || data.userId !== userId) return;

      // Clear auth cookies via API
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch { /* ignore */ }

      // Clear local storage
      localStorage.removeItem('driverUser');
      localStorage.removeItem('leaderUser');
      localStorage.removeItem('pendingStatus');

      // Redirect to appropriate login page
      const loginPath = userRole === 'driver' ? '/login' : '/login';
      router.push(loginPath);
    },
    [userId, userRole, router]
  );

  useEffect(() => {
    if (!userId) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe('users');
    channel.bind('force-logout', handleForceLogout);

    return () => {
      channel.unbind('force-logout', handleForceLogout);
      pusher.unsubscribe('users');
    };
  }, [userId, handleForceLogout]);
}
