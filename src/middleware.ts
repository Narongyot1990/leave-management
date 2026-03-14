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
      return checkRoleAccess(payload.role, pathname, request);
    }
  }

  if (refreshToken) {
    const payload = await verifyRefreshTokenEdge(refreshToken);
    if (payload) {
      // Preserve ALL fields from the payload (including branch)
      const tokenPayload = { ...payload };
      const newAccessToken = await generateAccessTokenEdge(tokenPayload);
      const newRefreshToken = await generateRefreshTokenEdge(tokenPayload);

      const response = checkRoleAccess(payload.role, pathname, request);

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

function checkRoleAccess(role: string, pathname: string, request: NextRequest): NextResponse {
  // Admin has access to everything
  if (role === 'admin') {
    return NextResponse.next();
  }

  // Leader access control
  if (role === 'leader') {
    // Leaders should stay in /leader paths or dashboard
    if (!pathname.startsWith('/leader') && !pathname.startsWith('/api') && !pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/leader/home', request.url));
    }
    return NextResponse.next();
  }

  // Driver access control
  if (role === 'driver') {
    // Drivers cannot access /leader paths
    if (pathname.startsWith('/leader/') && !pathname.startsWith('/leader/login')) {
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
