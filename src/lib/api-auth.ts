import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, verifyRefreshToken, TokenPayload } from '@/lib/jwt-auth';

export function getTokenPayload(request: NextRequest): TokenPayload | null {
  const accessToken = request.cookies.get('accessToken')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;

  if (accessToken) {
    const payload = verifyAccessToken(accessToken);
    if (payload) return payload;
  }

  if (refreshToken) {
    const payload = verifyRefreshToken(refreshToken);
    if (payload) return payload;
  }

  return null;
}

export function requireAuth(request: NextRequest): { payload: TokenPayload } | { error: NextResponse } {
  const payload = getTokenPayload(request);
  if (!payload) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { payload };
}

export function requireLeader(request: NextRequest): { payload: TokenPayload } | { error: NextResponse } {
  const result = requireAuth(request);
  if ('error' in result) return result;
  if (result.payload.role !== 'leader' && result.payload.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden: Management access required' }, { status: 403 }) };
  }
  return result;
}

export function requireDriver(request: NextRequest): { payload: TokenPayload } | { error: NextResponse } {
  const result = requireAuth(request);
  if ('error' in result) return result;
  if (result.payload.role !== 'driver') {
    return { error: NextResponse.json({ error: 'Forbidden: Driver access required' }, { status: 403 }) };
  }
  return result;
}
export function requireAdmin(request: NextRequest): { payload: TokenPayload } | { error: NextResponse } {
  const result = requireAuth(request);
  if ('error' in result) return result;
  if (result.payload.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 }) };
  }
  return result;
}

export function requireSuperuser(request: NextRequest): { payload: TokenPayload } | { error: NextResponse } {
  // Superuser = admin only (not leader)
  const result = requireAuth(request);
  if ('error' in result) return result;
  if (result.payload.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden: Superuser access required' }, { status: 403 }) };
  }
  return result;
}
