/**
 * Shared logout utility — clears auth cookies via API + local storage.
 * Use this instead of duplicating logout logic in every page.
 */
export async function performLogout(role: 'driver' | 'leader' | 'admin' = 'driver'): Promise<string> {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch { /* ignore */ }

  localStorage.removeItem('driverUser');
  localStorage.removeItem('leaderUser');
  localStorage.removeItem('pendingStatus');

  // Leaders and Drivers use LINE login (/login)
  // Only Admin uses Email login (/leader/login)
  return role === 'admin' ? '/leader/login' : '/login';
}
