import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  verifyAccessTokenEdge,
  verifyRefreshTokenEdge,
  generateAccessTokenEdge,
  generateRefreshTokenEdge,
} from '@/lib/jwt-edge';

const publicPaths = [
  '/login',
  '/leader/login',
  '/login/callback',
  '/api/auth/line',
  '/api/auth/leader-login',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/seed',
  '/api/car-wash/image',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get('accessToken')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;

  if (!accessToken && !refreshToken) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return redirectToLogin(pathname, request.url);
  }

  if (accessToken) {
    const payload = await verifyAccessTokenEdge(accessToken);
    if (payload) {
      return checkRoleAccess(payload, pathname, request);
    }
  }

  if (refreshToken) {
    const payload = await verifyRefreshTokenEdge(refreshToken);
    if (payload) {
      // Preserve ALL fields from the payload (including branch)
      const tokenPayload = { ...payload };
      const newAccessToken = await generateAccessTokenEdge(tokenPayload);
      const newRefreshToken = await generateRefreshTokenEdge(tokenPayload);

      const response = checkRoleAccess(payload, pathname, request);

      response.cookies.set('accessToken', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60,
        path: '/',
      });
      response.cookies.set('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });

      return response;
    }
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return redirectToLogin(pathname, request.url);
}

function redirectToLogin(pathname: string, baseUrl: string): NextResponse {
  if (pathname.startsWith('/leader')) {
    return NextResponse.redirect(new URL('/leader/login', baseUrl));
  }
  return NextResponse.redirect(new URL('/login', baseUrl));
}

function checkRoleAccess(payload: any, pathname: string, request: NextRequest): NextResponse {
  const { role, status } = payload;

  // Admin access control
  if (role === 'admin') {
    // Admins should strictly stay in /admin or /dashboard
    // If they accidentally hit a /leader path that is NOT a management tool, send them home
    const leaderOnlyPaths = ['/leader/home', '/leader/settings']; 
    if (leaderOnlyPaths.includes(pathname)) {
      return NextResponse.redirect(new URL('/admin/home', request.url));
    }
    return NextResponse.next();
  }

  // Pending users (except on home or logout) are restricted
  if (status === 'pending') {
    const isPublicAllowed = pathname === '/home' || pathname === '/leader/home' || pathname === '/login' || pathname === '/leader/login' || pathname.startsWith('/api/auth/logout') || pathname === '/api/auth/me';
    if (!isPublicAllowed) {
      if (role === 'leader' || pathname.startsWith('/leader')) {
        return NextResponse.redirect(new URL('/leader/home', request.url));
      }
      return NextResponse.redirect(new URL('/home', request.url));
    }
    return NextResponse.next();
  }

  // Leader access control
  if (role === 'leader') {
    // Leaders cannot access /admin paths
    if (pathname.startsWith('/admin/')) {
      return NextResponse.redirect(new URL('/leader/home', request.url));
    }
    // Leaders should stay in /leader paths or dashboard
    if (!pathname.startsWith('/leader') && !pathname.startsWith('/api') && !pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/leader/home', request.url));
    }
    return NextResponse.next();
  }

  // Driver access control
  if (role === 'driver') {
    // Drivers cannot access /leader or /admin paths
    if ((pathname.startsWith('/leader/') && pathname !== '/leader/login') || pathname.startsWith('/admin/')) {
      return NextResponse.redirect(new URL('/home', request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
