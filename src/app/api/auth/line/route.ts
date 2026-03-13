import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models/User';
import { generateAccessToken, generateRefreshToken } from '@/lib/jwt-auth';
import { triggerPusher, CHANNELS, EVENTS } from '@/lib/pusher';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, redirectUri } = body;

    if (!code) {
      return NextResponse.json({ error: 'Authorization code required' }, { status: 400 });
    }

    const lineChannelId = process.env.LINE_CHANNEL_ID;
    const lineChannelSecret = process.env.LINE_CHANNEL_SECRET;
    const lineRedirectUri = redirectUri || process.env.LINE_REDIRECT_URI;

    if (!lineChannelId || !lineChannelSecret) {
      return NextResponse.json({ 
        error: 'Server configuration error', 
        details: 'Missing LINE credentials',
        hasChannelId: !!lineChannelId,
        hasChannelSecret: !!lineChannelSecret
      }, { status: 500 });
    }

    const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: lineRedirectUri!,
        client_id: lineChannelId,
        client_secret: lineChannelSecret,
      }).toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return NextResponse.json({ 
        error: 'Failed to get access token', 
        details: tokenData 
      }, { status: 400 });
    }

    const profileResponse = await fetch('https://api.line.me/v2/profile', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const profile = await profileResponse.json();

    await dbConnect();

    let user = await User.findOne({ lineUserId: profile.userId });

    let isNewUser = false;
    if (!user) {
      user = await User.create({
        lineUserId: profile.userId,
        lineDisplayName: profile.displayName,
        lineProfileImage: profile.pictureUrl,
      });
      isNewUser = true;
    } else {
      // Update LINE profile data on every login (display name / profile image may change)
      user.lineDisplayName = profile.displayName;
      user.lineProfileImage = profile.pictureUrl;
      await user.save();
    }

    if (isNewUser) {
      await triggerPusher(CHANNELS.USERS, EVENTS.NEW_DRIVER, {
        userId: user._id.toString(),
        displayName: user.lineDisplayName,
      });
    }

    const payload = {
      userId: user._id.toString(),
      role: 'driver' as const,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id,
        lineUserId: user.lineUserId,
        lineDisplayName: user.lineDisplayName,
        lineProfileImage: user.lineProfileImage,
        phone: user.phone,
        employeeId: user.employeeId,
        status: user.status,
        name: user.name,
        surname: user.surname,
        role: 'driver',
      },
    });

    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/',
    });
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('LINE Login Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
