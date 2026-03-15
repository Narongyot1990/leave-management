'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LineCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<string>('');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const lineError = searchParams.get('error');
    const lineErrorDesc = searchParams.get('error_description');

    if (lineError) {
      setError(`LINE Login ถูกยกเลิก: ${lineErrorDesc || lineError}`);
      return;
    }

    if (!code) {
      setError('ไม่ได้รับ authorization code จาก LINE');
      return;
    }

    if (state !== 'driver_login') {
      setError('Invalid state');
      return;
    }

    const handleLogin = async () => {
      try {
        const redirectUri = window.location.origin + '/login/callback';
        setDebug('Redirect URI: ' + redirectUri);

        const response = await fetch('/api/auth/line', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            code,
            redirectUri 
          }),
        });

        const data = await response.json();
        console.log('Login response:', data);

        if (data.success) {
          const role = data.user?.role;
          if (role === 'leader' || role === 'admin') {
            localStorage.setItem('leaderUser', JSON.stringify(data.user));
            router.push('/leader/home');
          } else {
            localStorage.setItem('driverUser', JSON.stringify(data.user));
            router.push('/home');
          }
        } else {
          setError(data.error + (data.details ? ' - ' + JSON.stringify(data.details) : ''));
        }
      } catch (err) {
        setError('An error occurred: ' + String(err));
      }
    };

    handleLogin();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
        <div className="card-neo p-8 text-center w-full max-w-sm">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--danger-light)' }}>
            <svg className="w-7 h-7" style={{ color: 'var(--danger)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <p className="text-fluid-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>เข้าสู่ระบบไม่สำเร็จ</p>
          <p className="text-fluid-sm mb-3" style={{ color: 'var(--text-muted)' }}>{error}</p>
          <a href="/login" className="btn btn-primary w-full">
            กลับไปหน้าเข้าสู่ระบบ
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-[3px] animate-spin mx-auto mb-4" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
        <p className="text-fluid-sm font-medium" style={{ color: 'var(--text-muted)' }}>กำลังเข้าสู่ระบบ...</p>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-[3px] animate-spin mx-auto mb-4" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
        <p className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>กำลังโหลด...</p>
      </div>
    </div>
  );
}

export default function LineCallbackPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LineCallbackContent />
    </Suspense>
  );
}



